-- 0003: Row Level Security. Las Edge Functions consultan con el JWT del usuario.

-- Funciones auxiliares ----------------------------------------
-- SECURITY DEFINER: evita recursion de RLS sobre la tabla usuario.
create or replace function public.usuario_actual()
returns bigint
language sql stable security definer
set search_path = public
as $$
    select usuario_id from public.usuario where auth_uid = auth.uid();
$$;

-- Staff = quienes gestionan tickets; Maestro queda fuera (es reportador).
create or replace function public.es_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
    select exists (
        select 1 from public.usuario
        where auth_uid = auth.uid()
          and tipo_usuario in ('Soporte','Administrativo','Administrador')
    );
$$;

-- Activar RLS en TODAS las tablas (denegar por defecto) --------
alter table public.usuario       enable row level security;
alter table public.catalogo      enable row level security;
alter table public.ticket        enable row level security;
alter table public.adjunto       enable row level security;
alter table public.historial     enable row level security;
alter table public.comentario    enable row level security;
alter table public.asignacion    enable row level security;
alter table public.prioridad_sla enable row level security;
alter table public.notificacion  enable row level security;

-- USUARIO: fila propia (login/perfil) o todo si eres staff (/staff, /update)
create policy usuario_select_propio_o_staff on public.usuario
    for select to authenticated
    using (auth_uid = auth.uid() or public.es_staff());

-- CATALOGO: referencia publica de solo lectura
create policy catalogo_select_publico on public.catalogo
    for select to anon, authenticated
    using (true);

-- PRIORIDAD_SLA: solo lectura autenticada
create policy sla_select on public.prioridad_sla
    for select to authenticated
    using (true);

-- TICKET
create policy ticket_select_propio_o_staff on public.ticket
    for select to authenticated
    using (reportador_id = public.usuario_actual() or public.es_staff());

create policy ticket_insert_propio on public.ticket
    for insert to authenticated
    with check (reportador_id = public.usuario_actual());

create policy ticket_update_staff on public.ticket
    for update to authenticated
    using (public.es_staff())
    with check (public.es_staff());

-- ADJUNTO: visible si puedes ver el ticket; insertar solo a nombre propio
create policy adjunto_select_ticket_visible on public.adjunto
    for select to authenticated
    using (
        public.es_staff()
        or exists (
            select 1 from public.ticket t
            where t.ticket_id = adjunto.ticket_id
              and t.reportador_id = public.usuario_actual()
        )
    );

create policy adjunto_insert_propio on public.adjunto
    for insert to authenticated
    with check (subido_por_id = public.usuario_actual());

-- HISTORIAL / COMENTARIO / ASIGNACION / NOTIFICACION: RLS sin politicas =>
-- denegado para clientes; las manejan los triggers SECURITY DEFINER.
