import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMAIL_SERVICE } from './email.service.js';
import { SmtpEmailService } from './smtp-email.service.js';
import { ConsoleEmailService } from './console-email.service.js';

// Mismo patrón que StorageModule: la implementación se decide UNA vez al arrancar, según si hay
// credenciales SMTP completas en el entorno. Sin ellas, cae a ConsoleEmailService (deja el correo
// en el log) para poder desarrollar/probar sin una cuenta de correo real.
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EMAIL_SERVICE,
      useFactory: (config: ConfigService) => {
        const tieneCredencialesSmtp = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'].every(
          (clave) => !!config.get<string>(clave),
        );
        return tieneCredencialesSmtp ? new SmtpEmailService(config) : new ConsoleEmailService();
      },
      inject: [ConfigService],
    },
  ],
  exports: [EMAIL_SERVICE],
})
export class EmailModule {}
