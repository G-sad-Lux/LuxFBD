-- ============================================================
-- LuxFBD - 0005: Storage (bucket de evidencias)
-- Publico para revivir tal cual (la UI usa getPublicUrl); pasarlo a
-- privado + URLs firmadas es tarea de la fase de endurecimiento.
-- Limites de tipo y tamanio aplicados en el bucket, no en el cliente.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tickets', 'tickets', true, 5242880, array['image/*','application/pdf'])
on conflict (id) do update
    set public            = excluded.public,
        file_size_limit   = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- Subida: solo autenticados y solo a su propia carpeta
-- (el cliente v1 ya sube a `<auth_uid>/<timestamp>_<archivo>`).
-- La lectura la sirve el bucket publico; no requiere politica.
-- Contingencia: si `db push` fallara aqui por permisos sobre storage.objects
-- (proyectos con storage endurecido), crear esta misma politica desde
-- Dashboard -> Storage -> Policies.
create policy tickets_subida_carpeta_propia on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'tickets'
        and (storage.foldername(name))[1] = auth.uid()::text
    );
