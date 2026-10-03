-- 0018: Agrega resueltos_semana al KPI (CREATE OR REPLACE: la columna nueva va al final).

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
                     and fecha_cierre >= date_trunc('day', now()))                    as resueltos_hoy,
    round(avg(calificacion)::numeric, 1)                                              as csat_promedio,
    count(*) filter (where calificacion is not null)                                  as csat_respuestas,
    count(*) filter (where estado_id in (4, 5)
                     and fecha_cierre >= date_trunc('week', now()))                   as resueltos_semana
from public.ticket;
