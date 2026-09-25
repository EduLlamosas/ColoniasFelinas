import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_SERVICE } from './storage.service.js';
import { S3StorageService } from './s3-storage.service.js';
import { LocalStorageService } from './local-storage.service.js';
import { MediaService } from './media.service.js';

// Global: cualquier módulo que necesite subir/borrar un fichero (uploads, colonias, gatos,
// comederos, voluntarios) inyecta STORAGE_SERVICE sin tener que importar este módulo caso a caso.
//
// La implementación se decide UNA vez, al arrancar, según si hay credenciales de OVH completas en
// el entorno - no en cada subida. Sin ellas, cae a LocalStorageService (disco local) para poder
// seguir desarrollando sin depender de una cuenta de OVH real; en un despliegue de verdad,
// OVH_S3_* debe estar siempre configurado (ver .env.docker).
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_SERVICE,
      useFactory: (config: ConfigService) => {
        const tieneCredencialesOvh = ['OVH_S3_BUCKET', 'OVH_S3_ENDPOINT', 'OVH_S3_REGION', 'OVH_S3_ACCESS_KEY_ID', 'OVH_S3_SECRET_ACCESS_KEY'].every(
          (clave) => !!config.get<string>(clave),
        );
        return tieneCredencialesOvh ? new S3StorageService(config) : new LocalStorageService(config);
      },
      inject: [ConfigService],
    },
    MediaService,
  ],
  exports: [STORAGE_SERVICE, MediaService],
})
export class StorageModule {}
