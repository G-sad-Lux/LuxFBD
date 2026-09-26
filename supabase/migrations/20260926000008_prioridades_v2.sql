-- ============================================================
-- LuxFBD - 0008: Catalogo de prioridades unificado a 4 niveles (V2 §10)
-- Decision del equipo 2026-09-26: Baja / Media / Alta / Crítica para
-- AMBAS versiones. Los codigos pasan a coincidir 1:1 con los valores
-- que envia el chat v1 (baja/media/alta), asi el mapeo B8 queda directo.
-- IDs conservados: 8=Baja, 7=Media, 6=Crítica (antes Bajo/Medio/Crítico);
-- se agrega 9=Alta con SLA de 8 horas.
-- ============================================================

update public.catalogo set nombre = 'Baja',    codigo = 'baja'    where catalogo_id = 8 and tipo = 'prioridad';
update public.catalogo set nombre = 'Media',   codigo = 'media'   where catalogo_id = 7 and tipo = 'prioridad';
update public.catalogo set nombre = 'Crítica', codigo = 'critica' where catalogo_id = 6 and tipo = 'prioridad';

insert into public.catalogo (catalogo_id, tipo, nombre, codigo, orden)
values (9, 'prioridad', 'Alta', 'alta', 2)
on conflict (catalogo_id) do nothing;

-- Orden visual: Critica(1) Alta(2) Media(3) Baja(4)
update public.catalogo set orden = 1 where catalogo_id = 6;
update public.catalogo set orden = 3 where catalogo_id = 7;
update public.catalogo set orden = 4 where catalogo_id = 8;

-- SLA de Alta = 8 horas (Critica 4h / Media 24h / Baja 72h ya sembradas)
insert into public.prioridad_sla (prioridad_id, horas_compromiso)
values (9, 8)
on conflict (prioridad_id) do nothing;
