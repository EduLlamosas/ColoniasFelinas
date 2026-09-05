import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { configureApp } from '../../src/configure-app.js';

export async function bootstrapApp() {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  const prisma = moduleFixture.get(PrismaService);

  return { app, prisma };
}
