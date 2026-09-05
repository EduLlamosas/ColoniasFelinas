import type { PrismaClient } from '@prisma/client';

// Orden hijo -> padre por las FKs reales (Gato tiene ON DELETE RESTRICT
// contra Colonia, así que debe vaciarse antes).
export async function cleanDatabase(prisma: PrismaClient) {
  await prisma.asignacionVoluntario.deleteMany();
  await prisma.comedero.deleteMany();
  await prisma.gato.deleteMany();
  await prisma.voluntario.deleteMany();
  await prisma.colonia.deleteMany();
  await prisma.usuario.deleteMany();
}
