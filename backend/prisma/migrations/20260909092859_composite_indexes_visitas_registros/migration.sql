-- DropIndex
DROP INDEX "registros_clinicos_gato_id_idx";

-- DropIndex
DROP INDEX "visitas_comedero_comedero_id_idx";

-- CreateIndex
CREATE INDEX "registros_clinicos_gato_id_fecha_idx" ON "registros_clinicos"("gato_id", "fecha");

-- CreateIndex
CREATE INDEX "visitas_comedero_comedero_id_created_at_idx" ON "visitas_comedero"("comedero_id", "created_at");
