-- ============================================================
-- LuxFBD - 0019: Modo INVITADO del demo (D5 resuelta 2026-09-26)
-- El QR del demo abre Lumix con sesion ANONIMA de Supabase Auth:
-- el invitado captura matricula (6 digitos) + nombre completo antes
-- de entrar al chat. RLS lo trata como un alumno normal (solo ve lo
-- suyo); es_staff() = false. La matricula viaja en el metadata del
-- alta anonima y el trigger la persiste aqui.
-- ============================================================

alter table public.usuario
    add column matricula varchar(10);

comment on column public.usuario.matricula is
    'Identificador capturado por el modo invitado del demo (6 digitos). Null en cuentas normales mientras no se pueble.';

-- Mismo trigger de 0004 + matricula desde el metadata.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
    v_tipo   text := coalesce(new.raw_user_meta_data->>'tipo_usuario', 'Alumno');
    v_nombre text := coalesce(
        nullif(new.raw_user_meta_data->>'nombre', ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Usuario'
    );
begin
    -- Un metadato invalido nunca debe romper el alta: cae a Alumno.
    if v_tipo not in ('Alumno','Maestro','Administrativo','Soporte','Administrador') then
        v_tipo := 'Alumno';
    end if;

    insert into public.usuario (auth_uid, email, nombre, apellido, tipo_usuario, matricula)
    values (
        new.id,
        new.email,
        v_nombre,
        coalesce(new.raw_user_meta_data->>'apellido', ''),
        v_tipo,
        left(nullif(btrim(coalesce(new.raw_user_meta_data->>'matricula', '')), ''), 10)
    )
    on conflict (auth_uid) do nothing;

    return new;
exception when others then
    -- Nunca bloquear el alta en Auth por un fallo del perfil; queda en logs.
    raise warning 'handle_new_auth_user fallo: %', sqlerrm;
    return new;
end;
$$;
