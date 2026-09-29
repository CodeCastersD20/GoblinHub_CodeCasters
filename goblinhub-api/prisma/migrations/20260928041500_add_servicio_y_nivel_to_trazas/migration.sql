-- AlterTable
-- `servicio` y `nivel` los exige el alcance de #204: el filtro por servicio y
-- el nivel a partir del cual se decide persistir la traza.
--
-- Con DEFAULT y NOT NULL a la vez, PostgreSQL reescribe la tabla fisicamente en
-- vez de anadir la columna con valor por defecto en el diccionario de la
-- version anterior. Las dos columnas se anaden sin DEFAULT y con el DEFAULT
-- puesto despues, que si usa la via rapida. La tabla estaba recien creada por la
-- migracion 20260927195414, asi que el coste es despreciable, pero el truco
-- evita tener que depender de ello si alguien vuelve a migrar con trazas dentro.
ALTER TABLE "trazas" ADD COLUMN     "servicio" VARCHAR(60);
ALTER TABLE "trazas" ADD COLUMN     "nivel" VARCHAR(10);
ALTER TABLE "trazas" ALTER COLUMN "servicio" SET DEFAULT 'goblinhub-api';
ALTER TABLE "trazas" ALTER COLUMN "nivel" SET DEFAULT 'info';
ALTER TABLE "trazas" ALTER COLUMN "servicio" SET NOT NULL;
ALTER TABLE "trazas" ALTER COLUMN "nivel" SET NOT NULL;

-- CreateIndex
-- Sin este indice el filtro por servicio, que es el primero que nombra el
-- alcance de #204, recorreria la tabla entera: `servicio` es la columna de
-- menor cardinalidad de todas las que se filtran.
CREATE INDEX "idx_trazas_servicio" ON "trazas"("servicio", "fecha_inicio");
