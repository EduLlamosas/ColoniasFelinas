-- CreateIndex
CREATE INDEX "comederos_colonia_id_idx" ON "comederos"("colonia_id");

-- CreateIndex
CREATE INDEX "gatos_colonia_id_idx" ON "gatos"("colonia_id");

-- CreateIndex
CREATE INDEX "registros_clinicos_gato_id_idx" ON "registros_clinicos"("gato_id");

-- CreateIndex
CREATE INDEX "visitas_comedero_comedero_id_idx" ON "visitas_comedero"("comedero_id");
