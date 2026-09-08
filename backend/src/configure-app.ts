import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

// Todo lo que la app real necesita al arrancar, en un único sitio: tanto
// main.ts como los tests e2e (que NUNCA pasan por main.ts, montan su propia
// INestApplication directamente desde AppModule) llaman a esto, para que no
// puedan quedar desincronizados entre sí.
export function configureApp(app: NestExpressApplication) {
  const uploadsDir = join(process.cwd(), 'uploads');
  mkdirSync(uploadsDir, { recursive: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  // contentSecurityPolicy: false porque esta API no sirve HTML propio (solo GraphQL/JSON y
  // los estáticos de /uploads/) - el CSP por defecto de helmet solo protegería un documento
  // que nunca existe aquí, y de paso podría romper el Apollo Sandbox de desarrollo.
  // crossOriginResourcePolicy en "cross-origin" porque el valor por defecto ("same-origin") no
  // es lo mismo que CORS: bloquearía las <img> del frontend cargando fotos desde /uploads/ en
  // el despliegue de dos dominios (coloniasfelinas.com pidiendo a api.coloniasfelinas.com),
  // aunque enableCors ya esté bien configurado - CORS no cubre a las etiquetas <img>.
  // hsts solo en producción: helmet la manda igual aunque la conexión sea HTTP, y un navegador
  // que la reciba una vez en local (sin TLS) intenta forzar HTTPS en la siguiente visita a
  // localhost y se queda fuera hasta limpiarla a mano - en producción, detrás de Caddy con
  // HTTPS real, es pura ganancia.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: process.env.NODE_ENV === 'production',
    }),
  );

  // Desarrollo: el frontend (Vite, otro puerto) y el backend son orígenes
  // distintos para el navegador. Sin esto, cualquier fetch/GraphQL request
  // desde el frontend falla por CORS antes de llegar siquiera al resolver.
  // Reflejar el origen de la petición (en vez de "*") es lo que permite
  // además mandar la cabecera Authorization.
  app.enableCors({ origin: true, credentials: true });
}
