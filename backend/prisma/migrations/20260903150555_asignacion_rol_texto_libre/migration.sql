-- Convert "rol_asignado" from the fixed RolAsignado enum into a free-text column
-- so new roles can be entered without altering the enum type.
ALTER TABLE "voluntarios_colonias" ALTER COLUMN "rol_asignado" TYPE VARCHAR(100) USING "rol_asignado"::text;

DROP TYPE "RolAsignado";
