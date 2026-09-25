import DataLoader from 'dataloader';
import { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service.js';
import { runTenantScopedRaw } from '../prisma/tenant-context.js';

// Agrupa una lista de filas ya traídas de la base de datos en un Map<clave, filas[]> - el paso
// común a todo loader "N colonias -> sus gatos/comederos/asignaciones" de más abajo, para no
// repetir la misma acumulación a mano en cada uno.
function groupBy<T, K>(rows: T[], keyOf: (row: T) => K): Map<K, T[]> {
  const porClave = new Map<K, T[]>();
  for (const row of rows) {
    const clave = keyOf(row);
    const lista = porClave.get(clave);
    if (lista) lista.push(row);
    else porClave.set(clave, [row]);
  }
  return porClave;
}

// Un DataLoader agrupa, dentro de UNA misma petición GraphQL, todas las llamadas a .load(id) que
// se hagan durante esa petición y las resuelve con una única consulta a la base de datos (batch),
// en vez de una consulta por cada elemento resuelto - así es como se evita el problema N+1 clásico
// de los resolvers de campo (@ResolveField): sin esto, pedir "colonias { gatos { ... } }" para 4
// colonias dispararía 4 consultas SELECT * FROM gatos WHERE colonia_id = X por separado.
//
// Hay que crear una instancia NUEVA de cada loader en CADA petición (nunca reutilizar la misma
// entre peticiones distintas): el caché interno de un DataLoader vive mientras dura, y compartirlo
// entre usuarios distintos filtraría datos de un usuario a la caché que ve otro.
export function createLoaders(prisma: PrismaService) {
  const gatosPorColonia = new DataLoader<number, unknown[]>(async (coloniaIds) => {
    const todos = await prisma.gato.findMany({ where: { coloniaId: { in: [...coloniaIds] } } });
    const porColonia = groupBy(todos, (gato) => gato.coloniaId);
    return coloniaIds.map((id) => porColonia.get(id) ?? []);
  });

  const comederosPorColonia = new DataLoader<number, unknown[]>(async (coloniaIds) => {
    const todos = await prisma.comedero.findMany({ where: { coloniaId: { in: [...coloniaIds] } } });
    const porColonia = groupBy(todos, (comedero) => comedero.coloniaId);
    return coloniaIds.map((id) => porColonia.get(id) ?? []);
  });

  const asignacionesPorColonia = new DataLoader<number, unknown[]>(async (coloniaIds) => {
    const todas = await prisma.asignacionVoluntario.findMany({
      where: { coloniaId: { in: [...coloniaIds] } },
    });
    const porColonia = groupBy(todas, (asignacion) => asignacion.coloniaId);
    return coloniaIds.map((id) => porColonia.get(id) ?? []);
  });

  const voluntarioPorId = new DataLoader<number, unknown | null>(async (voluntarioIds) => {
    const voluntarios = await prisma.voluntario.findMany({
      where: { id: { in: [...voluntarioIds] } },
    });
    const porId = new Map(voluntarios.map((v) => [v.id, v]));
    return voluntarioIds.map((id) => porId.get(id) ?? null);
  });

  const usuarioPorId = new DataLoader<number, unknown | null>(async (usuarioIds) => {
    const usuarios = await prisma.usuario.findMany({ where: { id: { in: [...usuarioIds] } } });
    const porId = new Map(usuarios.map((u) => [u.id, u]));
    return usuarioIds.map((id) => porId.get(id) ?? null);
  });

  // groupBy + _max en vez de traer todas las visitas y quedarnos con la primera en JS: para
  // "última visita de cada comedero" solo hace falta la fecha máxima por grupo, no las filas
  // enteras - Postgres puede calcular eso mucho más barato que transferir todas las visitas.
  const ultimaVisitaPorComedero = new DataLoader<number, Date | null>(async (comederoIds) => {
    const maximos = await prisma.visitaComedero.groupBy({
      by: ['comederoId'],
      where: { comederoId: { in: [...comederoIds] } },
      _max: { createdAt: true },
    });
    const porComedero = new Map(maximos.map((m) => [m.comederoId, m._max.createdAt ?? null]));
    return comederoIds.map((id) => porComedero.get(id) ?? null);
  });

  // "Últimas 3 vacunas de cada gato" (el ejemplo de la memoria, sección 2.2.2). Prisma no tiene
  // una forma nativa de pedir "las N filas más recientes por grupo", pero Postgres sí, vía
  // ROW_NUMBER() OVER (PARTITION BY ...) - así el recorte a 3 lo hace la base de datos, no la
  // aplicación: un gato con un historial clínico largo (años de vacunas/intervenciones) ya no
  // transfiere ni mantiene en memoria ese historial entero para quedarse solo con 3 filas, que es
  // justo el tipo de sobre-petición que esta ronda de cambios busca evitar en el resto del schema.
  const MAX_REGISTROS_RECIENTES = 3;
  interface RegistroClinicoReciente {
    id: number;
    gatoId: number;
    usuarioId: number | null;
    tipo: string;
    fecha: Date;
    diagnostico: string;
    createdAt: Date;
  }

  // SQL puro para mejorar la eficiencia de la operación al solo necesitar 3 registros (con Prisma
  // los traeríamos todos). registros_clinicos lleva RLS (ver migración multi_tenant_organizaciones)
  // - tenant.extension.ts NO intercepta $queryRaw (ver el comentario allí), así que aquí hay que
  // envolver la consulta a mano con runTenantScopedRaw para que el SET LOCAL del organizacionId
  // ambiente corra en la MISMA transacción que esta query, o RLS no dejaría pasar ninguna fila.
  const registrosClinicosPorGato = new DataLoader<number, unknown[]>(async (gatoIds) => {
    const filas = await runTenantScopedRaw(prisma, (tx) =>
      tx.$queryRaw<RegistroClinicoReciente[]>`
        WITH ranked AS (
          SELECT
            id,
            gato_id AS "gatoId",
            usuario_id AS "usuarioId",
            tipo,
            fecha,
            diagnostico,
            created_at AS "createdAt",
            ROW_NUMBER() OVER (PARTITION BY gato_id ORDER BY fecha DESC) AS rn
          FROM registros_clinicos
          WHERE gato_id IN (${Prisma.join([...gatoIds])})
        )
        SELECT id, "gatoId", "usuarioId", tipo, fecha, diagnostico, "createdAt"
        FROM ranked
        WHERE rn <= ${MAX_REGISTROS_RECIENTES}
        ORDER BY "gatoId", fecha DESC
      `,
    );
    const porGato = groupBy(filas, (registro) => registro.gatoId);
    return gatoIds.map((id) => porGato.get(id) ?? []);
  });

  return {
    gatosPorColonia,
    comederosPorColonia,
    asignacionesPorColonia,
    voluntarioPorId,
    usuarioPorId,
    ultimaVisitaPorComedero,
    registrosClinicosPorGato,
  };
}

export type GraphQLLoaders = ReturnType<typeof createLoaders>;

// Forma exacta de lo que devuelve el `context` de GraphQLModule.forRootAsync en app.module.ts -
// tipar esto evita `any` en cada @Context() de cada resolver que necesite los loaders.
export interface GqlContext {
  req: unknown;
  loaders: GraphQLLoaders;
}
