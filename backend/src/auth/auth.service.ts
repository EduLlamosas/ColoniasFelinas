import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { RolUsuario } from '@prisma/client';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { RegisterInput } from './dto/register.input.js';
import { LoginInput } from './dto/login.input.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterInput) {
    const usuario = await this.usuariosService.create(data);
    return this.buildAuthPayload(usuario);
  }

  async login(data: LoginInput) {
    const usuario = await this.usuariosService.findByEmail(data.email);
    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValida = await bcrypt.compare(data.password, usuario.passwordHash);
    if (!passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.buildAuthPayload(usuario);
  }

  private buildAuthPayload(usuario: { id: number; email: string; rol: RolUsuario }) {
    const accessToken = this.jwtService.sign({
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    });
    return { accessToken, usuario };
  }
}
