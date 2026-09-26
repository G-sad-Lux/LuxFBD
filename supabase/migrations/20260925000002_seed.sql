-- ============================================================
-- LuxFBD - 0002: Semilla del catalogo con IDs EXACTOS
-- Los IDs 1, 6-8, 33-38 NO son negociables: el frontend v1 los
-- hardcodea (STATIC_CATEGORY_MAP / STATIC_PRIORITY_MAP / DEFAULT_AREA_ID)
-- y el backend fija estado_id=1 y area_notificada_id=38.
-- ============================================================

insert into public.catalogo (catalogo_id, tipo, nombre, codigo, orden) values
    -- Estados (1 = Abierto, exigido por ticket-manager /create)
    ( 1, 'estado',    'Abierto',              'abierto',             1),
    ( 2, 'estado',    'En proceso',           'en_proceso',          2),
    ( 3, 'estado',    'Esperando respuesta',  'esperando_respuesta', 3),
    ( 4, 'estado',    'Resuelto',             'resuelto',            4),
    ( 5, 'estado',    'Cerrado',              'cerrado',             5),
    -- Prioridades (6/7/8 = alta/media/baja del STATIC_PRIORITY_MAP)
    ( 6, 'prioridad', 'Crítico',              'critico',             1),
    ( 7, 'prioridad', 'Medio',                'medio',               2),
    ( 8, 'prioridad', 'Bajo',                 'bajo',                3),
    -- Categorias (33-37 del STATIC_CATEGORY_MAP)
    (33, 'categoria', 'Finanzas',             'finanzas',            1),
    (34, 'categoria', 'Sitio Web',            'sitio_web',           2),
    (35, 'categoria', 'Servo Web',            'servo_web',           3),
    (36, 'categoria', 'Materias',             'materias',            4),
    (37, 'categoria', 'Bloqueos/Acceso',      'bloqueos',            5),
    -- Areas (38 = DEFAULT_AREA_ID y hardcode del backend)
    (38, 'area',      'Soporte Técnico',      'soporte',             1),
    (39, 'area',      'Servicios Escolares',  'escolares',           2);

-- Dejar la secuencia por encima de los IDs reservados
select setval(pg_get_serial_sequence('public.catalogo','catalogo_id'), 100, true);

-- SLA por prioridad (lo usara la fase 2; valores provisionales en horas)
insert into public.prioridad_sla (prioridad_id, horas_compromiso) values
    (6, 4),    -- Critico
    (7, 24),   -- Medio
    (8, 72);   -- Bajo
