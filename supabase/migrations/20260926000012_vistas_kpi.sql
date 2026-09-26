-- ============================================================
-- LuxFBD - 0012: Vistas de indicadores (V2 §9 dashboard, objetivo 2.2 v1)
-- security_invoker = true: las vistas respetan el RLS de quien consulta
-- (un alumno solo cuenta lo suyo; staff cuenta todo). Sin esto, una vista
-- corre con los permisos del duenio y saltaria el RLS.
-- Estados semilla: 1 Abierto, 2 En proceso, 3 Esperando resp., 4 Resuelto, 5 Cerrado.
-- ============================================================

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
                     and eta_estimada < now() + interval '4 hours')                   as por_vencer,
    count(*) filter (where estado_id not in (4, 5) and prioridad_id in (6, 9))        as alta_prioridad,
    count(*) filter (where estado_id not in (4, 5) and maestro_notificado_id is null) as sin_asignar,
    count(*) filter (where estado_id in (4, 5)
                     and fecha_cierre >= date_trunc('day', now()))                    as resueltos_hoy
from public.ticket;

create or replace view public.v_tickets_por_categoria
with (security_invoker = true) as
select
    c.nombre                                          as categoria,
    count(t.ticket_id)                                as total,
    count(*) filter (where t.estado_id not in (4, 5)) as activos
from public.ticket t
join public.catalogo c on c.catalogo_id = t.categoria_id
group by c.nombre
order by total desc;

-- Objetivo 2.2 del documento v1: medir el desempenio del soporte.
create or replace view public.v_tiempo_resolucion
with (security_invoker = true) as
select
    p.nombre                                                       as prioridad,
    count(*)                                                       as cerrados,
    round(avg(extract(epoch from (t.fecha_cierre - t.fecha_creacion)) / 3600.0)::numeric, 1)
                                                                   as horas_promedio,
    count(*) filter (where t.fecha_cierre <= t.eta_estimada)       as dentro_de_sla
from public.ticket t
join public.catalogo p on p.catalogo_id = t.prioridad_id
where t.fecha_cierre is not null
group by p.nombre;
