/*
  Warnings:

  - The primary key for the `voluntarios_colonias` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[voluntario_id,colonia_id]` on the table `voluntarios_colonias` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "voluntarios_colonias" DROP CONSTRAINT "voluntarios_colonias_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "voluntarios_colonias_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "voluntarios_colonias_voluntario_id_colonia_id_key" ON "voluntarios_colonias"("voluntario_id", "colonia_id");
