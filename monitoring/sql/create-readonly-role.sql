-- Rol de solo lectura para el datasource de métricas de negocio (FR-019).
--
-- El tablero de Grafana ejecuta consultas sobre `usuarios`, `eventos`,
-- `inscripciones` y `logs_actividad`. En PostgreSQL el acceso de solo lectura
-- no es un atributo del rol: se concede el USAGE del esquema y el SELECT, y se
-- revocan explícitamente los permisos de escritura. Olvidar los REVOKE es el
-- modo habitual de que un "datasource de solo lectura" termine pudiendo
-- borrar datos de producción.
--
-- Uso (como superusuario de la base de datos de la aplicación):
--   psql "$DATABASE_URL" -v rol=goblinhub_ro -f monitoring/sql/create-readonly-role.sql
--
-- Después, en `monitoring/.env`:
--   BUSINESS_DB_HOST=...
--   BUSINESS_DB_USER=goblinhub_ro
--   BUSINESS_DB_PASSWORD=<la que definas por fuera del repositorio>
--
-- Este script NO crea la contraseña: se fija con `password_hash` o desde el
-- panel de Supabase. No dejar contraseñas en este repositorio.

\set ON_ERROR_STOP on

\if :{?rol}
\else
  \echo 'Falta el parámetro: psql -v rol=<nombre_del_rol> -f este-fichero'
  \quit
\endif

-- Crear el rol si no existe. `\gexec` es la forma idiomática en psql: permite
-- interpolar el nombre sin concatenar SQL a mano, y por tanto sin abrir la
-- puerta a inyección desde el valor de `-v rol`.
SELECT format('CREATE ROLE %I LOGIN', :'rol')
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'rol')
\gexec

-- El CONNECT a la base de datos ya viene concedido a PUBLIC en PostgreSQL, y
-- Supabase no expone la base de datos de la aplicación como "database" en su
-- GRANT estándar. Se deja como está: si el despliegue lo exige, se añade un
-- GRANT CONNECT explícito para la base de datos concreta.

-- 1. Puede ver los objetos, pero no escribir en ellos.
GRANT USAGE ON SCHEMA public TO :"rol";

GRANT SELECT ON ALL TABLES IN SCHEMA public TO :"rol";
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO :"rol";

-- 2. La parte que se olvida: sin estos REVOKE, el rol también podría escribir.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM :"rol";
REVOKE USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public FROM :"rol";
REVOKE CREATE ON SCHEMA public FROM :"rol";

-- 3. Las tablas que se creen en el futuro heredan permisos por defecto. Sin
--    esto, el rol pierde el acceso en el próximo `prisma migrate deploy` y el
--    síntoma es un panel vacío sin ningún error visible.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO :"rol";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO :"rol";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM :"rol";

\echo 'Rol listo. Asigna la contraseña fuera del repositorio y configura'
\echo 'BUSINESS_DB_USER y BUSINESS_DB_PASSWORD en monitoring/.env.'
