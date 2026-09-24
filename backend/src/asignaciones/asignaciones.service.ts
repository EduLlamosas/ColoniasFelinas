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

  async findOne(id: string) {
    const asignacion = await this.prisma.asignacionVoluntario.findUnique({ where: { id: Number(id) } });
    if (!asignacion) {
      throw new NotFoundException(`Asignación ${id} no encontrada`);
    }
    return asignacion;
  }

  async update(id: string, data: UpdateAsignacionInput) {
    await this.findOne(id);
    return this.prisma.asignacionVoluntario
      .update({ where: { id: Number(id) }, data })
      .catch(handlePrismaError);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.asignacionVoluntario.delete({ where: { id: Number(id) } }).catch(handlePrismaError);
  }
}
