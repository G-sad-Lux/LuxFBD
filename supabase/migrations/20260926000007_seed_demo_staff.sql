-- 0007: Promocion del usuario de soporte del demo (via oficial para dar roles de staff).

insert into public.usuario (auth_uid, email, nombre, apellido, tipo_usuario)
select u.id, u.email, 'Soporte', 'Lux', 'Soporte'
from auth.users u
where u.email = 'lux.soporte@universidadlux.edu.mx'
on conflict (auth_uid) do update
    set tipo_usuario = 'Soporte',
        nombre = 'Soporte',
        apellido = 'Lux';
