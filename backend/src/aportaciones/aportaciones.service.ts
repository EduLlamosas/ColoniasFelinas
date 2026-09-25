import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoAportacion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { handlePrismaError } from '../prisma/prisma-error.util.js';
import { getTenantContext, requireTenantId, runTenantTransaction } from '../prisma/tenant-context.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { AportacionFilterService } from './aportacion-filter.service.js';
import { CreateAportacionColoniaInput } from './dto/create-aportacion-colonia.input.js';
import { RevisarAportacionInput } from './dto/revisar-aportacion.input.js';

// Respuesta directa a la pregunta de "cuántas colonias/gatos como máximo para que no se abuse de
// la faceta gratuita" - suficiente para que una persona real censando su barrio no se quede corta,
// pequeño de sobra para que no compense usar una cuenta particular en vez de contratar la
// organización si de verdad se gestionan muchas colonias.
const MAX_COLONIAS_PARTICULAR = 3;
const MAX_GATOS_PARTICULAR = 20;

// Una aportación ya rechazada (automática o manualmente) no debe seguir "gastando" cupo para
// siempre - si no, un primer intento fallido (typo, foto borrosa) dejaría a un usuario legítimo
// sin poder volver a intentarlo nunca.
const ESTADOS_QUE_CUENTAN_PARA_CUPO: EstadoAportacion[] = [
  EstadoAportacion.PENDIENTE_AUTOMATICO,
  EstadoAportacion.PENDIENTE_MANUAL,
  EstadoAportacion.ACEPTADA,
];

const VENTANA_RITMO_ENVIOS_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AportacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usuariosService: UsuariosService,
    private readonly filter: AportacionFilterService,
  ) {}

  async crearColonia(data: CreateAportacionColoniaInput) {
    const ctx = getTenantContext();
    const usuarioId = ctx?.usuarioId;
    if (!usuarioId) {
      throw new ForbiddenException('Sesión inválida');
    }
    const usuario = await this.usuariosService.findById(usuarioId);
    if (!usuario?.emailVerificado) {
      throw new ForbiddenException('Verifica tu email antes de poder aportar colonias');
    }

    const organizacionId = requireTenantId();

    const [coloniasExistentes, gatosExistentes, aportacionesUltimas24h] = await Promise.all([
      this.prisma.aportacionColonia.count({
        where: { usuarioId, estado: { in: ESTADOS_QUE_CUENTAN_PARA_CUPO } },
      }),
      this.prisma.aportacionGato.count({
        where: { usuarioId, estado: { in: ESTADOS_QUE_CUENTAN_PARA_CUPO } },
      }),
      this.prisma.aportacionColonia.count({
        where: { usuarioId, createdAt: { gte: new Date(Date.now() - VENTANA_RITMO_ENVIOS_MS) } },
      }),
    ]);

    if (coloniasExistentes >= MAX_COLONIAS_PARTICULAR) {
      throw new BadRequestException(
        `Has alcanzado el máximo de ${MAX_COLONIAS_PARTICULAR} colonias aportadas por cuenta`,
      );
    }
    if (gatosExistentes + data.gatos.length > MAX_GATOS_PARTICULAR) {
      throw new BadRequestException(
        `Has alcanzado el máximo de ${MAX_GATOS_PARTICULAR} gatos aportados por cuenta`,
      );
    }

    const resultado = this.evaluarFiltro(data, aportacionesUltimas24h);
    const estado = resultado.aceptado
      ? EstadoAportacion.PENDIENTE_MANUAL
      : EstadoAportacion.RECHAZADA_AUTOMATICA;

    return runTenantTransaction(this.prisma, (tx) =>
      tx.aportacionColonia
        .create({
          data: {
            organizacionId,
            usuarioId,
            nombre: data.nombre,
            tipoSuelo: data.tipoSuelo,
            latitud: data.latitud,
            longitud: data.longitud,
            observaciones: data.observaciones,
            fotoUrl: data.fotoUrl,
            estado,
            motivoRechazo: resultado.motivo,
            gatos: {
              create: data.gatos.map((gato) => ({
                organizacionId,
                usuarioId,
                nombre: gato.nombre,
                sexo: gato.sexo,
                capaPelaje: gato.capaPelaje,
                estadoCer: gato.estadoCer,
                observaciones: gato.observaciones,
                fotoUrl: gato.fotoUrl,
                estado,
                motivoRechazo: resultado.motivo,
              })),
            },
          },
          include: { gatos: true },
        })
        .catch(handlePrismaError),
    );
  }

  private evaluarFiltro(data: CreateAportacionColoniaInput, aportacionesUltimas24h: number) {
    const ritmo = this.filter.evaluarRitmoEnvios(aportacionesUltimas24h);
    if (!ritmo.aceptado) return ritmo;

    const coordenadas = this.filter.evaluarCoordenadas(data.latitud, data.longitud);
    if (!coordenadas.aceptado) return coordenadas;

    const textos = [
      data.nombre,
      data.observaciones,
      ...data.gatos.flatMap((gato) => [gato.nombre, gato.capaPelaje, gato.observaciones]),
    ];
    return this.filter.evaluarTextos(textos);
  }

  // PARTICULAR ve solo las suyas - lo filtra RLS (usuario_id = propio dentro de su organización,
  // ver la política de aportaciones_colonia), no un `where` explícito aquí.
  misAportaciones() {
    return this.prisma.aportacionColonia.findMany({
      orderBy: { createdAt: 'desc' },
      include: { gatos: true },
    });
  }

  // ADMINISTRADOR/GESTOR: solo las que ya pasaron el filtro automático y esperan revisión humana.
  // RLS ya las limita a la propia organización - la condición de usuario_id de la política no se
  // aplica porque quien pregunta no es PARTICULAR.
  aportacionesPendientes() {
    return this.prisma.aportacionColonia.findMany({
      where: { estado: EstadoAportacion.PENDIENTE_MANUAL },
      orderBy: { createdAt: 'asc' },
      include: { gatos: true },
    });
  }

  async revisar(data: RevisarAportacionInput) {
    const aportacion = await this.prisma.aportacionColonia.findUnique({
      where: { id: data.id },
      include: { gatos: true },
    });
    if (!aportacion) {
      throw new NotFoundException(`Aportación ${data.id} no encontrada`);
    }
    if (aportacion.estado !== EstadoAportacion.PENDIENTE_MANUAL) {
      throw new BadRequestException('Esta aportación ya ha sido revisada');
    }

    if (!data.aceptar) {
      return runTenantTransaction(this.prisma, async (tx) => {
        await tx.aportacionGato.updateMany({
          where: { aportacionColoniaId: aportacion.id },
          data: { estado: EstadoAportacion.RECHAZADA_MANUAL, motivoRechazo: data.motivoRechazo },
        });
        return tx.aportacionColonia.update({
          where: { id: aportacion.id },
          data: { estado: EstadoAportacion.RECHAZADA_MANUAL, motivoRechazo: data.motivoRechazo },
          include: { gatos: true },
        });
      });
    }

    // Aceptar: copia una Colonia/Gato(s) reales a partir de la aportación, en la misma
    // transacción que marca la aportación como ACEPTADA - o se crea todo junto, o no se crea nada.
    const organizacionId = requireTenantId();
    return runTenantTransaction(this.prisma, async (tx) => {
      const colonia = await tx.colonia.create({
        data: {
          organizacionId,
          nombre: aportacion.nombre,
          tipoSuelo: aportacion.tipoSuelo,
          latitud: aportacion.latitud,
          longitud: aportacion.longitud,
          observaciones: aportacion.observaciones,
          fotoUrl: aportacion.fotoUrl,
        },
      });

      for (const gato of aportacion.gatos) {
        const gatoCreado = await tx.gato.create({
          data: {
            organizacionId,
            coloniaId: colonia.id,
            nombre: gato.nombre,
            sexo: gato.sexo,
            capaPelaje: gato.capaPelaje,
            estadoCer: gato.estadoCer,
            observaciones: gato.observaciones,
            fotoUrl: gato.fotoUrl,
          },
        });
        await tx.aportacionGato.update({
          where: { id: gato.id },
          data: { estado: EstadoAportacion.ACEPTADA, gatoCreadoId: gatoCreado.id },
        });
      }

      return tx.aportacionColonia.update({
        where: { id: aportacion.id },
        data: { estado: EstadoAportacion.ACEPTADA, coloniaCreadaId: colonia.id },
        include: { gatos: true },
      });
    });
  }
}
