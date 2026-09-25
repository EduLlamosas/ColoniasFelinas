import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { requireTenantId } from '../prisma/tenant-context.js';
import { MediaService } from '../storage/media.service.js';
import { CreateComederoInput } from './dto/create-comedero.input.js';
import { UpdateComederoInput } from './dto/update-comedero.input.js';

@Injectable()
export class ComederosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  create(data: CreateComederoInput) {
    return this.prisma.comedero
      .create({ data: { ...data, organizacionId: requireTenantId() } })
      .catch(handlePrismaError);
  }

  findAll(coloniaId?: number) {
    return this.prisma.comedero.findMany({ where: coloniaId === undefined ? undefined : { coloniaId } });
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
      await this.media.eliminar(previous.fotoUrl);
    }
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const removed = await this.prisma.comedero.delete({ where: { id: Number(id) } }).catch(handlePrismaError);
    await this.media.eliminar(removed.fotoUrl);
    return removed;
  }
}
