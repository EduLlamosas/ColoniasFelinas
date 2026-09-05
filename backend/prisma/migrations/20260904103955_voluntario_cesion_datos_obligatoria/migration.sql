/*
  Warnings:

  - Made the column `url_cesion_datos` on table `voluntarios` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "voluntarios" ALTER COLUMN "url_cesion_datos" SET NOT NULL;
