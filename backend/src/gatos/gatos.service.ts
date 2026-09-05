import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { deleteUploadedFile } from '../uploads/uploaded-file.util.js';
import { CreateGatoInput } from './dto/create-gato.input.js';
import { UpdateGatoInput } from './dto/update-gato.input.js';

@Injectable()
export class GatosService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateGatoInput) {
    return this.prisma.gato.create({ data }).catch(handlePrismaError);
  }

  findAll() {
    return this.prisma.gato.findMany();
  }

  async findOne(id: string) {
    const gato = await this.prisma.gato.findUnique({ where: { id: Number(id) } });
    if (!gato) {
      throw new NotFoundException(`Gato ${id} no encontrado`);
    }
    return gato;
  }

  async update(id: string, data: UpdateGatoInput) {
    const previous = await this.findOne(id);
    const updated = await this.prisma.gato
      .update({ where: { id: Number(id) }, data })
      .catch(handlePrismaError);
    if (data.fotoUrl !== undefined && data.fotoUrl !== previous.fotoUrl) {
      await deleteUploadedFile(previous.fotoUrl);
    }
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const removed = await this.prisma.gato.delete({ where: { id: Number(id) } }).catch(handlePrismaError);
    await deleteUploadedFile(removed.fotoUrl);
    return removed;
  }
}
