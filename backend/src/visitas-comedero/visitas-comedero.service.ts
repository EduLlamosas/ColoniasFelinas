import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { CreateVisitaComederoInput } from './dto/create-visita-comedero.input.js';

@Injectable()
export class VisitasComederoService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateVisitaComederoInput) {
    return this.prisma.visitaComedero.create({ data }).catch(handlePrismaError);
  }

  findByComedero(comederoId: number) {
    return this.prisma.visitaComedero.findMany({
      where: { comederoId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
