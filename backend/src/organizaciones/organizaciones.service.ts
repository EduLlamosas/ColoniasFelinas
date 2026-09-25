import { randomBytes } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { EstadoSolicitud, RolUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { runAsSuperadmin, runTenantTransaction } from '../prisma/tenant-context.js';
import { EMAIL_SERVICE, type EmailService } from '../email/email.service.js';
import { CreateOrganizacionInput } from './dto/create-organizacion.input.js';

const SALT_ROUNDS = 10;
// 12 bytes en base64url ~ 16 caracteres, suficiente para una contraseña temporal de un solo uso
// que el superadmin transmite él mismo al primer admin del ayuntamiento (no hay envío de email
// automático en este proyecto todavía - ver comentario en OrganizacionCreada).
const TEMP_PASSWORD_BYTES = 12;

@Injectable()
export class OrganizacionesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_SERVICE) private readonly email: EmailService,
  ) {}

  findAll() {
    return runAsSuperadmin(() =>
      this.prisma.organizacion.findMany({ orderBy: { nombre: 'asc' } }),
    );
  }

  // Alta de un ayuntamiento nuevo: crea la Organizacion y su primer usuario (ADMINISTRADOR) juntos
  // o ninguno de los dos (runTenantTransaction) - siempre como superadmin, porque por definición
  // todavía no existe la organización sobre la que fijar un contexto de tenant normal.
  async crear(data: CreateOrganizacionInput) {
    const adminPasswordTemporal = randomBytes(TEMP_PASSWORD_BYTES).toString('base64url');
    const passwordHash = await bcrypt.hash(adminPasswordTemporal, SALT_ROUNDS);

    const organizacion = await runAsSuperadmin(() =>
      runTenantTransaction(this.prisma, async (tx) => {
        const org = await tx.organizacion
          .create({ data: { nombre: data.nombre, slug: data.slug } })
          .catch(handlePrismaError);
        await tx.usuario
          .create({
            data: {
              email: data.adminEmail,
              passwordHash,
              nombreCompleto: data.adminNombre,
              rol: RolUsuario.ADMINISTRADOR,
              organizacionId: org.id,
            },
          })
          .catch(handlePrismaError);
        return org;
      }),
    );

    return { organizacion, adminPasswordTemporal };
  }

  // Sin filtro por defecto (el superadmin quiere poder ver el historial completo, no solo las
  // pendientes) - el frontend es quien decide si arranca mostrando solo PENDIENTE.
  solicitudes(estado?: EstadoSolicitud) {
    return runAsSuperadmin(() =>
      this.prisma.solicitudOrganizacion.findMany({
        where: estado ? { estado } : undefined,
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  private async solicitudPendiente(id: number) {
    const solicitud = await runAsSuperadmin(() =>
      this.prisma.solicitudOrganizacion.findUnique({ where: { id } }),
    );
    if (!solicitud) {
      throw new NotFoundException(`Solicitud ${id} no encontrada`);
    }
    if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
      throw new BadRequestException('Esta solicitud ya ha sido resuelta');
    }
    return solicitud;
  }

  // Aprobar: da de alta la Organizacion + su primer ADMINISTRADOR (misma transacción que crear())
  // y, a diferencia de crear() (que asume que el superadmin transmite la contraseña él mismo a
  // mano), aquí SÍ hay un email real de contacto de la propia solicitud - se le manda la
  // contraseña temporal por correo en vez de devolverla en la respuesta de la mutación.
  async aprobarSolicitud(id: number) {
    const solicitud = await this.solicitudPendiente(id);
    const adminPasswordTemporal = randomBytes(TEMP_PASSWORD_BYTES).toString('base64url');
    const passwordHash = await bcrypt.hash(adminPasswordTemporal, SALT_ROUNDS);

    const organizacion = await runAsSuperadmin(() =>
      runTenantTransaction(this.prisma, async (tx) => {
        const org = await tx.organizacion
          .create({ data: { nombre: solicitud.nombre, slug: solicitud.slug } })
          .catch(handlePrismaError);
        await tx.usuario
          .create({
            data: {
              email: solicitud.contactoEmail,
              passwordHash,
              nombreCompleto: solicitud.contactoNombre,
              rol: RolUsuario.ADMINISTRADOR,
              organizacionId: org.id,
            },
          })
          .catch(handlePrismaError);
        await tx.solicitudOrganizacion.update({
          where: { id: solicitud.id },
          data: { estado: EstadoSolicitud.APROBADA, organizacionCreadaId: org.id },
        });
        return org;
      }),
    );

    await this.email.enviar(
      solicitud.contactoEmail,
      'Tu organización ha sido aprobada - Colonias Felinas',
      `Hola ${solicitud.contactoNombre},\n\n` +
        `Tu solicitud para "${solicitud.nombre}" ha sido aprobada. Ya puedes iniciar sesión con ` +
        `estas credenciales:\n\nEmail: ${solicitud.contactoEmail}\nContraseña temporal: ${adminPasswordTemporal}\n\n` +
        `Te recomendamos cambiarla en cuanto inicies sesión.`,
    );

    return organizacion;
  }

  async rechazarSolicitud(id: number, motivo?: string) {
    const solicitud = await this.solicitudPendiente(id);
    await runAsSuperadmin(() =>
      this.prisma.solicitudOrganizacion.update({
        where: { id: solicitud.id },
        data: { estado: EstadoSolicitud.RECHAZADA },
      }),
    );

    await this.email.enviar(
      solicitud.contactoEmail,
      'Sobre tu solicitud de alta - Colonias Felinas',
      `Hola ${solicitud.contactoNombre},\n\n` +
        `Tu solicitud para "${solicitud.nombre}" no ha sido aprobada.` +
        (motivo ? `\n\nMotivo: ${motivo}` : '') +
        `\n\nSi crees que es un error, puedes responder a este correo.`,
    );

    return true;
  }
}
