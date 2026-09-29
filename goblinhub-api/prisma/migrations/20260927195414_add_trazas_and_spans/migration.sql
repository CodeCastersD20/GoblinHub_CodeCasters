-- CreateTable
CREATE TABLE "trazas" (
    "id_traza" UUID NOT NULL,
    "correlation_id" VARCHAR(64) NOT NULL,
    "metodo" VARCHAR(10) NOT NULL,
    "ruta" VARCHAR(200) NOT NULL,
    "estado_http" INTEGER NOT NULL,
    "duracion_ms" INTEGER NOT NULL,
    "ambiente" VARCHAR(20) NOT NULL,
    "id_usuario" UUID,
    "error" TEXT,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "trazas_pkey" PRIMARY KEY ("id_traza")
);

-- CreateTable
CREATE TABLE "spans" (
    "id_span" UUID NOT NULL,
    "id_traza" UUID NOT NULL,
    "parent_id" UUID,
    "nombre" VARCHAR(120) NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "duracion_ms" INTEGER NOT NULL,
    "estado" VARCHAR(20) NOT NULL,
    "atributos" JSONB,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spans_pkey" PRIMARY KEY ("id_span")
);

-- CreateIndex
CREATE INDEX "idx_trazas_fecha" ON "trazas"("fecha_inicio");

-- CreateIndex
CREATE INDEX "idx_trazas_error" ON "trazas"("estado_http", "fecha_inicio");

-- CreateIndex
CREATE INDEX "idx_trazas_ambiente" ON "trazas"("ambiente", "fecha_inicio");

-- CreateIndex
CREATE UNIQUE INDEX "idx_trazas_correlation_id" ON "trazas"("correlation_id");

-- CreateIndex
CREATE INDEX "idx_spans_traza" ON "spans"("id_traza");

-- CreateIndex
CREATE INDEX "idx_spans_traza_padre" ON "spans"("id_traza", "parent_id");

-- AddForeignKey
ALTER TABLE "trazas" ADD CONSTRAINT "trazas_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spans" ADD CONSTRAINT "spans_id_traza_fkey" FOREIGN KEY ("id_traza") REFERENCES "trazas"("id_traza") ON DELETE CASCADE ON UPDATE CASCADE;
