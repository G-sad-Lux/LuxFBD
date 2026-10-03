-- 0020: Mejoras de SLA: (1) fecha_cierre se fija al Resolver, (2) "por vencer"
-- = restante <= 25%, (3) barrido proactivo via pg_cron, (4) cambio de
-- prioridad reinicia el compromiso desde now().

-- ---------- Marca de aviso (dedupe del barrido) ----------
alter table public.ticket
    add column sla_aviso smallint not null default 0;
comment on column public.ticket.sla_aviso is
    '0=sin aviso, 1=avisado "por vencer", 2=avisado "vencido". Lo escribe fn_sla_barrido(); se resetea al recalcular el SLA o reabrir.';

-- ---------- Tipos nuevos de notificación ----------
alter table public.notificacion drop constraint ck_notificacion_tipo;
alter table public.notificacion add constraint ck_notificacion_tipo
    check (tipo in ('creacion_ticket','cambio_estado','nuevo_comentario','resuelto',
                    'asignacion','actualizacion_usuario','sla_por_vencer','sla_vencido'));

-- ---------- Backfill: resueltos sin fecha (quedaban fuera de los KPI) ----------
update public.ticket
   set fecha_cierre = coalesce(fecha_cierre, actualizado_en, now())
 where estado_id = 4 and fecha_cierre is null;

-- ---------- BEFORE UPDATE: mismas reglas previas + puntos 1 y 4 ----------
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
        -- Resuelto exige resumen de la solucion
        if new.estado_id = 4 and (new.resumen_solucion is null or btrim(new.resumen_solucion) = '') then
            raise exception 'Se requiere el resumen de la solución para marcar el ticket como Resuelto'
                using errcode = 'P0001';
        end if;
        -- (1) El reloj de atención se detiene al RESOLVER
        if new.estado_id in (4, 5) then
            new.fecha_cierre := coalesce(new.fecha_cierre, now());
        end if;
        -- Reabrir (4 -> 2): el ticket vuelve a estar vivo
        if old.estado_id = 4 and new.estado_id = 2 then
            new.fecha_cierre := null;
            new.sla_aviso    := 0;
        end if;
    end if;

    -- (4) Cambio de prioridad: compromiso fresco DESDE EL CAMBIO
    if new.prioridad_id is distinct from old.prioridad_id then
        perform public.assert_catalogo(new.prioridad_id, 'prioridad');
        new.eta_estimada := now()
            + make_interval(hours => coalesce(public.horas_sla(new.prioridad_id), 72));
        new.sla_aviso := 0; -- el barrido vuelve a vigilar el compromiso nuevo
    end if;

    if new.area_notificada_id is distinct from old.area_notificada_id then
        perform public.assert_catalogo(new.area_notificada_id, 'area');
    end if;
    return new;
end;
$$;

-- ---------- (2) v_kpi_resumen: "por vencer" relativo (25% del compromiso) ----------
-- CREATE OR REPLACE: mismas columnas, mismo orden.
create or replace view public.v_kpi_resumen
with (security_invoker = true) as
select
    count(*) filter (where estado_id not in (4, 5))                                   as activos,
    count(*) filter (where estado_id = 1)                                             as abiertos,
    count(*) filter (where estado_id = 2)                                             as en_proceso,
    count(*) filter (where estado_id = 3)                                             as esperando_respuesta,
    count(*) filter (where estado_id not in (4, 5)
                     and eta_estimada is not null
                     and eta_estimada < now())                                        as vencidos,
    count(*) filter (where estado_id not in (4, 5)
                     and eta_estimada is not null
                     and eta_estimada >= now()
                     and (eta_estimada - now()) <= (eta_estimada - fecha_creacion) * 0.25) as por_vencer,
    count(*) filter (where estado_id not in (4, 5) and prioridad_id in (6, 9))        as alta_prioridad,
    count(*) filter (where estado_id not in (4, 5) and maestro_notificado_id is null) as sin_asignar,
    count(*) filter (where estado_id in (4, 5)
                     and fecha_cierre >= date_trunc('day', now()))                    as resueltos_hoy,
    round(avg(calificacion)::numeric, 1)                                              as csat_promedio,
    count(*) filter (where calificacion is not null)                                  as csat_respuestas,
    count(*) filter (where estado_id in (4, 5)
                     and fecha_cierre >= date_trunc('week', now()))                   as resueltos_semana
from public.ticket;

-- ---------- (3) Barrido proactivo ----------
create or replace function public.fn_sla_barrido()
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
    v_avisados integer := 0;
    r record;
begin
    for r in
        select t.ticket_id, t.eta_estimada, t.maestro_notificado_id,
               coalesce(t.sla_aviso, 0) as aviso,
               case
                   when t.eta_estimada < now() then 2
                   when (t.eta_estimada - now()) <= (t.eta_estimada - t.fecha_creacion) * 0.25 then 1
                   else 0
               end as nivel
          from public.ticket t
         where t.estado_id not in (4, 5)
           and t.eta_estimada is not null
    loop
        if r.nivel > r.aviso then
            if r.maestro_notificado_id is not null then
                insert into public.notificacion (destinatario_id, ticket_id, tipo, contenido)
                values (r.maestro_notificado_id, r.ticket_id,
                        case when r.nivel = 2 then 'sla_vencido' else 'sla_por_vencer' end,
                        case when r.nivel = 2
                             then '🔴 El ticket #' || r.ticket_id || ' superó su tiempo de atención (límite '
                                  || to_char(r.eta_estimada, 'DD/MM HH24:MI') || ').'
                             else '⏰ El ticket #' || r.ticket_id || ' está por vencer: atiéndelo antes del '
                                  || to_char(r.eta_estimada, 'DD/MM HH24:MI') || '.'
                        end);
            else
                -- Sin asignar: que lo vea todo el personal activo
                insert into public.notificacion (destinatario_id, ticket_id, tipo, contenido)
                select u.usuario_id, r.ticket_id,
                       case when r.nivel = 2 then 'sla_vencido' else 'sla_por_vencer' end,
                       case when r.nivel = 2
                            then '🔴 Ticket #' || r.ticket_id || ' SIN ASIGNAR y vencido (límite era '
                                 || to_char(r.eta_estimada, 'DD/MM HH24:MI') || ').'
                            else '⏰ Ticket #' || r.ticket_id || ' sin asignar y por vencer ('
                                 || to_char(r.eta_estimada, 'DD/MM HH24:MI') || ').'
                       end
                  from public.usuario u
                 where u.tipo_usuario in ('Soporte', 'Administrador') and u.activo;
            end if;
            update public.ticket set sla_aviso = r.nivel where ticket_id = r.ticket_id;
            v_avisados := v_avisados + 1;
        end if;
    end loop;
    return v_avisados;
end;
$$;

revoke execute on function public.fn_sla_barrido() from anon;

-- ---------- pg_cron cada 15 min (guardado: sin pg_cron no truena) ----------
do $$
begin
    create extension if not exists pg_cron;
exception when others then
    raise warning 'pg_cron no disponible en este entorno: %', sqlerrm;
end $$;

do $$
begin
    if exists (select 1 from pg_extension where extname = 'pg_cron') then
        begin
            perform cron.unschedule('lux-sla-barrido');
        exception when others then null; -- primera vez: no existía
        end;
        perform cron.schedule('lux-sla-barrido', '*/15 * * * *', 'select public.fn_sla_barrido()');
    end if;
end $$;
