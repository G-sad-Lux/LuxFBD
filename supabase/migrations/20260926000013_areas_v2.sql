-- 0013: Areas adicionales; se suman a Soporte Técnico (38) y Servicios Escolares (39).

insert into public.catalogo (catalogo_id, tipo, nombre, codigo, orden) values
    (40, 'area', 'Cajas',          'cajas',          3),
    (41, 'area', 'Administración', 'administracion', 4)
on conflict (catalogo_id) do nothing;
