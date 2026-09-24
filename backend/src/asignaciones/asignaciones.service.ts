import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { CreateAsignacionInput } from './dto/create-asignacion.input.js';
import { UpdateAsignacionInput } from './dto/update-asignacion.input.js';

@Injectable()
export class AsignacionesService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateAsignacionInput) {
    return this.prisma.asignacionVoluntario.create({ data }).catch(handlePrismaError);
  }

  findAll(coloniaId?: number, voluntarioId?: number) {
    // Prisma trata un where "{}" igual que "undefined" (sin filtrar), así que no hace falta
    // comprobar aparte si quedó vacío - mismo patrón de un filtro opcional que gatos.service.ts y
    // comederos.service.ts, extendido a los dos filtros independientes que tiene esta entidad.
    return this.prisma.asignacionVoluntario.findMany({
      where: { ...(coloniaId !== undefined && { coloniaId }), ...(voluntarioId !== undefined && { voluntarioId }) },
    });
  }

  async findOne(voluntarioId: number, coloniaId: number) {
    const asignacion = await this.prisma.asignacionVoluntario.findUnique({
      where: { voluntarioId_coloniaId: { voluntarioId, coloniaId } },
    });
    if (!asignacion) {
      throw new NotFoundException('Asignación no encontrada');
    }
    return asignacion;
  }

  async update(voluntarioId: number, coloniaId: number, data: UpdateAsignacionInput) {
    await this.findOne(voluntarioId, coloniaId);
    return this.prisma.asignacionVoluntario
      .update({ where: { voluntarioId_coloniaId: { voluntarioId, coloniaId } }, data })
      .catch(handlePrismaError);
  }

  async remove(voluntarioId: number, coloniaId: number) {
    await this.findOne(voluntarioId, coloniaId);
    return this.prisma.asignacionVoluntario
      .delete({
        where: { voluntarioId_coloniaId: { voluntarioId, coloniaId } },
      })
      .catch(handlePrismaError);
  }
}
