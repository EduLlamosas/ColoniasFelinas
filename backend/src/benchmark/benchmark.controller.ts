import { Controller, Get, NotFoundException, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Endpoint REST paralelo que NO forma parte del diseño real de la API - existe únicamente para
// poder comparar, con números reales en vez de teoría, cuánto pesa devolver la MISMA información
// vía REST (objetos completos, sin selección de campos) frente a GraphQL (que sí puede pedir solo
// los campos que hacen falta). Cada endpoint aquí es deliberadamente "ingenuo": devuelve la fila
// completa de Prisma tal cual, igual que haría una API REST típica sin campos opcionales/parciales.
//
// Mismos guards que el resto de la API (JWT + rol) para que la comparación sea justa: ambos lados
// pagan el mismo coste de autenticación por petición.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR, RolUsuario.GESTOR)
@Controller('benchmark')
export class BenchmarkController {
  constructor(private readonly prisma: PrismaService) {}

  // Caso 1: un único objeto pequeño - el caso donde la ventaja de GraphQL es más discutible,
  // porque el ahorro de campos es de unos pocos bytes frente al peso fijo de las cabeceras.
  @Get('gatos/:id')
  async gato(@Param('id', ParseIntPipe) id: number) {
    const gato = await this.prisma.gato.findUnique({ where: { id } });
    if (!gato) throw new NotFoundException(`Gato ${id} no encontrado`);
    return gato;
  }

  @Get('colonias/:id')
  async colonia(@Param('id', ParseIntPipe) id: number) {
    const colonia = await this.prisma.colonia.findUnique({ where: { id } });
    if (!colonia) throw new NotFoundException(`Colonia ${id} no encontrada`);
    return colonia;
  }

  // Estos tres, juntos, son el equivalente REST "granular" de under-fetching: para pintar la
  // ficha de una colonia hacen falta CUATRO peticiones distintas (esta más las tres siguientes),
  // cada una pagando sus propias cabeceras por separado.
  @Get('colonias/:id/gatos')
  gatos(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.gato.findMany({ where: { coloniaId: id } });
  }

  @Get('colonias/:id/comederos')
  comederos(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.comedero.findMany({ where: { coloniaId: id } });
  }

  @Get('colonias/:id/asignaciones')
  asignaciones(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.asignacionVoluntario.findMany({
      where: { coloniaId: id },
      include: { voluntario: true },
    });
  }

  // Caso 2: el diseño REST alternativo a las cuatro peticiones de arriba - un único endpoint que
  // sobre-pide todo de golpe (colonia + gatos completos, cada uno con TODO su historial clínico +
  // comederos + asignaciones con el voluntario anidado) para evitar el under-fetching a costa de
  // over-fetching. Es exactamente el escenario "colonia con su lista de gatos y las últimas
  // vacunas de cada uno" que justifica GraphQL en la memoria (sección 2.2.2) - aquí se puede medir
  // de verdad cuánto pesa esa alternativa frente a la query real de GraphQL.
  @Get('colonias/:id/completa')
  async coloniaCompleta(@Param('id', ParseIntPipe) id: number) {
    const colonia = await this.prisma.colonia.findUnique({
      where: { id },
      include: {
        gatos: { include: { registrosClinicos: true } },
        comederos: { include: { visitas: true } },
        asignaciones: { include: { voluntario: true } },
      },
    });
    if (!colonia) throw new NotFoundException(`Colonia ${id} no encontrada`);
    return colonia;
  }

  // Caso 5: la pregunta que responde este endpoint es "¿podría REST igualar la selección de
  // campos de GraphQL si alguien se molestara en escribirla a mano?" - la respuesta es sí: un
  // único SELECT de Prisma, en un único endpoint, con los MISMOS campos que la variante "GraphQL -
  // selección mínima" de más abajo (ni uno más). Es el REST "pulido" con el que se puede comparar
  // en igualdad de condiciones: misma colonia, mismos campos, una sola petición en los dos lados.
  // El coste de tenerlo así de pulido: hay que escribir y mantener un endpoint (o un parámetro de
  // "fields" a medida) por cada combinación de pantalla que exista - GraphQL da esa selección
  // gratis para cualquier combinación, sin tocar el servidor.
  @Get('colonias/:id/completa-minima')
  async coloniaCompletaMinima(@Param('id', ParseIntPipe) id: number) {
    const colonia = await this.prisma.colonia.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        gatos: { select: { id: true, coloniaId: true, nombre: true, estadoCer: true, fotoUrl: true } },
        comederos: { select: { id: true, coloniaId: true, ubicacionDetallada: true } },
        asignaciones: { select: { voluntarioId: true, coloniaId: true, rolAsignado: true } },
      },
    });
    if (!colonia) throw new NotFoundException(`Colonia ${id} no encontrada`);
    return colonia;
  }
}
