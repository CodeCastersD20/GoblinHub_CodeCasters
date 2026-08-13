-- Ejecutar como administrador con psql, usando conexión directa/session mode:
-- psql "$ADMIN_URL" -v database_name=postgres -v migration_owner=postgres \
--   -f scripts/provision-backup-roles.sql
-- Después, dentro de psql, asignar secretos sin dejarlos en el historial:
-- \password goblinhub_backup_user
-- \password goblinhub_restore_user

\set ON_ERROR_STOP on
\if :{?database_name}
\else
  \echo 'Falta -v database_name=<database>'
  \quit 1
\endif
\if :{?migration_owner}
\else
  \echo 'Falta -v migration_owner=<rol-owner-de-migraciones>'
  \quit 1
\endif

BEGIN;

-- PUBLIC no debe introducir lectura/escritura o CREATE fuera de la allowlist.
SELECT NOT EXISTS (
  SELECT 1
  FROM information_schema.table_privileges
  WHERE grantee = 'PUBLIC'
    AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
) AND NOT EXISTS (
  SELECT 1
  FROM information_schema.usage_privileges
  WHERE grantee = 'PUBLIC'
    AND object_type = 'SEQUENCE'
) AND NOT EXISTS (
  SELECT 1
  FROM pg_namespace n
  CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl, acldefault('n', n.nspowner))) acl
  WHERE acl.grantee = 0
    AND acl.privilege_type = 'CREATE'
) AS public_privileges_safe
\gset

\if :public_privileges_safe
\else
  \echo 'ERROR: PUBLIC concede privilegios incompatibles con mínimo privilegio.'
  ROLLBACK;
  \quit 1
\endif

SELECT 'CREATE ROLE goblinhub_backup NOLOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'goblinhub_backup')
\gexec
SELECT 'CREATE ROLE goblinhub_restore NOLOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'goblinhub_restore')
\gexec
SELECT 'CREATE ROLE goblinhub_backup_user LOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'goblinhub_backup_user')
\gexec
SELECT 'CREATE ROLE goblinhub_restore_user LOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'goblinhub_restore_user')
\gexec

ALTER ROLE goblinhub_backup NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOLOGIN;
ALTER ROLE goblinhub_restore NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOLOGIN;
ALTER ROLE goblinhub_backup_user NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS CONNECTION LIMIT 2;
ALTER ROLE goblinhub_restore_user NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 2;

GRANT goblinhub_backup TO goblinhub_backup_user;
GRANT goblinhub_restore TO goblinhub_restore_user;

SELECT format('GRANT CONNECT ON DATABASE %I TO goblinhub_backup, goblinhub_restore', :'database_name')
\gexec
GRANT USAGE ON SCHEMA public TO goblinhub_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO goblinhub_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO goblinhub_backup;

GRANT USAGE, CREATE ON SCHEMA public TO goblinhub_restore;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public TO goblinhub_restore;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO goblinhub_restore;

SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT ON TABLES TO goblinhub_backup', :'migration_owner')
\gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT ON SEQUENCES TO goblinhub_backup', :'migration_owner')
\gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO goblinhub_restore', :'migration_owner')
\gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO goblinhub_restore', :'migration_owner')
\gexec

COMMIT;
