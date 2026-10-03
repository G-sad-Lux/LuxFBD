-- 0011: RLS para comentarios, historial y notificaciones; todo pasa por el JWT del usuario.

-- COMENTARIO: los "externo" los ven duenio del ticket y staff; los "interno" solo staff.
create policy comentario_select_visible on public.comentario
    for select to authenticated
    using (
        (
            public.es_staff()
            or exists (
                select 1 from public.ticket t
                where t.ticket_id = comentario.ticket_id
                  and t.reportador_id = public.usuario_actual()
            )
        )
        and (tipo = 'externo' or public.es_staff())
    );

-- Insertar: siempre a nombre propio, sobre un ticket visible;
-- las notas internas son exclusivas de staff.
create policy comentario_insert_propio on public.comentario
    for insert to authenticated
    with check (
        autor_id = public.usuario_actual()
        and (tipo = 'externo' or public.es_staff())
        and exists (
            select 1 from public.ticket t
            where t.ticket_id = comentario.ticket_id
              and (t.reportador_id = public.usuario_actual() or public.es_staff())
        )
    );

-- HISTORIAL: lectura para duenio del ticket o staff (la escritura sigue
-- reservada a los triggers SECURITY DEFINER; sin politica de INSERT).
create policy historial_select_ticket_visible on public.historial
    for select to authenticated
    using (
        public.es_staff()
        or exists (
            select 1 from public.ticket t
            where t.ticket_id = historial.ticket_id
              and t.reportador_id = public.usuario_actual()
        )
    );

-- NOTIFICACION: cada quien ve y marca-leida SOLO lo suyo.
create policy notificacion_select_propia on public.notificacion
    for select to authenticated
    using (destinatario_id = public.usuario_actual());

create policy notificacion_update_propia on public.notificacion
    for update to authenticated
    using (destinatario_id = public.usuario_actual())
    with check (destinatario_id = public.usuario_actual());
