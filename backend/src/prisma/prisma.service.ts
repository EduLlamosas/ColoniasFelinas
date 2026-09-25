import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// APP_DATABASE_URL es el rol de aplicación restringido (colonias_app, sin privilegios de
// superusuario) creado en la migración multi_tenant_organizaciones - hace falta que sea ESE rol,
// no "postgres" (con el que se conecta `prisma migrate`), para que las políticas RLS se apliquen
// de verdad: un superusuario de Postgres se salta cualquier RLS pase lo que pase. Con el fallback
// a DATABASE_URL el proyecto sigue arrancando si alguien no ha configurado todavía
// APP_DATABASE_URL, pero en ese caso RLS queda desactivada de facto (ver README/notas de
// despliegue) - los tres .env de este repo ya traen APP_DATABASE_URL configurado.
const runtimeDatabaseUrl = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ datasources: { db: { url: runtimeDatabaseUrl } } });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
