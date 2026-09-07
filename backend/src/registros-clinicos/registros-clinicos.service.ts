import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { CreateRegistroClinicoInput } from './dto/create-registro-clinico.input.js';

@Injectable()
export class RegistrosClinicosService {
  constructor(private readonly prisma: PrismaService) {}

  create({ gatoId, tipo, fecha, diagnostico, nuevoEstadoCer }: CreateRegistroClinicoInput) {
    // new Date(fecha): @IsDateString() acepta tanto "2026-01-15" como un ISO completo, pero
    // el DateTime de Prisma exige el ISO completo - Date normaliza cualquiera de los dos.
    // Transacción atómica: el nuevo registro clínico y el cambio de estado_cer del gato
    // se confirman o se descartan juntos (p.ej. si el gatoId no existe, ninguno se aplica).
    return this.prisma
      .$transaction(async (tx) => {
        await tx.gato.update({ where: { id: gatoId }, data: { estadoCer: nuevoEstadoCer } });
        return tx.registroClinico.create({
          data: { gatoId, tipo, fecha: new Date(fecha), diagnostico },
        });
      })
      .catch(handlePrismaError);
  }

  findByGato(gatoId: number) {
    return this.prisma.registroClinico.findMany({
      where: { gatoId },
      orderBy: { fecha: 'desc' },
    });
  }
}
