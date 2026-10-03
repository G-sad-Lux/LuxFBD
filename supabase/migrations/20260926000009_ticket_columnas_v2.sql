-- 0009: Columnas nuevas de ticket (additive-only, la v1 no las lee):
-- canal_entrada, prioridad_reportada_id y resumen_solucion.

alter table public.ticket
    add column canal_entrada varchar(20) not null default 'chatbot'
        constraint ck_ticket_canal check (canal_entrada in ('portal', 'chatbot')),
    add column prioridad_reportada_id bigint
        constraint fk_ticket_prioridad_reportada references public.catalogo (catalogo_id),
    add column resumen_solucion text
        constraint ck_ticket_resumen_len check (char_length(resumen_solucion) <= 2000);

comment on column public.ticket.canal_entrada is
    'portal = formulario web; chatbot = asistente (Lux-IA v1 / Lumix v2)';
comment on column public.ticket.prioridad_reportada_id is
    'Prioridad percibida por quien reporta; NULL cuando el canal no la pregunta (Lumix). La oficial es prioridad_id.';
