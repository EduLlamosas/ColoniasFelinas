import type { PrismaClient } from '@prisma/client';
import { runAsSuperadmin } from '../../src/prisma/tenant-context.js';

// Borrar la Organizacion basta: todo lo demás (colonias, voluntarios, y por debajo comederos,
// gatos, asignaciones, visitas, registros clínicos) tiene ON DELETE CASCADE contra ella, sea vía
// su propio organizacionId o vía la cadena colonia/gato/comedero de siempre - ver la migración
// multi_tenant_organizaciones. usuarios se vacía aparte porque el superadmin (organizacionId NULL)
// no cuelga de ninguna Organizacion y no se borraría en cascada con lo anterior.
//
// runAsSuperadmin: esta tabla lleva RLS - sin contexto de tenant, deleteMany() no borraría NADA
// (RLS lo filtra todo por defecto), dejando basura de un test contaminando el siguiente.
export async function cleanDatabase(prisma: PrismaClient) {
  await runAsSuperadmin(async () => {
    await prisma.organizacion.deleteMany();
    await prisma.usuario.deleteMany();
  });
}
