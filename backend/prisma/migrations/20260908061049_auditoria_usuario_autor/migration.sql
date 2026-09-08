-- AlterTable
ALTER TABLE "registros_clinicos" ADD COLUMN     "usuario_id" INTEGER;

-- AlterTable
ALTER TABLE "visitas_comedero" ADD COLUMN     "usuario_id" INTEGER;

-- AddForeignKey
ALTER TABLE "visitas_comedero" ADD CONSTRAINT "visitas_comedero_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_clinicos" ADD CONSTRAINT "registros_clinicos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
