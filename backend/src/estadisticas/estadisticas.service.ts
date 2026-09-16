import { Injectable } from '@nestjs/common';
import { TipoEventoClinico } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

@Injectable()
export class EstadisticasService {
  constructor(private readonly prisma: PrismaService) {}

  async gatosPorEstadoCer() {
    const grupos = await this.prisma.gato.groupBy({
      by: ['estadoCer'],
      _count: { _all: true },
    });
    return grupos.map((g) => ({ estadoCer: g.estadoCer, cantidad: g._count._all }));
  }

  // Una sola consulta agregada para TODOS los comederos (groupBy + max), no un findFirst por
  // comedero como hace ComederosResolver.ultimaVisita - con el volumen de datos de hoy da igual,
  // pero aquí, al recorrer todos los comederos de golpe para un panel de estadísticas, sí que
  // habría sido el mismo problema de N+1 que se señaló como candidato a DataLoader en su día.
  async comederosSinVisitaReciente(diasSinVisita: number) {
    const [comederos, ultimasVisitasPorComedero] = await Promise.all([
      this.prisma.comedero.findMany({
        select: { id: true, coloniaId: true, ubicacionDetallada: true },
      }),
      this.prisma.visitaComedero.groupBy({
        by: ['comederoId'],
        _max: { createdAt: true },
      }),
    ]);

    const ultimaVisitaPorComedero = new Map(
      ultimasVisitasPorComedero.map((v) => [v.comederoId, v._max.createdAt]),
    );

    const limite = new Date(Date.now() - diasSinVisita * MILISEGUNDOS_POR_DIA);

    return comederos
      .map((comedero) => ({
        ...comedero,
        ultimaVisita: ultimaVisitaPorComedero.get(comedero.id) ?? null,
      }))
      .filter((comedero) => !comedero.ultimaVisita || comedero.ultimaVisita < limite);
  }

  esterilizacionesTrimestreActual() {
    const ahora = new Date();
    const trimestre = Math.floor(ahora.getMonth() / 3);
    const inicio = new Date(ahora.getFullYear(), trimestre * 3, 1);
    const fin = new Date(ahora.getFullYear(), trimestre * 3 + 3, 1);

    return this.prisma.registroClinico.count({
      where: {
        tipo: TipoEventoClinico.ESTERILIZACION,
        fecha: { gte: inicio, lt: fin },
      },
    });
  }

  async obtenerTodas(diasSinVisita: number) {
    const [gatosPorEstadoCer, comederosSinVisitaReciente, esterilizacionesTrimestreActual] =
      await Promise.all([
        this.gatosPorEstadoCer(),
        this.comederosSinVisitaReciente(diasSinVisita),
        this.esterilizacionesTrimestreActual(),
      ]);
    return { gatosPorEstadoCer, comederosSinVisitaReciente, esterilizacionesTrimestreActual };
  }
}
