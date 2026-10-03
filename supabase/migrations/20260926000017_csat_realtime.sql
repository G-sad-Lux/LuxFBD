-- 0017: Encuesta CSAT (solo el reportador, ticket resuelto/cerrado, una vez)
-- + publicacion Realtime de ticket, comentario y notificacion.

alter table public.ticket
    add column calificacion smallint
        constraint ck_ticket_calificacion check (calificacion between 1 and 5),
    add column calificacion_comentario text
        constraint ck_ticket_calif_com_len check (char_length(calificacion_comentario) <= 500);

comment on column public.ticket.calificacion is
    'CSAT 1-5 del reportador al resolverse/cerrarse; se escribe SOLO via calificar_ticket().';

-- El UPDATE de ticket es solo-staff; la calificacion del alumno entra por esta funcion.
create or replace function public.calificar_ticket(
    p_ticket_id bigint,
    p_calificacion smallint,
    p_comentario text default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
    v_reportador bigint;
    v_estado     bigint;
    v_previa     smallint;
begin
    select reportador_id, estado_id, calificacion
      into v_reportador, v_estado, v_previa
      from public.ticket where ticket_id = p_ticket_id;

    if v_reportador is null then
        raise exception 'El ticket no existe' using errcode = 'P0001';
    end if;
    if v_reportador is distinct from public.usuario_actual() then
        raise exception 'Solo quien reportó el ticket puede calificarlo' using errcode = 'P0001';
    end if;
    if v_estado not in (4, 5) then
        raise exception 'Podrás calificar la atención cuando el ticket esté resuelto' using errcode = 'P0001';
    end if;
    if v_previa is not null then
        raise exception 'Este ticket ya fue calificado' using errcode = 'P0001';
    end if;
    if p_calificacion is null or p_calificacion < 1 or p_calificacion > 5 then
        raise exception 'La calificación debe ser de 1 a 5' using errcode = 'P0001';
    end if;

    update public.ticket
       set calificacion = p_calificacion,
           calificacion_comentario = nullif(btrim(coalesce(p_comentario, '')), '')
     where ticket_id = p_ticket_id;

    insert into public.historial (ticket_id, autor_id, campo_modificado, valor_anterior, valor_nuevo, cambio)
    values (p_ticket_id, public.usuario_actual(), 'calificacion', null, p_calificacion || '/5',
            '[' || public.nombre_actor() || '] Calificó la atención con ' || p_calificacion || '/5');
end;
$$;

revoke execute on function public.calificar_ticket(bigint, smallint, text) from anon;

-- KPI: promedio CSAT (CREATE OR REPLACE de vista: columnas nuevas AL FINAL)
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
    count(*) filter (where calificacion is not null)                                  as csat_respuestas
from public.ticket;

-- Realtime: publicar cambios (RLS decide que recibe cada suscriptor)
alter publication supabase_realtime add table public.ticket;
alter publication supabase_realtime add table public.comentario;
alter publication supabase_realtime add table public.notificacion;
