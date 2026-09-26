-- ============================================================
-- LuxFBD - 0014: Categorias del documento V2 (decision D8, 2026-09-26)
-- Acceso y bloqueos / Plataforma virtual / Materias /
-- Servicios escolares / Finanzas y pagos / Otros
-- Se conservan los IDs existentes (los tickets ya creados no se tocan):
--   37 Bloqueos/Acceso   -> Acceso y bloqueos   (codigo: acceso)
--   34 Sitio Web         -> Plataforma virtual  (codigo: plataforma)
--   36 Materias          -> Materias            (codigo: materias)
--   33 Finanzas          -> Finanzas y pagos    (codigo: finanzas)
--   35 Servo Web         -> Otros               (codigo: otros; sin tickets)
--   42 (nuevo)           -> Servicios escolares (codigo: servicios_escolares)
-- ============================================================

update public.catalogo set nombre = 'Acceso y bloqueos',  codigo = 'acceso',     orden = 1 where catalogo_id = 37 and tipo = 'categoria';
update public.catalogo set nombre = 'Plataforma virtual', codigo = 'plataforma', orden = 2 where catalogo_id = 34 and tipo = 'categoria';
update public.catalogo set nombre = 'Materias',           codigo = 'materias',   orden = 3 where catalogo_id = 36 and tipo = 'categoria';
update public.catalogo set nombre = 'Finanzas y pagos',   codigo = 'finanzas',   orden = 5 where catalogo_id = 33 and tipo = 'categoria';
update public.catalogo set nombre = 'Otros',              codigo = 'otros',      orden = 6 where catalogo_id = 35 and tipo = 'categoria';

insert into public.catalogo (catalogo_id, tipo, nombre, codigo, orden)
values (42, 'categoria', 'Servicios escolares', 'servicios_escolares', 4)
on conflict (catalogo_id) do nothing;
