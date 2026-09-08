import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { CreateRegistroClinicoInput } from './dto/create-registro-clinico.input.js';

// fechaNacimiento de un gato callejero es, por naturaleza, una estimación a ojo (RF-B.1: "fecha
// de nacimiento estimada"), no un dato exacto de cartilla veterinaria - un margen de 5 años
// evita rechazar intervenciones legítimas por un simple error de cálculo en esa estimación.
const MARGEN_FECHA_NACIMIENTO_ANOS = 5;

@Injectable()
export class RegistrosClinicosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    { gatoId, tipo, fecha, diagnostico, nuevoEstadoCer }: CreateRegistroClinicoInput,
    usuarioId: number,
  ) {
    // new Date(fecha): @IsDateString() acepta tanto "2026-01-15" como un ISO completo, pero
    // el DateTime de Prisma exige el ISO completo - Date normaliza cualquiera de los dos.
    const fechaIntervencion = new Date(fecha);

    // Deliberadamente NO es un @MaxDate(new Date()) en el DTO: ese new Date() se evaluaría
    // una sola vez al arrancar el servidor, no en cada petición, y "hoy" se quedaría
    // congelado en la fecha de arranque. Aquí se evalúa de verdad en cada request.
    if (fechaIntervencion > new Date()) {
      throw new BadRequestException('La fecha de la intervención no puede ser futura');
    }

    const gato = await this.prisma.gato.findUnique({
      where: { id: gatoId },
      select: { fechaNacimiento: true },
    });
    if (!gato) {
      throw new NotFoundException(`Gato ${gatoId} no encontrado`);
    }
    if (gato.fechaNacimiento) {
      const margen = new Date(gato.fechaNacimiento);
      margen.setFullYear(margen.getFullYear() - MARGEN_FECHA_NACIMIENTO_ANOS);
      if (fechaIntervencion < margen) {
        throw new BadRequestException(
          `La fecha de la intervención es muy anterior al nacimiento estimado del gato (margen de ${MARGEN_FECHA_NACIMIENTO_ANOS} años)`,
        );
      }
    }

    // Transacción atómica: el nuevo registro clínico y el cambio de estado_cer del gato
    // se confirman o se descartan juntos.
    return this.prisma
      .$transaction(async (tx) => {
        await tx.gato.update({ where: { id: gatoId }, data: { estadoCer: nuevoEstadoCer } });
        return tx.registroClinico.create({
          data: { gatoId, usuarioId, tipo, fecha: fechaIntervencion, diagnostico },
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
