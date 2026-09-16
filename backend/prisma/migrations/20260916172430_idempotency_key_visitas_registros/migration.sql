-- AlterTable
ALTER TABLE "registros_clinicos" ADD COLUMN     "idempotency_key" TEXT;

-- AlterTable
ALTER TABLE "visitas_comedero" ADD COLUMN     "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "registros_clinicos_idempotency_key_key" ON "registros_clinicos"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "visitas_comedero_idempotency_key_key" ON "visitas_comedero"("idempotency_key");
