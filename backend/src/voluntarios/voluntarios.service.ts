import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { requireTenantId } from '../prisma/tenant-context.js';
import { MediaService } from '../storage/media.service.js';
import { CreateVoluntarioInput } from './dto/create-voluntario.input.js';
import { UpdateVoluntarioInput } from './dto/update-voluntario.input.js';

@Injectable()
export class VoluntariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  create(data: CreateVoluntarioInput) {
    return this.prisma.voluntario
      .create({ data: { ...data, organizacionId: requireTenantId() } })
      .catch(handlePrismaError);
  }

  findAll() {
    return this.prisma.voluntario.findMany();
  }

  async findOne(id: string) {
    const voluntario = await this.prisma.voluntario.findUnique({ where: { id: Number(id) } });
    if (!voluntario) {
      throw new NotFoundException(`Voluntario ${id} no encontrado`);
    }
    return voluntario;
  }

  async update(id: string, data: UpdateVoluntarioInput) {
    const previous = await this.findOne(id);
    const updated = await this.prisma.voluntario
      .update({ where: { id: Number(id) }, data })
      .catch(handlePrismaError);
    if (data.urlCesionDatos !== undefined && data.urlCesionDatos !== previous.urlCesionDatos) {
      await this.media.eliminar(previous.urlCesionDatos);
    }
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    const removed = await this.prisma.voluntario.delete({ where: { id: Number(id) } }).catch(handlePrismaError);
    await this.media.eliminar(removed.urlCesionDatos);
    return removed;
  }
}
