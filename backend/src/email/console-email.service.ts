import { Injectable, Logger } from '@nestjs/common';
import type { EmailService } from './email.service.js';

// Solo para desarrollo local sin credenciales SMTP configuradas (ver email.module.ts) - un
// despliegue real usa SmtpEmailService. Deja el correo entero en el log en vez de mandarlo de
// verdad, para poder probar el flujo de verificación de email sin una cuenta de correo real.
@Injectable()
export class ConsoleEmailService implements EmailService {
  private readonly logger = new Logger(ConsoleEmailService.name);

  async enviar(destinatario: string, asunto: string, textoPlano: string): Promise<void> {
    this.logger.warn(
      `[SMTP no configurado - correo NO enviado de verdad]\nPara: ${destinatario}\nAsunto: ${asunto}\n\n${textoPlano}`,
    );
  }
}
