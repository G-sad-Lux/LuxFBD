-- ============================================================
-- LuxFBD - 0004: Sincronizacion auth.users -> public.usuario
-- El codigo busca el perfil por auth_uid en 4 lugares y truena si
-- no existe ("User profile not found"). Este trigger crea el perfil
-- automaticamente al dar de alta un usuario en Authentication.
-- Sustituye al placeholder user-admin/sync y al alta manual.
-- ============================================================

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

    insert into public.usuario (auth_uid, email, nombre, apellido, tipo_usuario)
    values (
        new.id,
        new.email,
        v_nombre,
        coalesce(new.raw_user_meta_data->>'apellido', ''),
        v_tipo
    )
    on conflict (auth_uid) do nothing;

    return new;
exception when others then
    -- Nunca bloquear el alta en Auth por un fallo del perfil; queda en logs.
    raise warning 'handle_new_auth_user fallo: %', sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_auth_user();
