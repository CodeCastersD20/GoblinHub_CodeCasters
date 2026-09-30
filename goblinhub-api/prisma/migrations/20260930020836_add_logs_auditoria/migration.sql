-- CreateEnum
CREATE TYPE "TipoActor" AS ENUM ('usuario', 'anonimo', 'sistema');

-- CreateEnum
CREATE TYPE "ResultadoAuditoria" AS ENUM ('exitoso', 'rechazado', 'fallido');

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id_auditoria" BIGSERIAL NOT NULL,
    "actor_tipo" "TipoActor" NOT NULL,
    "actor_id" UUID,
    "accion" VARCHAR(20) NOT NULL,
    "recurso" VARCHAR(200) NOT NULL,
    "resultado" "ResultadoAuditoria" NOT NULL,
    "correlation_id" VARCHAR(64) NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id_auditoria")
);

-- CreateIndex
CREATE INDEX "idx_auditoria_fecha" ON "logs_auditoria"("fecha_hora");

-- CreateIndex
CREATE INDEX "idx_auditoria_actor" ON "logs_auditoria"("actor_id", "fecha_hora");

-- CreateIndex
CREATE INDEX "idx_auditoria_accion" ON "logs_auditoria"("accion", "fecha_hora");

-- CreateIndex
CREATE INDEX "idx_auditoria_recurso" ON "logs_auditoria"("recurso", "fecha_hora");

-- CreateIndex
CREATE INDEX "idx_auditoria_resultado" ON "logs_auditoria"("resultado", "fecha_hora");

-- CreateIndex
CREATE INDEX "idx_auditoria_correlation" ON "logs_auditoria"("correlation_id");

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
