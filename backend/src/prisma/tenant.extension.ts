import { Prisma, type PrismaClient } from '@prisma/client';
import { getTenantContext, isTxActive } from './tenant-context.js';

// SET LOCAL solo dura lo que dura la transacción en la que se ejecuta - por eso una operación de
// modelo "suelta" (no ya dentro de una transacción abierta a mano, ver isTxActive) se reenvuelve
// en su propia transacción de una sola sentencia, con el SET justo antes. Postgres no acepta
// parámetros ($1) como valor de un SET, así que el organizacionId se interpola como string -
// seguro solo porque viene siempre de nuestro propio JWT ya validado (nunca de un argumento
// GraphQL del cliente) y aquí se comprueba explícitamente que es un entero antes.
//
// Si isTxActive() es true, significa que el código que llamó a esta operación ya está dentro de
// una transacción abierta por runTenantTransaction() (ver tenant-context.ts) que YA aplicó su
// propio SET LOCAL al principio - aquí basta con dejar pasar la operación tal cual (query(args)),
// Prisma la enruta sola a esa misma transacción. Sin esta comprobación, una escritura atómica de
// varios pasos (p.ej. registros-clinicos.service.ts#create) se fragmentaría en una transacción por
// cada paso, rompiendo su atomicidad.
//
// Deliberadamente NO intercepta $queryRaw/$executeRaw (operaciones sin "model"): la forma en la
// que Prisma expone los argumentos de una consulta cruda a una extensión no es la misma que la de
// una operación de modelo, y reconstruirla aquí de forma genérica sería frágil. El único sitio del
// código que usa SQL crudo (dataloaders.ts, registrosClinicosPorGato) se envuelve él mismo con el
// mismo mecanismo (ver runTenantScopedRaw en tenant-context.ts) - si en el futuro aparece otro
// `$queryRaw` suelto sin envolver, RLS lo deniega todo por defecto (fail closed), no lo deja pasar
// sin filtro.
export function tenantExtension(basePrisma: PrismaClient) {
  return Prisma.defineExtension({
    name: 'tenant-rls',
    query: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || isTxActive()) return query(args);

        const ctx = getTenantContext();

        return basePrisma.$transaction(async (tx) => {
          if (ctx?.isSuperadmin) {
            await tx.$executeRawUnsafe(`SET LOCAL app.is_superadmin = 'true'`);
          } else if (ctx && Number.isInteger(ctx.organizacionId)) {
            await tx.$executeRawUnsafe(`SET LOCAL app.tenant_id = '${ctx.organizacionId}'`);
          }
          // Si no hay contexto en absoluto (nadie llamó a runWithTenantContext/runAsSuperadmin),
          // no se fija nada - RLS deniega todas las filas por defecto, no es un bypass silencioso.

          const delegate = (tx as unknown as Record<string, Record<string, (a: unknown) => unknown>>)[
            model.charAt(0).toLowerCase() + model.slice(1)
          ];
          return delegate[operation](args);
        });
      },
    },
  });
}
