-- 0022: Prioridad inicial POR CATEGORIA (acuerdo 2026-10-02) + reparacion de ETAs.
-- El alumno nunca elige prioridad; si el canal no la manda (Lumix/invitado) la
-- resuelve la tabla editable categoria_prioridad_default: acceso->Alta(8h),
-- plataforma/finanzas->Media(24h), materias/servicios_escolares/otros->Baja(72h).
-- La percibida de v1 se respeta; soporte reclasifica. Tambien repara ETAs
-- anteriores a la creacion (inflaban "vencidos" para siempre).

-- ---------- Reparacion de datos: ETA anterior a la creacion ----------
update public.ticket
   set eta_estimada = fecha_creacion
        + make_interval(hours => coalesce(public.horas_sla(prioridad_id), 72))
 where eta_estimada is not null
   and eta_estimada < fecha_creacion;

-- ---------- Mapa categoria -> prioridad inicial (editable por staff) ----------
create table public.categoria_prioridad_default (
    categoria_id bigint primary key references public.catalogo (catalogo_id),
    prioridad_id bigint not null references public.catalogo (catalogo_id)
);
comment on table public.categoria_prioridad_default is
    'Prioridad inicial que la DB asigna cuando el canal no manda una (Lumix/invitado). Editable por staff; la futura pantalla de Configuracion la administra.';

insert into public.categoria_prioridad_default (categoria_id, prioridad_id)
select c.catalogo_id, p.catalogo_id
  from public.catalogo c
  join public.catalogo p
    on p.tipo = 'prioridad'
   and p.codigo = case c.codigo
                      when 'acceso'     then 'alta'
                      when 'plataforma' then 'media'
                      when 'finanzas'   then 'media'
                      else 'baja'
                  end
 where c.tipo = 'categoria';

alter table public.categoria_prioridad_default enable row level security;
create policy cpd_select_autenticados on public.categoria_prioridad_default
    for select to authenticated using (true);
create policy cpd_escribe_staff on public.categoria_prioridad_default
    for all to authenticated
    using (public.es_staff()) with check (public.es_staff());

-- ---------- BEFORE INSERT: resolver prioridad nula por categoria ----------
create or replace function public.fn_ticket_before_insert()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
    -- Canal sin prioridad (Lumix/invitado): la asigna el mapa por categoria.
    if new.prioridad_id is null then
        select d.prioridad_id into new.prioridad_id
          from public.categoria_prioridad_default d
         where d.categoria_id = new.categoria_id;
        new.prioridad_id := coalesce(new.prioridad_id, 8); -- respaldo: Baja
    end if;

    perform public.assert_catalogo(new.categoria_id, 'categoria');
    perform public.assert_catalogo(new.prioridad_id, 'prioridad');
    perform public.assert_catalogo(new.prioridad_reportada_id, 'prioridad');
    perform public.assert_catalogo(new.estado_id, 'estado');
    perform public.assert_catalogo(new.area_notificada_id, 'area');

    if new.eta_estimada is null then
        new.eta_estimada := coalesce(new.fecha_creacion, now())
            + make_interval(hours => coalesce(public.horas_sla(new.prioridad_id), 72));
    end if;
    return new;
end;
$$;
