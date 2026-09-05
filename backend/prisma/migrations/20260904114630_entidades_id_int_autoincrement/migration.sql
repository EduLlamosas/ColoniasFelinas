/*
  Warnings:

  - The primary key for the `colonias` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `colonias` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `comederos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `comederos` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `gatos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `gatos` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `usuarios` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `usuarios` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `voluntarios` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `voluntarios` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `voluntarios_colonias` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `colonia_id` on the `comederos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `colonia_id` on the `gatos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `voluntario_id` on the `voluntarios_colonias` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `colonia_id` on the `voluntarios_colonias` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "comederos" DROP CONSTRAINT "comederos_colonia_id_fkey";

-- DropForeignKey
ALTER TABLE "gatos" DROP CONSTRAINT "gatos_colonia_id_fkey";

-- DropForeignKey
ALTER TABLE "voluntarios_colonias" DROP CONSTRAINT "voluntarios_colonias_colonia_id_fkey";

-- DropForeignKey
ALTER TABLE "voluntarios_colonias" DROP CONSTRAINT "voluntarios_colonias_voluntario_id_fkey";

-- AlterTable
ALTER TABLE "colonias" DROP CONSTRAINT "colonias_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "colonias_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "comederos" DROP CONSTRAINT "comederos_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "colonia_id",
ADD COLUMN     "colonia_id" INTEGER NOT NULL,
ADD CONSTRAINT "comederos_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "gatos" DROP CONSTRAINT "gatos_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "colonia_id",
ADD COLUMN     "colonia_id" INTEGER NOT NULL,
ADD CONSTRAINT "gatos_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "voluntarios" DROP CONSTRAINT "voluntarios_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "voluntarios_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "voluntarios_colonias" DROP CONSTRAINT "voluntarios_colonias_pkey",
DROP COLUMN "voluntario_id",
ADD COLUMN     "voluntario_id" INTEGER NOT NULL,
DROP COLUMN "colonia_id",
ADD COLUMN     "colonia_id" INTEGER NOT NULL,
ADD CONSTRAINT "voluntarios_colonias_pkey" PRIMARY KEY ("voluntario_id", "colonia_id");

-- AddForeignKey
ALTER TABLE "comederos" ADD CONSTRAINT "comederos_colonia_id_fkey" FOREIGN KEY ("colonia_id") REFERENCES "colonias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gatos" ADD CONSTRAINT "gatos_colonia_id_fkey" FOREIGN KEY ("colonia_id") REFERENCES "colonias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voluntarios_colonias" ADD CONSTRAINT "voluntarios_colonias_voluntario_id_fkey" FOREIGN KEY ("voluntario_id") REFERENCES "voluntarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voluntarios_colonias" ADD CONSTRAINT "voluntarios_colonias_colonia_id_fkey" FOREIGN KEY ("colonia_id") REFERENCES "colonias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
