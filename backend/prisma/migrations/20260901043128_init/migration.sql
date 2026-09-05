-- CreateEnum
CREATE TYPE "TipoSuelo" AS ENUM ('URBANO', 'RURAL', 'INDUSTRIAL');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MACHO', 'HEMBRA', 'DESCONOCIDO');

-- CreateEnum
CREATE TYPE "EstadoCer" AS ENUM ('AVISTADO', 'CAPTURADO', 'ESTERILIZADO', 'RETORNADO', 'ADOPTADO');

-- CreateEnum
CREATE TYPE "RolAsignado" AS ENUM ('ALIMENTADOR_PRINCIPAL', 'CAPTURADOR', 'SUPERVISOR');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colonias" (
    "id" TEXT NOT NULL,
    "codigo_oficial" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo_suelo" "TipoSuelo" NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colonias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comederos" (
    "id" TEXT NOT NULL,
    "colonia_id" TEXT NOT NULL,
    "ubicacion_detallada" TEXT NOT NULL,
    "foto_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comederos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gatos" (
    "id" TEXT NOT NULL,
    "colonia_id" TEXT NOT NULL,
    "nombre" TEXT,
    "sexo" "Sexo" NOT NULL,
    "capa_pelaje" TEXT NOT NULL,
    "estado_cer" "EstadoCer" NOT NULL,
    "tiene_microchip" BOOLEAN NOT NULL DEFAULT false,
    "num_microchip" TEXT,
    "marcaje_oreja" BOOLEAN NOT NULL DEFAULT false,
    "foto_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voluntarios" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "url_cesion_datos" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voluntarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voluntarios_colonias" (
    "voluntario_id" TEXT NOT NULL,
    "colonia_id" TEXT NOT NULL,
    "rol_asignado" "RolAsignado" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voluntarios_colonias_pkey" PRIMARY KEY ("voluntario_id","colonia_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "colonias_codigo_oficial_key" ON "colonias"("codigo_oficial");

-- CreateIndex
CREATE UNIQUE INDEX "gatos_num_microchip_key" ON "gatos"("num_microchip");

-- CreateIndex
CREATE UNIQUE INDEX "voluntarios_dni_key" ON "voluntarios"("dni");

-- AddForeignKey
ALTER TABLE "comederos" ADD CONSTRAINT "comederos_colonia_id_fkey" FOREIGN KEY ("colonia_id") REFERENCES "colonias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gatos" ADD CONSTRAINT "gatos_colonia_id_fkey" FOREIGN KEY ("colonia_id") REFERENCES "colonias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voluntarios_colonias" ADD CONSTRAINT "voluntarios_colonias_voluntario_id_fkey" FOREIGN KEY ("voluntario_id") REFERENCES "voluntarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voluntarios_colonias" ADD CONSTRAINT "voluntarios_colonias_colonia_id_fkey" FOREIGN KEY ("colonia_id") REFERENCES "colonias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
