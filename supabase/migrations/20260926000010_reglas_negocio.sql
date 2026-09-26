-- ============================================================
-- LuxFBD - 0010: Reglas de negocio y bitacora EN LA BASE DE DATOS
-- (V2 §15 maquina de estados, §16 resolucion, §17 SLA/ETA, §18 auditoria,
--  RF-004/007/016/017 del documento v1)
-- Los triggers son SECURITY DEFINER: escriben historial/notificacion
-- (tablas sin politicas de cliente) y leen nombres aunque el actor sea
-- un alumno. auth.uid() sigue siendo el del actor real.
-- ============================================================

-- ---------- Utilidades ----------

-- Valida que un catalogo_id pertenezca al tipo esperado.
create or replace function public.assert_catalogo(p_id bigint, p_tipo text)
returns void
language plpgsql stable security definer
set search_path = public
as $$
begin
    if p_id is null then return; end if;
    if not exists (select 1 from public.catalogo where catalogo_id = p_id and tipo = p_tipo) then
        raise exception 'El valor % no es un catálogo de tipo %', p_id, p_tipo
            using errcode = 'P0001';
    end if;
end;
$$;

create or replace function public.nombre_catalogo(p_id bigint)
returns text
language sql stable security definer
set search_path = public
as $$
    select coalesce((select nombre from public.catalogo where catalogo_id = p_id), '-');
$$;

create or replace function public.nombre_usuario(p_id bigint)
returns text
language sql stable security definer
set search_path = public
as $$
    select coalesce((select btrim(nombre || ' ' || coalesce(apellido, '')) from public.usuario where usuario_id = p_id), 'Sistema');
$$;

-- Nombre del actor de la peticion actual ('Sistema' si no hay sesion).
create or replace function public.nombre_actor()
returns text
language sql stable security definer
set search_path = public
as $$
    select coalesce(
        (select btrim(nombre || ' ' || coalesce(apellido, '')) from public.usuario where auth_uid = auth.uid()),
        'Sistema');
$$;

-- Maquina de estados (§15). IDs 1-5 reservados por la semilla 0002:
-- 1 Abierto, 2 En proceso, 3 Esperando respuesta, 4 Resuelto, 5 Cerrado.
create or replace function public.transicion_valida(p_de bigint, p_a bigint)
returns boolean
language sql immutable
as $$
    select case p_de
        when 1 then p_a in (2, 4)      -- Abierto -> En proceso | Resuelto
        when 2 then p_a in (3, 4)      -- En proceso -> Esperando respuesta | Resuelto
        when 3 then p_a in (2, 4)      -- Esperando respuesta -> En proceso | Resuelto
        when 4 then p_a in (5, 2)      -- Resuelto -> Cerrado | reabrir a En proceso
        else false                     -- Cerrado: sin salidas
    end;
$$;

create or replace function public.horas_sla(p_prioridad bigint)
returns int
language sql stable security definer
set search_path = public
as $$
    select horas_compromiso from public.prioridad_sla where prioridad_id = p_prioridad;
$$;

-- ---------- BEFORE INSERT: validar tipos + calcular ETA (§17) ----------
create or replace function public.fn_ticket_before_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
    perform public.assert_catalogo(new.categoria_id, 'categoria');
    perform public.assert_catalogo(new.prioridad_id, 'prioridad');
    perform public.assert_catalogo(new.prioridad_reportada_id, 'prioridad');
    perform public.assert_catalogo(new.estado_id, 'estado');
    perform public.assert_catalogo(new.area_notificada_id, 'area');

    if new.eta_estimada is null then
        new.eta_estimada := coalesce(new.fecha_creacion, now())
            + make_interval(hours => coalesce(public.horas_sla(new.prioridad_id), 72));
    end if;
    return new;
end;
$$;

drop trigger if exists trg_ticket_before_insert on public.ticket;
create trigger trg_ticket_before_insert
    before insert on public.ticket
    for each row execute function public.fn_ticket_before_insert();

-- ---------- BEFORE UPDATE: transiciones, resumen, cierre, recalculo SLA ----------
create or replace function public.fn_ticket_before_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
    if new.estado_id is distinct from old.estado_id then
        perform public.assert_catalogo(new.estado_id, 'estado');
        if not public.transicion_valida(old.estado_id, new.estado_id) then
            raise exception 'Transición de estado no permitida: % → %',
                public.nombre_catalogo(old.estado_id), public.nombre_catalogo(new.estado_id)
                using errcode = 'P0001';
        end if;
        -- §16: Resuelto exige resumen de la solucion
        if new.estado_id = 4 and (new.resumen_solucion is null or btrim(new.resumen_solucion) = '') then
            raise exception 'Se requiere el resumen de la solución para marcar el ticket como Resuelto'
                using errcode = 'P0001';
        end if;
        if new.estado_id = 5 then
            new.fecha_cierre := coalesce(new.fecha_cierre, now());
        end if;
    end if;

    -- §10: al cambiar la prioridad oficial se recalcula el compromiso SLA
    if new.prioridad_id is distinct from old.prioridad_id then
        perform public.assert_catalogo(new.prioridad_id, 'prioridad');
        new.eta_estimada := new.fecha_creacion
            + make_interval(hours => coalesce(public.horas_sla(new.prioridad_id), 72));
    end if;

    if new.area_notificada_id is distinct from old.area_notificada_id then
        perform public.assert_catalogo(new.area_notificada_id, 'area');
    end if;
    return new;
end;
$$;

drop trigger if exists trg_ticket_before_update on public.ticket;
create trigger trg_ticket_before_update
    before update on public.ticket
    for each row execute function public.fn_ticket_before_update();

-- ---------- AFTER INSERT: bitacora de creacion + confirmacion (§18, RF-016) ----------
create or replace function public.fn_ticket_after_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
    insert into public.historial (ticket_id, autor_id, campo_modificado, valor_anterior, valor_nuevo, cambio)
    values (new.ticket_id, public.usuario_actual(), 'creacion', null,
            public.nombre_catalogo(new.estado_id),
            '[' || public.nombre_actor() || '] Creó el ticket por el canal ' || new.canal_entrada);

    insert into public.notificacion (destinatario_id, ticket_id, tipo, contenido)
    values (new.reportador_id, new.ticket_id, 'creacion_ticket',
            'Tu ticket #' || new.ticket_id || ' "' || new.titulo || '" fue registrado. Te avisaremos de cada avance.');
    return new;
end;
$$;

drop trigger if exists trg_ticket_after_insert on public.ticket;
create trigger trg_ticket_after_insert
    after insert on public.ticket
    for each row execute function public.fn_ticket_after_insert();

-- ---------- AFTER UPDATE: bitacora con valores REALES + notificaciones ----------
create or replace function public.fn_ticket_after_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
    v_actor text := public.nombre_actor();
begin
    if new.estado_id is distinct from old.estado_id then
        insert into public.historial (ticket_id, autor_id, campo_modificado, valor_anterior, valor_nuevo, cambio)
        values (new.ticket_id, public.usuario_actual(), 'estado',
                public.nombre_catalogo(old.estado_id), public.nombre_catalogo(new.estado_id),
                '[' || v_actor || '] Cambió el estado de "' || public.nombre_catalogo(old.estado_id)
                    || '" a "' || public.nombre_catalogo(new.estado_id) || '"');

        insert into public.notificacion (destinatario_id, ticket_id, tipo, contenido)
        values (new.reportador_id, new.ticket_id,
                case when new.estado_id = 4 then 'resuelto' else 'cambio_estado' end,
                'Tu ticket #' || new.ticket_id || ' ahora está "' || public.nombre_catalogo(new.estado_id) || '".'
                    || case when new.estado_id = 4 and new.resumen_solucion is not null
                            then ' Solución: ' || left(new.resumen_solucion, 200) else '' end);
    end if;

    if new.prioridad_id is distinct from old.prioridad_id then
        insert into public.historial (ticket_id, autor_id, campo_modificado, valor_anterior, valor_nuevo, cambio)
        values (new.ticket_id, public.usuario_actual(), 'prioridad',
                public.nombre_catalogo(old.prioridad_id), public.nombre_catalogo(new.prioridad_id),
                '[' || v_actor || '] Cambió la prioridad de "' || public.nombre_catalogo(old.prioridad_id)
                    || '" a "' || public.nombre_catalogo(new.prioridad_id) || '" (SLA recalculado)');
    end if;

    if new.maestro_notificado_id is distinct from old.maestro_notificado_id then
        insert into public.historial (ticket_id, autor_id, campo_modificado, valor_anterior, valor_nuevo, cambio)
        values (new.ticket_id, public.usuario_actual(), 'asignacion',
                case when old.maestro_notificado_id is null then 'Sin asignar' else public.nombre_usuario(old.maestro_notificado_id) end,
                case when new.maestro_notificado_id is null then 'Sin asignar' else public.nombre_usuario(new.maestro_notificado_id) end,
                '[' || v_actor || '] ' || case when new.maestro_notificado_id is null
                    then 'Retiró la asignación'
                    else 'Asignó el ticket a [' || public.nombre_usuario(new.maestro_notificado_id) || ']' end);

        if new.maestro_notificado_id is not null then
            insert into public.notificacion (destinatario_id, ticket_id, tipo, contenido)
            values (new.maestro_notificado_id, new.ticket_id, 'asignacion',
                    'Se te asignó el ticket #' || new.ticket_id || ': "' || new.titulo || '"');
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_ticket_after_update on public.ticket;
create trigger trg_ticket_after_update
    after update on public.ticket
    for each row execute function public.fn_ticket_after_update();

-- ---------- COMENTARIO: bitacora, notificaciones y auto-transicion (§13, §15) ----------
create or replace function public.fn_comentario_after_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
    v_reportador bigint;
    v_asignado   bigint;
    v_estado     bigint;
    v_num        bigint;
    v_autor_es_staff boolean;
begin
    select reportador_id, maestro_notificado_id, estado_id, ticket_id
      into v_reportador, v_asignado, v_estado, v_num
      from public.ticket where ticket_id = new.ticket_id;

    select tipo_usuario in ('Soporte', 'Administrativo', 'Administrador')
      into v_autor_es_staff
      from public.usuario where usuario_id = new.autor_id;

    insert into public.historial (ticket_id, autor_id, campo_modificado, valor_anterior, valor_nuevo, cambio)
    values (new.ticket_id, new.autor_id,
            case when new.tipo = 'interno' then 'nota_interna' else 'comentario' end,
            null, left(new.contenido, 120),
            '[' || public.nombre_usuario(new.autor_id) || '] '
                || case when new.tipo = 'interno' then 'Registró una nota interna' else 'Agregó un comentario' end);

    if new.tipo = 'externo' then
        if coalesce(v_autor_es_staff, false) then
            -- soporte escribe al alumno (RF-016)
            insert into public.notificacion (destinatario_id, ticket_id, tipo, contenido)
            values (v_reportador, new.ticket_id, 'nuevo_comentario',
                    'Hay una respuesta de soporte en tu ticket #' || v_num || '.');
        else
            -- el alumno respondio (RF-017)
            if v_asignado is not null then
                insert into public.notificacion (destinatario_id, ticket_id, tipo, contenido)
                values (v_asignado, new.ticket_id, 'actualizacion_usuario',
                        'El reportador respondió en el ticket #' || v_num || '.');
            end if;
            -- §15: Esperando respuesta -> En proceso cuando el alumno responde
            if v_estado = 3 and new.autor_id = v_reportador then
                update public.ticket set estado_id = 2 where ticket_id = new.ticket_id;
            end if;
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_comentario_after_insert on public.comentario;
create trigger trg_comentario_after_insert
    after insert on public.comentario
    for each row execute function public.fn_comentario_after_insert();

-- ---------- ADJUNTO: bitacora de evidencias (§18) ----------
create or replace function public.fn_adjunto_after_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
    insert into public.historial (ticket_id, autor_id, campo_modificado, valor_anterior, valor_nuevo, cambio)
    values (new.ticket_id, new.subido_por_id, 'evidencia', null, new.nombre_archivo,
            '[' || public.nombre_usuario(new.subido_por_id) || '] Subió evidencia: ' || new.nombre_archivo);
    return new;
end;
$$;

drop trigger if exists trg_adjunto_after_insert on public.adjunto;
create trigger trg_adjunto_after_insert
    after insert on public.adjunto
    for each row execute function public.fn_adjunto_after_insert();
