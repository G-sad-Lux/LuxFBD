-- 0012: Vistas de indicadores. security_invoker = true: respetan el RLS de
-- quien consulta; sin esto correrian con los permisos del duenio.

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

-- Desempenio del soporte en tickets cerrados.
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
