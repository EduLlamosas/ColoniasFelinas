import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma, PrismaClient } from '@prisma/client';

export interface TenantContext {
  // null cuando isSuperadmin es true (el operador del SaaS no pertenece a ninguna organización).
  organizacionId: number | null;
  isSuperadmin: boolean;
}

const storage = new AsyncLocalStorage<TenantContext>();

// Marca "ya estamos dentro de una transacción que ya aplicó su SET LOCAL" - ver
// runTenantTransaction()/runTenantScopedRaw() y el comentario en tenant.extension.ts sobre por qué
// hace falta: sin esto, una operación como registros-clinicos.service.ts#create (que necesita
// varias escrituras atómicas en una sola transacción) haría que tenant.extension.ts abriese una
// transacción NUEVA y separada por cada escritura individual, rompiendo la atomicidad.
const txActiveStorage = new AsyncLocalStorage<true>();

export function isTxActive(): boolean {
  return txActiveStorage.getStore() === true;
}

export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

export function runWithTenantContext<T>(context: TenantContext, fn: () => T): T {
  return storage.run(context, fn);
}

// Para el puñado de operaciones de sistema que, por diseño, se ejecutan ANTES de que exista
// ningún JWT validado (login busca el usuario por email antes de saber quién es; JwtStrategy
// comprueba tokenVersion antes de que TenantContextInterceptor llegue a correr; la alta de una
// organización nueva es, por definición, una operación sin organización todavía). Son los únicos
// sitios del código de aplicación donde se usa esto - todo lo demás pasa por
// TenantContextInterceptor con el organizacionId real del JWT.
export function runAsSuperadmin<T>(fn: () => T): T {
  return storage.run({ organizacionId: null, isSuperadmin: true }, fn);
}

// Usado por todo `create()` de entidad tenant-scoped (colonias, gatos, comederos...): el
// organizacionId de una fila nueva SIEMPRE sale de la sesión de quien la crea, nunca de un
// argumento que mande el cliente en la mutación - así nadie puede, ni por error de la app ni a
// propósito, crear algo "para" otra organización. RLS (WITH CHECK) lo comprueba también en la
// propia base de datos como segunda barrera, pero esta es la que da un error de negocio claro en
// vez de un fallo de Postgres genérico.
export function requireTenantId(): number {
  const ctx = getTenantContext();
  if (!ctx || ctx.organizacionId === null) {
    throw new Error('Esta operación requiere una sesión con organización asignada');
  }
  return ctx.organizacionId;
}

async function withSetLocal<T>(
  tx: Prisma.TransactionClient,
  fn: () => Promise<T>,
): Promise<T> {
  const ctx = getTenantContext();
  if (ctx?.isSuperadmin) {
    await tx.$executeRawUnsafe(`SET LOCAL app.is_superadmin = 'true'`);
  } else if (ctx && Number.isInteger(ctx.organizacionId)) {
    await tx.$executeRawUnsafe(`SET LOCAL app.tenant_id = '${ctx.organizacionId}'`);
  }
  return txActiveStorage.run(true, fn);
}

// tenant.extension.ts NO intercepta $queryRaw/$executeRaw (ver el comentario allí) - este es el
// mismo mecanismo (transacción + SET LOCAL a partir del contexto ambiente) para el puñado de
// sitios que sí necesitan SQL crudo con aislamiento por tenant (hoy solo
// dataloaders.ts#registrosClinicosPorGato).
export async function runTenantScopedRaw<T>(
  prisma: Pick<PrismaClient, '$transaction'>,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction((tx) => withSetLocal(tx, () => fn(tx)));
}

// Para servicios que ya necesitan varias escrituras atómicas en una sola transacción (hoy solo
// registros-clinicos.service.ts#create: actualizar Gato.estadoCer y crear el RegistroClinico
// juntos o ninguno de los dos). `prisma` debe ser el cliente inyectado normal (el extendido, con
// RLS) - las llamadas a tx.<modelo>.<op>() de dentro de `fn` siguen pasando por
// tenant.extension.ts, que ve isTxActive()=true y las deja pasar sin abrir una transacción propia,
// en vez de fragmentar esta transacción en una por cada escritura.
export async function runTenantTransaction<T>(
  prisma: Pick<PrismaClient, '$transaction'>,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction((tx) => withSetLocal(tx, () => fn(tx)));
}
