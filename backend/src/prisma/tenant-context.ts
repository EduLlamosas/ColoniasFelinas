import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma, PrismaClient, RolUsuario } from '@prisma/client';

export interface TenantContext {
  // null cuando isSuperadmin es true (el operador del SaaS no pertenece a ninguna organización).
  organizacionId: number | null;
  isSuperadmin: boolean;
  // usuarioId/rol: null fuera de una petición autenticada real (login, código de sistema vía
  // runAsSuperadmin). Las políticas RLS de aportaciones_colonia/aportaciones_gato los necesitan
  // para que un PARTICULAR solo vea SUS PROPIAS aportaciones dentro de su organización - el resto
  // de tablas solo necesitan organizacionId/isSuperadmin porque un ADMINISTRADOR/GESTOR siempre
  // ve todo lo de su organización, pero un PARTICULAR nunca ve lo de otro PARTICULAR aunque sea
  // de la misma organización.
  usuarioId: number | null;
  rol: RolUsuario | null;
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

// Middleware global (ver configure-app.ts) - abre UNA zona de AsyncLocalStorage que cubre la
// petición HTTP entera, desde antes de que exista ningún JWT validado hasta la última resolución
// de campo anidado vía DataLoader. Hace falta a este nivel, no en un interceptor por-handler:
// Apollo resuelve los campos anidados (colonia.gatos, registroClinico.usuario...) en una fase
// POSTERIOR a que el resolver de nivel superior devuelva su propio valor - envolver solo esa
// llamada (lo que hacía antes TenantContextInterceptor con runWithTenantContext) deja fuera esa
// fase posterior, y el batch de un DataLoader pierde el contexto por completo.
//
// El store es el MISMO objeto durante toda la zona: TenantContextInterceptor no abre una zona
// nueva, MUTA los campos de este objeto (ver setTenantContext) en cuanto sabe quién es el usuario
// - así todo lo que lea el contexto más tarde en la misma petición (incluido el batch de un
// DataLoader, que no se dispara hasta el siguiente tick) ve el valor ya actualizado.
export function tenantContextMiddleware(_req: unknown, _res: unknown, next: () => void): void {
  storage.run({ organizacionId: null, isSuperadmin: false, usuarioId: null, rol: null }, next);
}

// Rellena el store YA ABIERTO por tenantContextMiddleware con el organizacionId real del JWT
// validado (ver TenantContextInterceptor). Si no hay zona activa (código que corre fuera de una
// petición HTTP real - no debería pasar en producción) no hace nada, en vez de crear una zona
// nueva que nadie más vería.
export function setTenantContext(context: TenantContext): void {
  const store = storage.getStore();
  if (!store) return;
  store.organizacionId = context.organizacionId;
  store.isSuperadmin = context.isSuperadmin;
  store.usuarioId = context.usuarioId;
  store.rol = context.rol;
}

// Las llamadas de modelo de Prisma (prisma.usuario.create(...), etc.) son perezosas: NO ejecutan
// nada hasta que alguien hace `await`/`.then()` sobre ellas (es lo que permite agruparlas sin
// ejecutar en un array pasado a $transaction([...])). storage.run(context, fn) solo mantiene el
// contexto de AsyncLocalStorage activo mientras `fn` se ejecuta de forma SÍNCRONA - si `fn` se
// limita a hacer `return prisma.modelo.create(...)` sin await, esa llamada todavía no ha
// arrancado de verdad cuando `fn` termina y la zona se cierra; tenant.extension.ts no ve el
// contexto hasta que quien llama por fuera hace `await` sobre el resultado, momento en el que ya
// es demasiado tarde. "Despertar" el resultado con un .then() vacío, todavía dentro de storage.run,
// fuerza a Prisma a arrancar la consulta de verdad mientras el contexto sigue activo - sin exigir
// que cada sitio que llama a runWithTenantContext/runAsSuperadmin escriba `async () => await ...`.
function kick<T>(result: T): T {
  if (result && typeof (result as { then?: unknown }).then === 'function') {
    (result as unknown as Promise<unknown>).then(
      () => undefined,
      () => undefined,
    );
  }
  return result;
}

export function runWithTenantContext<T>(context: TenantContext, fn: () => T): T {
  return storage.run(context, () => kick(fn()));
}

// Para el puñado de operaciones de sistema que, por diseño, se ejecutan ANTES de que exista
// ningún JWT validado (login busca el usuario por email antes de saber quién es; JwtStrategy
// comprueba tokenVersion antes de que TenantContextInterceptor llegue a correr; la alta de una
// organización nueva es, por definición, una operación sin organización todavía). Son los únicos
// sitios del código de aplicación donde se usa esto - todo lo demás pasa por
// TenantContextInterceptor con el organizacionId real del JWT.
export function runAsSuperadmin<T>(fn: () => T): T {
  return storage.run({ organizacionId: null, isSuperadmin: true, usuarioId: null, rol: null }, () =>
    kick(fn()),
  );
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
  // usuario_id/es_particular: solo las políticas de aportaciones_colonia/aportaciones_gato los
  // leen (ver comentario en TenantContext) - fijarlos siempre que haya un usuario en sesión no
  // afecta a ninguna otra política, que ni los mira.
  if (ctx && Number.isInteger(ctx.usuarioId)) {
    await tx.$executeRawUnsafe(`SET LOCAL app.usuario_id = '${ctx.usuarioId}'`);
  }
  if (ctx?.rol === 'PARTICULAR') {
    await tx.$executeRawUnsafe(`SET LOCAL app.es_particular = 'true'`);
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
