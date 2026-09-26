-- ============================================================
-- LuxFBD - 0006: Endurecimiento de seguridad (auditoria 2026-09-26)
-- F1: el trigger ya NO lee el rol desde raw_user_meta_data (un
--     atacante podia autoregistrarse como 'Administrador' pasando
--     options.data.tipo_usuario en signUp). Todo alta = 'Alumno';
--     los roles de staff se promueven solo por SQL/service role.
-- F4: la politica de INSERT de adjunto ahora exige que el ticket
--     sea visible para quien inserta (antes se podia colgar un
--     adjunto con URL arbitraria a cualquier ticket).
-- Privacidad: bucket 'tickets' pasa a PRIVADO; la lectura es via
--     URLs firmadas generadas en /details (politica SELECT abajo).
-- ============================================================

-- F1: rol nunca viene del cliente + saneo de nombre/apellido
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
    v_nombre text := coalesce(
        nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'nombre',''), '[<>"''&]', '', 'g'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Usuario'
    );
    v_apellido text := regexp_replace(coalesce(new.raw_user_meta_data->>'apellido',''), '[<>"''&]', '', 'g');
begin
    insert into public.usuario (auth_uid, email, nombre, apellido, tipo_usuario)
    values (new.id, new.email, v_nombre, v_apellido, 'Alumno')
    on conflict (auth_uid) do nothing;
    return new;
exception when others then
    raise warning 'handle_new_auth_user fallo: %', sqlerrm;
    return new;
end;
$$;

-- F4: adjunto solo sobre tickets visibles para quien inserta
drop policy adjunto_insert_propio on public.adjunto;
create policy adjunto_insert_propio on public.adjunto
    for insert to authenticated
    with check (
        subido_por_id = public.usuario_actual()
        and exists (
            select 1 from public.ticket t
            where t.ticket_id = adjunto.ticket_id
              and (t.reportador_id = public.usuario_actual() or public.es_staff())
        )
    );

-- Bucket privado: las evidencias dejan de ser publicas por URL
update storage.buckets set public = false where id = 'tickets';

-- Lectura para firmar URLs (createSignedUrl corre con el JWT del
-- usuario): dueño de la carpeta o staff.
create policy tickets_lectura_propia_o_staff on storage.objects
    for select to authenticated
    using (
        bucket_id = 'tickets'
        and (
            (storage.foldername(name))[1] = auth.uid()::text
            or public.es_staff()
        )
    );
