-- ============================================================
-- LuxFBD - 0016: Interruptor remoto de la experiencia V2
-- Cascada final del interruptor (config.js):
--   ?v2=on|off (URL)  >  preferencia del usuario (switch del header /
--   localStorage)  >  ESTA TABLA (remoto, sin redeploy)  >  config.js
-- Apagar/prender para todos sin tocar el repo, desde el SQL Editor:
--   update public.app_flag set valor = true  where clave = 'v2';
--   update public.app_flag set valor = false where clave = 'v2';
-- ============================================================

create table public.app_flag (
    clave          text primary key,
    valor          boolean not null,
    actualizado_en timestamptz not null default now()
);

insert into public.app_flag (clave, valor) values ('v2', false);

alter table public.app_flag enable row level security;

-- Lectura publica (el frontend la consulta antes del login);
-- SIN politicas de escritura: solo SQL Editor / service role.
create policy app_flag_select_publico on public.app_flag
    for select to anon, authenticated
    using (true);

comment on table public.app_flag is
    'Flags de la aplicacion. v2 = interruptor remoto de la nueva experiencia.';
