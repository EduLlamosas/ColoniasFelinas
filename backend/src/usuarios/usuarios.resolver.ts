import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';
import { UsuariosService } from './usuarios.service.js';
import { Usuario } from './entities/usuario.entity.js';
import { CreateUsuarioInput } from './dto/create-usuario.input.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { requireTenantId } from '../prisma/tenant-context.js';

@Resolver(() => Usuario)
export class UsuariosResolver {
  constructor(private readonly usuariosService: UsuariosService) {}

  @UseGuards(JwtAuthGuard)
  @Query(() => Usuario, { name: 'me' })
  me(@CurrentUser() user: JwtPayload) {
    return this.usuariosService.findById(user.sub);
  }

  // Solo los usuarios de la propia organización de quien pregunta - lo filtra RLS, no un `where`
  // explícito aquí (ver UsuariosService.findAll).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMINISTRADOR)
  @Query(() => [Usuario], { name: 'usuarios' })
  findAll() {
    return this.usuariosService.findAll();
  }

  // Reemplaza al antiguo auto-registro público (ver auth.resolver.ts): solo un ADMINISTRADOR
  // puede dar de alta cuentas, y siempre dentro de SU PROPIA organización - organizacionId sale
  // de requireTenantId() (el JWT de quien llama), nunca de nada que mande el cliente en `data`.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMINISTRADOR)
  @Mutation(() => Usuario)
  crearUsuario(@Args('data') data: CreateUsuarioInput) {
    return this.usuariosService.create({ ...data, organizacionId: requireTenantId() });
  }
}
