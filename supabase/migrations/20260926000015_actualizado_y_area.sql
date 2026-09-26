-- ============================================================
-- LuxFBD - 0015: "Ultima actualizacion" (D5) + auditoria de area (D6)
-- - ticket.actualizado_en: se mantiene sola ante cualquier UPDATE del
--   ticket y ante comentarios/evidencias nuevas (fig. 5 del doc V2).
-- - El cambio de area_notificada_id queda en bitacora (§11: reasignar
--   a otro departamento con trazabilidad).
-- ============================================================

alter table public.ticket
    add column actualizado_en timestamptz not null default now();

-- Backfill: el ultimo movimiento conocido de cada ticket existente
update public.ticket t
set actualizado_en = greatest(
    t.fecha_creacion,
    coalesce((select max(h.fecha_cambio) from public.historial h where h.ticket_id = t.ticket_id), t.fecha_creacion)
);

-- ---------- BEFORE UPDATE: igual que 0010 + sello de actualizacion ----------
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
        if new.estado_id = 4 and (new.resumen_solucion is null or btrim(new.resumen_solucion) = '') then
            raise exception 'Se requiere el resumen de la solución para marcar el ticket como Resuelto'
                using errcode = 'P0001';
        end if;
        if new.estado_id = 5 then
            new.fecha_cierre := coalesce(new.fecha_cierre, now());
        end if;
    end if;

    if new.prioridad_id is distinct from old.prioridad_id then
        perform public.assert_catalogo(new.prioridad_id, 'prioridad');
        new.eta_estimada := new.fecha_creacion
            + make_interval(hours => coalesce(public.horas_sla(new.prioridad_id), 72));
    end if;

    if new.area_notificada_id is distinct from old.area_notificada_id then
        perform public.assert_catalogo(new.area_notificada_id, 'area');
    end if;

    -- D5: cualquier UPDATE del ticket refresca la ultima actualizacion
    new.actualizado_en := now();
    return new;
end;
$$;

-- ---------- AFTER UPDATE: igual que 0010 + bitacora del cambio de AREA ----------
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

    -- D6 (§11): reasignacion de departamento con trazabilidad
    if new.area_notificada_id is distinct from old.area_notificada_id then
        insert into public.historial (ticket_id, autor_id, campo_modificado, valor_anterior, valor_nuevo, cambio)
        values (new.ticket_id, public.usuario_actual(), 'area',
                public.nombre_catalogo(old.area_notificada_id), public.nombre_catalogo(new.area_notificada_id),
                '[' || v_actor || '] Reasignó el área de "' || public.nombre_catalogo(old.area_notificada_id)
                    || '" a "' || public.nombre_catalogo(new.area_notificada_id) || '"');
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

-- ---------- Comentarios y evidencias tambien cuentan como actualizacion ----------
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
            insert into public.notificacion (destinatario_id, ticket_id, tipo, contenido)
            values (v_reportador, new.ticket_id, 'nuevo_comentario',
                    'Hay una respuesta de soporte en tu ticket #' || v_num || '.');
        else
            if v_asignado is not null then
                insert into public.notificacion (destinatario_id, ticket_id, tipo, contenido)
                values (v_asignado, new.ticket_id, 'actualizacion_usuario',
                        'El reportador respondió en el ticket #' || v_num || '.');
            end if;
            if v_estado = 3 and new.autor_id = v_reportador then
                update public.ticket set estado_id = 2 where ticket_id = new.ticket_id;
            end if;
        end if;
    end if;

    -- D5: el hilo de conversacion refresca la ultima actualizacion
    update public.ticket set actualizado_en = now() where ticket_id = new.ticket_id;
    return new;
end;
$$;

create or replace function public.fn_adjunto_after_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
    insert into public.historial (ticket_id, autor_id, campo_modificado, valor_anterior, valor_nuevo, cambio)
    values (new.ticket_id, new.subido_por_id, 'evidencia', null, new.nombre_archivo,
            '[' || public.nombre_usuario(new.subido_por_id) || '] Subió evidencia: ' || new.nombre_archivo);

    -- D5: evidencia nueva = actualizacion
    update public.ticket set actualizado_en = now() where ticket_id = new.ticket_id;
    return new;
end;
$$;
