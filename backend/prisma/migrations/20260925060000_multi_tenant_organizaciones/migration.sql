/*
  Warnings:

  - Se introduce el modelo `Organizacion` (entidad raíz del multi-tenant) y una columna
    `organizacion_id` en `usuarios`, `colonias`, `comederos`, `gatos`, `voluntarios`,
    `voluntarios_colonias`, `visitas_comedero` y `registros_clinicos`.
  - Todas las filas existentes se asignan a una única organización "piloto" creada en esta misma
    migración (backfill), preservando los datos actuales sin pérdida.
  - `usuarios.organizacion_id` se queda NULLABLE a propósito: NULL identifica a un superadmin (el
    operador del SaaS), que no pertenece a ninguna organización.
  - Se crea un rol de base de datos `colonias_app`, sin privilegios de superusuario, para que las
    políticas de Row-Level Security definidas al final de este fichero se apliquen de verdad -
    "postgres" (con el que se conecta hoy Prisma) es superusuario y SIEMPRE se salta RLS.

*/

-- ============================================================================================
-- 1. Tabla Organizacion
-- ============================================================================================
CREATE TABLE "organizaciones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizaciones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizaciones_slug_key" ON "organizaciones"("slug");

-- ============================================================================================
-- 2. Columnas organizacion_id, nullable de momento (mismo patrón incremental que el resto de
--    migraciones de este proyecto: nullable -> backfill -> NOT NULL).
-- ============================================================================================
ALTER TABLE "usuarios" ADD COLUMN "organizacion_id" INTEGER;
ALTER TABLE "colonias" ADD COLUMN "organizacion_id" INTEGER;
ALTER TABLE "comederos" ADD COLUMN "organizacion_id" INTEGER;
ALTER TABLE "gatos" ADD COLUMN "organizacion_id" INTEGER;
ALTER TABLE "voluntarios" ADD COLUMN "organizacion_id" INTEGER;
ALTER TABLE "voluntarios_colonias" ADD COLUMN "organizacion_id" INTEGER;
ALTER TABLE "visitas_comedero" ADD COLUMN "organizacion_id" INTEGER;
ALTER TABLE "registros_clinicos" ADD COLUMN "organizacion_id" INTEGER;

-- ============================================================================================
-- 3. Backfill: todo lo que exista hoy (seed, pilotos manuales...) pasa a una única organización
--    "piloto" recién creada. En un despliegue nuevo sin datos previos, esto simplemente crea la
--    organización y no actualiza ninguna fila.
-- ============================================================================================
DO $$
DECLARE
  org_id INTEGER;
BEGIN
  INSERT INTO "organizaciones" ("nombre", "slug", "activo", "updated_at")
  VALUES ('Organización piloto', 'piloto', true, CURRENT_TIMESTAMP)
  RETURNING "id" INTO org_id;

  UPDATE "usuarios" SET "organizacion_id" = org_id;
  UPDATE "colonias" SET "organizacion_id" = org_id;
  UPDATE "comederos" SET "organizacion_id" = org_id;
  UPDATE "gatos" SET "organizacion_id" = org_id;
  UPDATE "voluntarios" SET "organizacion_id" = org_id;
  UPDATE "voluntarios_colonias" SET "organizacion_id" = org_id;
  UPDATE "visitas_comedero" SET "organizacion_id" = org_id;
  UPDATE "registros_clinicos" SET "organizacion_id" = org_id;
END $$;

-- ============================================================================================
-- 4. NOT NULL en todo salvo usuarios (NULL ahí = superadmin, ver comentario en schema.prisma).
-- ============================================================================================
ALTER TABLE "colonias" ALTER COLUMN "organizacion_id" SET NOT NULL;
ALTER TABLE "comederos" ALTER COLUMN "organizacion_id" SET NOT NULL;
ALTER TABLE "gatos" ALTER COLUMN "organizacion_id" SET NOT NULL;
ALTER TABLE "voluntarios" ALTER COLUMN "organizacion_id" SET NOT NULL;
ALTER TABLE "voluntarios_colonias" ALTER COLUMN "organizacion_id" SET NOT NULL;
ALTER TABLE "visitas_comedero" ALTER COLUMN "organizacion_id" SET NOT NULL;
ALTER TABLE "registros_clinicos" ALTER COLUMN "organizacion_id" SET NOT NULL;

-- ============================================================================================
-- 5. Claves foráneas e índices. Las tablas "hijas" (comederos, gatos, voluntarios_colonias,
--    visitas_comedero, registros_clinicos) llevan organizacion_id DENORMALIZADO - una copia del
--    de su padre, puesta ahí a propósito para que las políticas RLS de más abajo filtren por una
--    columna propia en vez de necesitar un JOIN multi-salto en cada política. Llevan su propia FK
--    a organizaciones igualmente, por integridad, aunque el modelo Prisma no las declare como
--    relación navegable (son un valor copiado, no algo que la app necesite atravesar).
-- ============================================================================================
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "colonias" ADD CONSTRAINT "colonias_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comederos" ADD CONSTRAINT "comederos_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gatos" ADD CONSTRAINT "gatos_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "voluntarios" ADD CONSTRAINT "voluntarios_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "voluntarios_colonias" ADD CONSTRAINT "voluntarios_colonias_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visitas_comedero" ADD CONSTRAINT "visitas_comedero_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registros_clinicos" ADD CONSTRAINT "registros_clinicos_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "usuarios_organizacion_id_idx" ON "usuarios"("organizacion_id");
CREATE INDEX "colonias_organizacion_id_idx" ON "colonias"("organizacion_id");
CREATE INDEX "comederos_organizacion_id_idx" ON "comederos"("organizacion_id");
CREATE INDEX "gatos_organizacion_id_idx" ON "gatos"("organizacion_id");
CREATE INDEX "voluntarios_organizacion_id_idx" ON "voluntarios"("organizacion_id");
CREATE INDEX "voluntarios_colonias_organizacion_id_idx" ON "voluntarios_colonias"("organizacion_id");
CREATE INDEX "visitas_comedero_organizacion_id_idx" ON "visitas_comedero"("organizacion_id");
CREATE INDEX "registros_clinicos_organizacion_id_idx" ON "registros_clinicos"("organizacion_id");

-- ============================================================================================
-- 6. Rol de aplicación restringido. El backend en tiempo de ejecución (APP_DATABASE_URL) debe
--    conectarse con ESTE rol, no con "postgres" - ver PrismaService. La contraseña de aquí es la
--    de desarrollo local, igual que JWT_SECRET ya viene "de fábrica" en .env.docker: rotar antes
--    de cualquier despliegue con un cliente real.
-- ============================================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'colonias_app') THEN
    CREATE ROLE "colonias_app" LOGIN PASSWORD 'colonias_app_dev_password';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO "colonias_app";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "colonias_app";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "colonias_app";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "colonias_app";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "colonias_app";

-- ============================================================================================
-- 7. Row-Level Security: el aislamiento entre organizaciones lo garantiza la base de datos, no
--    la disciplina de cada resolver en acordarse de un WHERE. "colonias_app" no es dueño de estas
--    tablas (las migra "postgres"), así que ya está sujeto a RLS sin más; FORCE se añade de todos
--    modos, por claridad y como red de seguridad si el dueño cambiase alguna vez.
--
--    app.tenant_id / app.is_superadmin los fija PrismaService (ver tenant-context.ts) con
--    SET LOCAL al principio de cada transacción, a partir del organizacionId del JWT validado -
--    nunca a partir de nada que mande el cliente en la query. NULLIF(...,'') convierte la cadena
--    vacía en NULL antes del cast a integer: current_setting(clave, true) devuelve NULL si la
--    variable no se ha fijado nunca, pero PrismaService fija app.tenant_id a '' para un superadmin
--    (que no tiene organización), y castear '' directo a integer sería un error de Postgres.
-- ============================================================================================
ALTER TABLE "organizaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizaciones" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "organizaciones"
  USING (current_setting('app.is_superadmin', true) = 'true' OR "id" = NULLIF(current_setting('app.tenant_id', true), '')::integer)
  WITH CHECK (current_setting('app.is_superadmin', true) = 'true');

ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usuarios" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "usuarios"
  USING (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer)
  WITH CHECK (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer);

ALTER TABLE "colonias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "colonias" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "colonias"
  USING (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer)
  WITH CHECK (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer);

ALTER TABLE "comederos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comederos" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "comederos"
  USING (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer)
  WITH CHECK (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer);

ALTER TABLE "gatos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gatos" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "gatos"
  USING (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer)
  WITH CHECK (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer);

ALTER TABLE "voluntarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "voluntarios" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "voluntarios"
  USING (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer)
  WITH CHECK (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer);

ALTER TABLE "voluntarios_colonias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "voluntarios_colonias" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "voluntarios_colonias"
  USING (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer)
  WITH CHECK (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer);

ALTER TABLE "visitas_comedero" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "visitas_comedero" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "visitas_comedero"
  USING (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer)
  WITH CHECK (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer);

ALTER TABLE "registros_clinicos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "registros_clinicos" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "registros_clinicos"
  USING (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer)
  WITH CHECK (current_setting('app.is_superadmin', true) = 'true' OR "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer);
