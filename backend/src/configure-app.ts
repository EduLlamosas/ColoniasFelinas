import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

// Todo lo que la app real necesita al arrancar, en un único sitio: tanto
// main.ts como los tests e2e (que NUNCA pasan por main.ts, montan su propia
// INestApplication directamente desde AppModule) llaman a esto, para que no
// puedan quedar desincronizados entre sí.
export function configureApp(app: NestExpressApplication) {
  const uploadsDir = join(process.cwd(), 'uploads');
  mkdirSync(uploadsDir, { recursive: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  // Desarrollo: el frontend (Vite, otro puerto) y el backend son orígenes
  // distintos para el navegador. Sin esto, cualquier fetch/GraphQL request
  // desde el frontend falla por CORS antes de llegar siquiera al resolver.
  // Reflejar el origen de la petición (en vez de "*") es lo que permite
  // además mandar la cabecera Authorization.
  app.enableCors({ origin: true, credentials: true });
}
