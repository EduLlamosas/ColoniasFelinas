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

  findAll() {
    return this.prisma.asignacionVoluntario.findMany();
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
