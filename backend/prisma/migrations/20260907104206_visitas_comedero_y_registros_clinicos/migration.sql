-- CreateEnum
CREATE TYPE "TipoEventoClinico" AS ENUM ('ESTERILIZACION', 'VACUNACION', 'TEST_ENFERMEDAD', 'TRATAMIENTO_ESPECIAL');

-- CreateTable
CREATE TABLE "visitas_comedero" (
    "id" SERIAL NOT NULL,
    "comedero_id" INTEGER NOT NULL,
    "pienso_seco" BOOLEAN NOT NULL DEFAULT false,
    "comida_humeda" BOOLEAN NOT NULL DEFAULT false,
    "agua" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitas_comedero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_clinicos" (
    "id" SERIAL NOT NULL,
    "gato_id" INTEGER NOT NULL,
    "tipo" "TipoEventoClinico" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_clinicos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "visitas_comedero" ADD CONSTRAINT "visitas_comedero_comedero_id_fkey" FOREIGN KEY ("comedero_id") REFERENCES "comederos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_clinicos" ADD CONSTRAINT "registros_clinicos_gato_id_fkey" FOREIGN KEY ("gato_id") REFERENCES "gatos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
