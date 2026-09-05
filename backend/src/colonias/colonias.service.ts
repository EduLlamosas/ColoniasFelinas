import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { deleteUploadedFile } from '../uploads/uploaded-file.util.js';
import { CreateColoniaInput } from './dto/create-colonia.input.js';
import { UpdateColoniaInput } from './dto/update-colonia.input.js';

@Injectable()
export class ColoniasService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateColoniaInput) {
    return this.prisma.colonia.create({ data }).catch(handlePrismaError);
  }

  findAll() {
    return this.prisma.colonia.findMany();
  }

  async findOne(id: string) {
    const colonia = await this.prisma.colonia.findUnique({ where: { id: Number(id) } });
    if (!colonia) {
      throw new NotFoundException(`Colonia ${id} no encontrada`);
    }
    return colonia;
  }

  async update(id: string, data: UpdateColoniaInput) {
    const previous = await this.findOne(id);
    const updated = await this.prisma.colonia
      .update({ where: { id: Number(id) }, data })
      .catch(handlePrismaError);
    if (data.fotoUrl !== undefined && data.fotoUrl !== previous.fotoUrl) {
      await deleteUploadedFile(previous.fotoUrl);
    }
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const removed = await this.prisma.colonia.delete({ where: { id: Number(id) } }).catch(handlePrismaError);
    await deleteUploadedFile(removed.fotoUrl);
    return removed;
  }
}
