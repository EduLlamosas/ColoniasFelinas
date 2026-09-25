import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { tenantExtension } from './tenant.extension.js';

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      // Todo el resto de la app inyecta PrismaService y espera un cliente con RLS aplicada de
      // verdad, así que el token PrismaService se resuelve aquí al cliente YA EXTENDIDO con
      // tenant.extension.ts, no al PrismaClient en crudo - ningún servicio de negocio necesita
      // saber que existe la extensión, solo usan `this.prisma.<modelo>.<op>()` como siempre.
      //
      // Nest identifica los hooks de ciclo de vida (onModuleInit/onModuleDestroy) por duck typing
      // sobre la instancia YA resuelta, no por su cadena de prototipos - $extends() devuelve un
      // objeto nuevo que no los lleva consigo, así que se re-adjuntan aquí a mano, delegando en el
      // cliente base real (que es el que de verdad abre/cierra la conexión a Postgres).
      useFactory: () => {
        const base = new PrismaService();
        const extended = base.$extends(tenantExtension(base));
        return Object.assign(extended, {
          onModuleInit: () => base.onModuleInit(),
          onModuleDestroy: () => base.onModuleDestroy(),
        }) as unknown as PrismaService;
      },
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
