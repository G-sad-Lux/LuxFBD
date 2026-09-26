-- ============================================================
-- LuxFBD - 0007: Promocion del usuario de soporte de demo
-- El dashboard de Auth no maneja roles: el rol vive en public.usuario
-- y por el endurecimiento F1 todo registro nace como 'Alumno'.
-- Esta es la via oficial (server-side, versionada) para promover staff.
-- Idempotente: si el usuario de Auth no existe, no hace nada; si el
-- trigger no llego a crear el perfil, lo crea ya promovido.
-- ============================================================

insert into public.usuario (auth_uid, email, nombre, apellido, tipo_usuario)
select u.id, u.email, 'Soporte', 'Lux', 'Soporte'
from auth.users u
where u.email = 'lux.soporte@universidadlux.edu.mx'
on conflict (auth_uid) do update
    set tipo_usuario = 'Soporte',
        nombre = 'Soporte',
        apellido = 'Lux';
