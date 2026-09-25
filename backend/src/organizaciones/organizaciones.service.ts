import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RolUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { runAsSuperadmin, runTenantTransaction } from '../prisma/tenant-context.js';
import { CreateOrganizacionInput } from './dto/create-organizacion.input.js';

const SALT_ROUNDS = 10;
// 12 bytes en base64url ~ 16 caracteres, suficiente para una contraseña temporal de un solo uso
// que el superadmin transmite él mismo al primer admin del ayuntamiento (no hay envío de email
// automático en este proyecto todavía - ver comentario en OrganizacionCreada).
const TEMP_PASSWORD_BYTES = 12;

@Injectable()
export class OrganizacionesService {
  constructor(private readonly prisma: PrismaService) {}

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
}
