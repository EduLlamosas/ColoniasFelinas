import { randomBytes } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RolUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { runAsSuperadmin } from '../prisma/tenant-context.js';
import { EMAIL_SERVICE, type EmailService } from '../email/email.service.js';
import { SolicitarOrganizacionInput } from './dto/solicitar-organizacion.input.js';
import { RegistrarParticularInput } from './dto/registrar-particular.input.js';

const SALT_ROUNDS = 10;
const TOKEN_VERIFICACION_BYTES = 32;
const TOKEN_VERIFICACION_TTL_HORAS = 24;

// URL del frontend a la que apunta el enlace del email de verificación - no hay redirección desde
// el backend, el email manda directo al frontend con el token como query param.
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

@Injectable()
export class RegistroPublicoService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_SERVICE) private readonly email: EmailService,
  ) {}

  // Sin autenticación (ver RegistroPublicoResolver) - solo el nombre/slug de organizaciones
  // ACTIVAS, para el desplegable "elige tu ayuntamiento" del formulario de particulares.
  // runAsSuperadmin porque quien pregunta todavía no tiene ningún tenant_id (es un visitante
  // anónimo) y la política RLS de "organizaciones" exige is_superadmin o id=tenant_id para poder
  // leer ninguna fila en absoluto - ver el comentario de esa política en la migración.
  organizacionesPublicas() {
    return runAsSuperadmin(() =>
      this.prisma.organizacion.findMany({
        where: { activo: true },
        select: { id: true, nombre: true, slug: true },
        orderBy: { nombre: 'asc' },
      }),
    );
  }

  // Crea solo la SOLICITUD (ver SolicitudOrganizacion) - un superadmin la revisa a mano y decide
  // si de verdad da de alta la Organizacion (OrganizacionesService#aprobarSolicitud). Esta
  // mutación es pública y sin guard, así que nunca crea nada sobre las tablas reales.
  solicitarOrganizacion(data: SolicitarOrganizacionInput) {
    return runAsSuperadmin(() =>
      this.prisma.solicitudOrganizacion.create({ data }).catch(handlePrismaError),
    );
  }

  // Cuenta PARTICULAR: sin verificar email todavía (Usuario.emailVerificado empieza en false),
  // ligada a la organización que eligió por su slug. runAsSuperadmin por el mismo motivo que
  // organizacionesPublicas (sin tenant_id todavía) - crear el Usuario en sí lo permite la política
  // de "usuarios" porque is_superadmin la salta entera (ver migración multi_tenant_organizaciones).
  async registrarParticular(data: RegistrarParticularInput) {
    const organizacion = await runAsSuperadmin(() =>
      this.prisma.organizacion.findUnique({ where: { slug: data.organizacionSlug } }),
    );
    if (!organizacion || !organizacion.activo) {
      throw new BadRequestException('La organización indicada no existe o no está activa');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const tokenVerificacionEmail = randomBytes(TOKEN_VERIFICACION_BYTES).toString('base64url');
    const tokenVerificacionExpira = new Date(
      Date.now() + TOKEN_VERIFICACION_TTL_HORAS * 60 * 60 * 1000,
    );

    const usuario = await runAsSuperadmin(() =>
      this.prisma.usuario
        .create({
          data: {
            email: data.email,
            passwordHash,
            nombreCompleto: data.nombreCompleto,
            rol: RolUsuario.PARTICULAR,
            organizacionId: organizacion.id,
            emailVerificado: false,
            tokenVerificacionEmail,
            tokenVerificacionExpira,
          },
        })
        .catch(handlePrismaError),
    );

    const enlace = `${FRONTEND_URL}/verificar-email?token=${tokenVerificacionEmail}`;
    await this.email.enviar(
      usuario.email,
      'Verifica tu email - Colonias Felinas',
      `Hola ${usuario.nombreCompleto},\n\n` +
        `Para activar tu cuenta y poder aportar colonias, confirma tu email en el siguiente enlace ` +
        `(caduca en ${TOKEN_VERIFICACION_TTL_HORAS} horas):\n\n${enlace}\n\n` +
        `Si no has solicitado esta cuenta, puedes ignorar este correo.`,
    );

    return { email: usuario.email, emailVerificacionEnviado: true };
  }

  async verificarEmail(token: string): Promise<boolean> {
    const usuario = await runAsSuperadmin(() =>
      this.prisma.usuario.findUnique({ where: { tokenVerificacionEmail: token } }),
    );
    if (!usuario) {
      throw new BadRequestException('Enlace de verificación inválido o ya utilizado');
    }
    if (!usuario.tokenVerificacionExpira || usuario.tokenVerificacionExpira < new Date()) {
      throw new BadRequestException('Enlace de verificación caducado');
    }

    await runAsSuperadmin(() =>
      this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { emailVerificado: true, tokenVerificacionEmail: null, tokenVerificacionExpira: null },
      }),
    );
    return true;
  }
}
