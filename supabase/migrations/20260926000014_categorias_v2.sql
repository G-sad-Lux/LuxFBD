-- 0014: Renombra las categorias conservando los IDs existentes y agrega
-- Servicios escolares (42).

update public.catalogo set nombre = 'Acceso y bloqueos',  codigo = 'acceso',     orden = 1 where catalogo_id = 37 and tipo = 'categoria';
update public.catalogo set nombre = 'Plataforma virtual', codigo = 'plataforma', orden = 2 where catalogo_id = 34 and tipo = 'categoria';
update public.catalogo set nombre = 'Materias',           codigo = 'materias',   orden = 3 where catalogo_id = 36 and tipo = 'categoria';
update public.catalogo set nombre = 'Finanzas y pagos',   codigo = 'finanzas',   orden = 5 where catalogo_id = 33 and tipo = 'categoria';
update public.catalogo set nombre = 'Otros',              codigo = 'otros',      orden = 6 where catalogo_id = 35 and tipo = 'categoria';

insert into public.catalogo (catalogo_id, tipo, nombre, codigo, orden)
values (42, 'categoria', 'Servicios escolares', 'servicios_escolares', 4)
on conflict (catalogo_id) do nothing;
