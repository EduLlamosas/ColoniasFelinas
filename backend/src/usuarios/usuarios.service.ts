import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';

const SALT_ROUNDS = 10;

interface CreateUsuarioData {
  email: string;
  password: string;
  nombreCompleto: string;
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
          rol: 'GESTOR',
        },
      })
      .catch(handlePrismaError);
  }

  findByEmail(email: string) {
    return this.prisma.usuario.findUnique({ where: { email } });
  }

  findById(id: number) {
    return this.prisma.usuario.findUnique({ where: { id } });
  }
}
