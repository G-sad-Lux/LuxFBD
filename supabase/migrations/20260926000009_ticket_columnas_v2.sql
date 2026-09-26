-- ============================================================
-- LuxFBD - 0009: Columnas nuevas de ticket (additive-only, la v1 no las lee)
-- canal_entrada          -> §9 V2: por donde llego el reporte (Lumix vs Portal)
-- prioridad_reportada_id -> §5.3/§10 V2: lo que percibio el usuario; la oficial
--                           (prioridad_id) la gobierna soporte
-- resumen_solucion       -> §16 V2: obligatorio para marcar Resuelto (regla en 0010)
-- ============================================================

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
