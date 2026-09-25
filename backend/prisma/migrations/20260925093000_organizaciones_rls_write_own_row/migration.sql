-- La política original solo dejaba escribir "organizaciones" al superadmin (pensada para
-- crearOrganizacion/renombrar un ayuntamiento). No contaba con que un usuario normal necesita
-- actualizar storage_kb_usados de SU PROPIA organización en cada subida/borrado de foto
-- (MediaService) - sin este cambio, esa operación viola la política y la subida entera falla.
--
-- WITH CHECK pasa a coincidir con USING: cualquier escritura sobre la propia organización está
-- permitida a nivel de fila: qué CAMPOS puede tocar un usuario normal (nunca nombre/slug/activo,
-- por ejemplo) sigue siendo responsabilidad de la capa de aplicación (ningún resolver expone una
-- mutación que deje a un ADMINISTRADOR normal tocar esos campos) - RLS aquí solo garantiza que no
-- se puede escribir la fila de OTRA organización, no qué columnas se tocan dentro de la propia.
DROP POLICY "tenant_isolation" ON "organizaciones";
CREATE POLICY "tenant_isolation" ON "organizaciones"
  USING (current_setting('app.is_superadmin', true) = 'true' OR "id" = NULLIF(current_setting('app.tenant_id', true), '')::integer)
  WITH CHECK (current_setting('app.is_superadmin', true) = 'true' OR "id" = NULLIF(current_setting('app.tenant_id', true), '')::integer);
