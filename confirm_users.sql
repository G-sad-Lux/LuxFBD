-- Script para confirmar masivamente todos los usuarios pendientes
-- Ejecutar en: Supabase Dashboard -> SQL Editor

UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;

-- Verificación: Debería devolver 0 filas pendientes después de ejecutar
SELECT count(*) as pendientes 
FROM auth.users 
WHERE email_confirmed_at IS NULL;
