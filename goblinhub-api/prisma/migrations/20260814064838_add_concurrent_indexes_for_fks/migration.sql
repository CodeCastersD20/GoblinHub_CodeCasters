-- 1. Índice para la llave foránea de creador en usuarios
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_usuarios_creador" 
ON "usuarios"("id_usuario_creador") 
WHERE "deleted_at" IS NULL;

-- 2. Índice para la llave foránea de usuario en disponibilidades
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_disponibilidades_usuario" 
ON "disponibilidades"("id_usuario") 
WHERE "deleted_at" IS NULL;

-- 3. Índice para la llave foránea de creador en eventos
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_eventos_creador" 
ON "eventos"("id_creador") 
WHERE "deleted_at" IS NULL;

-- 4. Índice para la llave foránea de evento en inscripciones
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_inscripciones_evento" 
ON "inscripciones"("id_evento") 
WHERE "deleted_at" IS NULL;

-- 5. Índice para la llave foránea de usuario en inscripciones
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_inscripciones_usuario" 
ON "inscripciones"("id_usuario") 
WHERE "deleted_at" IS NULL;

-- 6. Índice para la llave foránea de usuario en logs de actividad
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_logs_usuario" 
ON "logs_actividad"("id_usuario") 
WHERE "deleted_at" IS NULL;

-- 7. Índice para la llave foránea de usuario en canjes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_canjes_usuario" 
ON "canjes"("id_usuario") 
WHERE "deleted_at" IS NULL;

-- 8. Índice para la llave foránea de recompensa en canjes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_canjes_recompensa" 
ON "canjes"("id_recompensa") 
WHERE "deleted_at" IS NULL;

-- 9. Índice para la llave foránea de interés en usuario_intereses
-- (El id_usuario está cubierto por el Primary Key compuesto, por lo que solo indexamos id_interes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_usuario_intereses_interes" 
ON "usuario_intereses"("id_interes") 
WHERE "deleted_at" IS NULL;