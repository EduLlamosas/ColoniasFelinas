import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { EmailService } from './email.service.js';

@Injectable()
export class SmtpEmailService implements EmailService {
  private readonly transporter: Transporter;
  private readonly remitente: string;

  constructor(config: ConfigService) {
    this.remitente = config.get<string>('SMTP_FROM') ?? 'Colonias Felinas <no-responder@coloniasfelinas.com>';
    this.transporter = createTransport({
      host: config.getOrThrow<string>('SMTP_HOST'),
      port: Number(config.getOrThrow<string>('SMTP_PORT')),
      secure: config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: config.getOrThrow<string>('SMTP_USER'),
        pass: config.getOrThrow<string>('SMTP_PASSWORD'),
      },
    });
  }

  async enviar(destinatario: string, asunto: string, textoPlano: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.remitente,
      to: destinatario,
      subject: asunto,
      text: textoPlano,
    });
  }
}
