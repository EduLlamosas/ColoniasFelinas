import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GraphQLError } from 'graphql';
import * as bcrypt from 'bcrypt';
import type { RolUsuario } from '@prisma/client';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { LoginInput } from './dto/login.input.js';

// El guard de JWT (jwt.strategy.ts) también lanza un 401 cuando el token de una sesión YA
// iniciada es inválido o ha expirado, y @nestjs/apollo traduce cualquier 401 al mismo
// extensions.code genérico (UNAUTHENTICATED) - el frontend usa ese code para mostrar "tu sesión
// ha caducado". Si el login con credenciales incorrectas también usara UnauthorizedException,
// compartiría ese mismo code y el usuario vería "tu sesión ha caducado" al fallar un login,
// aunque nunca hubo sesión que caducar. Por eso aquí se lanza un code distinto a propósito.
function credencialesInvalidas(): GraphQLError {
  return new GraphQLError('Credenciales inválidas', {
    extensions: { code: 'INVALID_CREDENTIALS', http: { status: 401 } },
  });
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async login(data: LoginInput) {
    const usuario = await this.usuariosService.findByEmail(data.email);
    if (!usuario) {
      throw credencialesInvalidas();
    }

    const passwordValida = await bcrypt.compare(data.password, usuario.passwordHash);
    if (!passwordValida) {
      throw credencialesInvalidas();
    }

    return this.buildAuthPayload(usuario);
  }

  private buildAuthPayload(usuario: {
    id: number;
    email: string;
    rol: RolUsuario;
    organizacionId: number | null;
    tokenVersion: number;
  }) {
    const accessToken = this.jwtService.sign({
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      organizacionId: usuario.organizacionId,
      tokenVersion: usuario.tokenVersion,
    });
    return { accessToken, usuario };
  }
}
