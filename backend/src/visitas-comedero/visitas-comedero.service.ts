import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { CreateVisitaComederoInput } from './dto/create-visita-comedero.input.js';

@Injectable()
export class VisitasComederoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateVisitaComederoInput, usuarioId: number) {
    // Reintento con la misma idempotencyKey (cola offline de la app móvil): si la petición
    // original SÍ llegó a crearse y solo se perdió la respuesta, se devuelve esa fila ya
    // existente en vez de crear una segunda. Sin clave (frontend web), se salta este paso y se
    // crea siempre una fila nueva - comportamiento idéntico al de antes de este campo.
    if (data.idempotencyKey) {
      const existente = await this.prisma.visitaComedero.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
      });
      if (existente) return existente;
    }

    // Ventana de carrera teórica entre el findUnique de arriba y este create (dos reintentos
    // solapados con la misma clave): el índice único de la BD es la protección real contra el
    // duplicado en sí, esto solo evita el caso común de devolver un 409 en vez de la fila ya
    // creada.
    return this.prisma.visitaComedero.create({ data: { ...data, usuarioId } }).catch(handlePrismaError);
  }

  findByComedero(comederoId: number) {
    return this.prisma.visitaComedero.findMany({
      where: { comederoId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
