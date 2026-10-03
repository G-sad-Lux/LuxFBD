-- 0005: Bucket de evidencias. Limites de tipo y tamanio en el bucket, no en el cliente.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tickets', 'tickets', true, 5242880, array['image/*','application/pdf'])
on conflict (id) do update
    set public            = excluded.public,
        file_size_limit   = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- Subida: solo autenticados y a su propia carpeta (<auth_uid>/...).
-- Si db push falla por permisos de storage.objects, crear la politica desde el Dashboard.
create policy tickets_subida_carpeta_propia on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'tickets'
        and (storage.foldername(name))[1] = auth.uid()::text
    );
