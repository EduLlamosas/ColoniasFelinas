import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { RolUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { runAsSuperadmin } from '../prisma/tenant-context.js';

const SALT_ROUNDS = 10;

interface CreateUsuarioData {
  email: string;
  password: string;
  nombreCompleto: string;
  rol: RolUsuario;
  // null solo para el superadmin del propio SaaS (ver seed.ts) - toda alta normal (invitación de
  // un ADMINISTRADOR a su propia organización, o el primer admin de una organización nueva) manda
  // un id real.
  organizacionId: number | null;
}

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUsuarioData) {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    return this.prisma.usuario
      .create({
        data: {
          email: data.email,
          passwordHash,
          nombreCompleto: data.nombreCompleto,
          rol: data.rol,
          organizacionId: data.organizacionId,
        },
      })
      .catch(handlePrismaError);
  }

  // Superadmin a propósito: login necesita encontrar un usuario por email ANTES de saber a qué
  // organización pertenece (es lo que la propia consulta está intentando averiguar), y esta tabla
  // lleva RLS - sin esto, un email real de OTRA organización a la que nadie ha iniciado sesión
  // todavía devolvería "no encontrado" en vez de comprobar la contraseña. Ver tenant-context.ts.
  findByEmail(email: string) {
    return runAsSuperadmin(() => this.prisma.usuario.findUnique({ where: { email } }));
  }

  // Mismo motivo que findByEmail: lo usa JwtStrategy.validate() en CADA petición autenticada,
  // antes de que TenantContextInterceptor llegue a fijar el contexto de tenant de esa petición.
  findById(id: number) {
    return runAsSuperadmin(() => this.prisma.usuario.findUnique({ where: { id } }));
  }

  // Sin runAsSuperadmin a propósito: dentro de una petición normal ya autenticada, RLS filtra
  // solo a los usuarios de la propia organización de quien pregunta.
  findAll() {
    return this.prisma.usuario.findMany({ orderBy: { nombreCompleto: 'asc' } });
  }
}
