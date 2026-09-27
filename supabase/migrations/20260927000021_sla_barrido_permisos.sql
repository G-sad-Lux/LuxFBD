-- 0021: fn_sla_barrido solo para usuarios autenticados (y el cron).
-- El REVOKE de anon en 0020 no bastaba: las funciones nacen con EXECUTE
-- para PUBLIC y anon lo heredaba por ahí.
revoke execute on function public.fn_sla_barrido() from public, anon;
grant  execute on function public.fn_sla_barrido() to authenticated;
