-- prisma/migrations/20260221232834_add_timestamps/migration.sql
ALTER TABLE "usuarios" ADD COLUMN "deleted_at" TIMESTAMP(6);

ALTER TABLE "intereses"
  ADD COLUMN "created_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
  ADD COLUMN "updated_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
  ADD COLUMN "deleted_at" TIMESTAMP(6);

ALTER TABLE "eventos"
  ADD COLUMN "updated_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
  ADD COLUMN "deleted_at" TIMESTAMP(6);

ALTER TABLE "inscripciones" ADD COLUMN "deleted_at" TIMESTAMP(6);

ALTER TABLE "productos" ADD COLUMN "deleted_at" TIMESTAMP(6);

ALTER TABLE "captacion_novatos"
  ADD COLUMN "updated_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
  ADD COLUMN "deleted_at" TIMESTAMP(6);

ALTER TABLE "recompensas"
  ADD COLUMN "created_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
  ADD COLUMN "updated_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
  ADD COLUMN "deleted_at" TIMESTAMP(6);