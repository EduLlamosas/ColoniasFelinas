-- ============================================================================================
-- 1. Nuevos roles de Usuario. No se usan como literal en ninguna otra sentencia de ESTA misma
--    migración (Postgres exige que un valor de enum añadido con ALTER TYPE no se use en la misma
--    transacción en la que se añade, en versiones antiguas) - solo se insertan filas con estos
--    roles más adelante, desde la aplicación.
-- ============================================================================================
ALTER TYPE "RolUsuario" ADD VALUE 'VOLUNTARIO';
ALTER TYPE "RolUsuario" ADD VALUE 'VETERINARIO';
ALTER TYPE "RolUsuario" ADD VALUE 'PARTICULAR';

-- ============================================================================================
-- 2. Verificación de email (solo la usan de verdad las cuentas PARTICULAR - ver comentario en
--    schema.prisma). email_verificado NOT NULL DEFAULT true: todo usuario ya existente lo pasa a
--    true automáticamente (son ADMINISTRADOR/GESTOR dados de alta por un humano, no hace falta
--    verificarles nada retroactivamente).
-- ============================================================================================
ALTER TABLE "usuarios" ADD COLUMN "email_verificado" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "usuarios" ADD COLUMN "token_verificacion_email" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "token_verificacion_expira" TIMESTAMP(3);
CREATE UNIQUE INDEX "usuarios_token_verificacion_email_key" ON "usuarios"("token_verificacion_email");

-- ============================================================================================
-- 3. Solicitudes de alta de organización (público, antes de que exista ninguna Organizacion real
--    - ver comentario en schema.prisma).
-- ============================================================================================
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

CREATE TABLE "solicitudes_organizacion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "contacto_nombre" TEXT NOT NULL,
    "contacto_email" TEXT NOT NULL,
    "contacto_telefono" TEXT,
    "mensaje" TEXT,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "organizacion_creada_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_organizacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "solicitudes_organizacion_slug_key" ON "solicitudes_organizacion"("slug");

-- Nadie salvo el superadmin necesita ver esto nunca - es la bandeja de entrada del propio
-- negocio, no un dato de ninguna organización.
ALTER TABLE "solicitudes_organizacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "solicitudes_organizacion" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "solicitudes_organizacion"
  USING (current_setting('app.is_superadmin', true) = 'true')
  WITH CHECK (current_setting('app.is_superadmin', true) = 'true');

-- ============================================================================================
-- 4. Aportaciones de cuentas PARTICULAR - zona de aterrizaje separada de Colonia/Gato, ver el
--    comentario extenso en schema.prisma sobre por qué es una tabla aparte y no un estado en las
--    tablas reales.
-- ============================================================================================
CREATE TYPE "EstadoAportacion" AS ENUM ('PENDIENTE_AUTOMATICO', 'RECHAZADA_AUTOMATICA', 'PENDIENTE_MANUAL', 'ACEPTADA', 'RECHAZADA_MANUAL');

CREATE TABLE "aportaciones_colonia" (
    "id" SERIAL NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo_suelo" "TipoSuelo" NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "observaciones" TEXT,
    "foto_url" TEXT,
    "estado" "EstadoAportacion" NOT NULL DEFAULT 'PENDIENTE_AUTOMATICO',
    "motivo_rechazo" TEXT,
    "colonia_creada_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aportaciones_colonia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "aportaciones_gato" (
    "id" SERIAL NOT NULL,
    "organizacion_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "aportacion_colonia_id" INTEGER NOT NULL,
    "nombre" TEXT,
    "sexo" "Sexo" NOT NULL,
    "capa_pelaje" TEXT NOT NULL,
    "estado_cer" "EstadoCer" NOT NULL,
    "observaciones" TEXT,
    "foto_url" TEXT,
    "estado" "EstadoAportacion" NOT NULL DEFAULT 'PENDIENTE_AUTOMATICO',
    "motivo_rechazo" TEXT,
    "gato_creado_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aportaciones_gato_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "aportaciones_colonia" ADD CONSTRAINT "aportaciones_colonia_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aportaciones_colonia" ADD CONSTRAINT "aportaciones_colonia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "aportaciones_gato" ADD CONSTRAINT "aportaciones_gato_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aportaciones_gato" ADD CONSTRAINT "aportaciones_gato_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aportaciones_gato" ADD CONSTRAINT "aportaciones_gato_aportacion_colonia_id_fkey" FOREIGN KEY ("aportacion_colonia_id") REFERENCES "aportaciones_colonia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "aportaciones_colonia_organizacion_id_idx" ON "aportaciones_colonia"("organizacion_id");
CREATE INDEX "aportaciones_colonia_usuario_id_idx" ON "aportaciones_colonia"("usuario_id");
CREATE INDEX "aportaciones_gato_organizacion_id_idx" ON "aportaciones_gato"("organizacion_id");
CREATE INDEX "aportaciones_gato_usuario_id_idx" ON "aportaciones_gato"("usuario_id");
CREATE INDEX "aportaciones_gato_aportacion_colonia_id_idx" ON "aportaciones_gato"("aportacion_colonia_id");

-- Aislamiento en dos niveles, no solo por organización: un ADMINISTRADOR/GESTOR ve TODAS las
-- aportaciones de su organización (las tiene que revisar), pero un PARTICULAR solo ve las SUYAS,
-- ni siquiera las de otro PARTICULAR de la misma organización - de ahí el segundo AND, que solo
-- restringe más cuando quien pregunta es un PARTICULAR (app.es_particular='true'); para
-- cualquier otro rol de la organización, esa parte es irrelevante y no reduce nada.
ALTER TABLE "aportaciones_colonia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aportaciones_colonia" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "aportaciones_colonia"
  USING (
    current_setting('app.is_superadmin', true) = 'true'
    OR (
      "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer
      AND (
        current_setting('app.es_particular', true) IS DISTINCT FROM 'true'
        OR "usuario_id" = NULLIF(current_setting('app.usuario_id', true), '')::integer
      )
    )
  )
  WITH CHECK (
    current_setting('app.is_superadmin', true) = 'true'
    OR (
      "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer
      AND (
        current_setting('app.es_particular', true) IS DISTINCT FROM 'true'
        OR "usuario_id" = NULLIF(current_setting('app.usuario_id', true), '')::integer
      )
    )
  );

ALTER TABLE "aportaciones_gato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aportaciones_gato" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "aportaciones_gato"
  USING (
    current_setting('app.is_superadmin', true) = 'true'
    OR (
      "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer
      AND (
        current_setting('app.es_particular', true) IS DISTINCT FROM 'true'
        OR "usuario_id" = NULLIF(current_setting('app.usuario_id', true), '')::integer
      )
    )
  )
  WITH CHECK (
    current_setting('app.is_superadmin', true) = 'true'
    OR (
      "organizacion_id" = NULLIF(current_setting('app.tenant_id', true), '')::integer
      AND (
        current_setting('app.es_particular', true) IS DISTINCT FROM 'true'
        OR "usuario_id" = NULLIF(current_setting('app.usuario_id', true), '')::integer
      )
    )
  );
