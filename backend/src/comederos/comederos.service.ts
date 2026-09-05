import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { deleteUploadedFile } from '../uploads/uploaded-file.util.js';
import { CreateComederoInput } from './dto/create-comedero.input.js';
import { UpdateComederoInput } from './dto/update-comedero.input.js';

@Injectable()
export class ComederosService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateComederoInput) {
    return this.prisma.comedero.create({ data }).catch(handlePrismaError);
  }

  findAll() {
    return this.prisma.comedero.findMany();
  }

  async findOne(id: string) {
    const comedero = await this.prisma.comedero.findUnique({ where: { id: Number(id) } });
    if (!comedero) {
      throw new NotFoundException(`Comedero ${id} no encontrado`);
    }
    return comedero;
  }

  async update(id: string, data: UpdateComederoInput) {
    const previous = await this.findOne(id);
    const updated = await this.prisma.comedero
      .update({ where: { id: Number(id) }, data })
      .catch(handlePrismaError);
    if (data.fotoUrl !== undefined && data.fotoUrl !== previous.fotoUrl) {
      await deleteUploadedFile(previous.fotoUrl);
    }
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const removed = await this.prisma.comedero.delete({ where: { id: Number(id) } }).catch(handlePrismaError);
    await deleteUploadedFile(removed.fotoUrl);
    return removed;
  }
}
