-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMINISTRADOR', 'GESTOR');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "rol" "RolUsuario" NOT NULL DEFAULT 'GESTOR';
