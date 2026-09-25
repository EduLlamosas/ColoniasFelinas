import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { requireTenantId, runTenantTransaction } from '../prisma/tenant-context.js';
import { CreateRegistroClinicoInput } from './dto/create-registro-clinico.input.js';

// fechaNacimiento de un gato callejero es, por naturaleza, una estimación a ojo (RF-B.1: "fecha
// de nacimiento estimada"), no un dato exacto de cartilla veterinaria - un margen de 5 años
// evita rechazar intervenciones legítimas por un simple error de cálculo en esa estimación.
const MARGEN_FECHA_NACIMIENTO_ANOS = 5;

@Injectable()
export class RegistrosClinicosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    { gatoId, tipo, fecha, diagnostico, nuevoEstadoCer, idempotencyKey }: CreateRegistroClinicoInput,
    usuarioId: number,
  ) {
    // Reintento con la misma idempotencyKey (cola offline de la app móvil): si la petición
    // original ya se procesó (creó el registro Y actualizó estado_cer) y solo se perdió la
    // respuesta, se devuelve esa fila tal cual, sin volver a tocar nada. Es deliberado que esto
    // vaya ANTES de cualquier validación o de la transacción: un reintento de algo que ya tuvo
    // éxito no debe re-evaluar fechas (podrían fallar ahora por otro motivo distinto) ni, sobre
    // todo, volver a pisar estado_cer del gato - si alguien cambió el estado por otra vía mientras
    // tanto, reaplicar el valor viejo de esta intervención lo regresionaría sin motivo.
    if (idempotencyKey) {
      const existente = await this.prisma.registroClinico.findUnique({ where: { idempotencyKey } });
      if (existente) return existente;
    }

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

    // Transacción atómica: el nuevo registro clínico y el cambio de estado_cer del gato se
    // confirman o se descartan juntos. runTenantTransaction (no this.prisma.$transaction a secas)
    // porque esta tabla lleva RLS - ver tenant-context.ts para por qué hace falta ese envoltorio
    // en vez del $transaction normal de Prisma.
    return runTenantTransaction(this.prisma, async (tx) => {
      await tx.gato.update({ where: { id: gatoId }, data: { estadoCer: nuevoEstadoCer } });
      return tx.registroClinico.create({
        data: {
          gatoId,
          usuarioId,
          tipo,
          fecha: fechaIntervencion,
          diagnostico,
          idempotencyKey,
          organizacionId: requireTenantId(),
        },
      });
    }).catch(handlePrismaError);
  }

  findByGato(gatoId: number) {
    return this.prisma.registroClinico.findMany({
      where: { gatoId },
      orderBy: { fecha: 'desc' },
    });
  }
}
