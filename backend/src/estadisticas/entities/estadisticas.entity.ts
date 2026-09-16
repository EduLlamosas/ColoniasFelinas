import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { EstadoCer } from '@prisma/client';

// EstadoCer ya se registra como enum de GraphQL en gato.entity.ts - registrarlo dos veces
// lanzaría un error en arranque, así que aquí solo se reutiliza la clase.

@ObjectType()
export class GatosPorEstadoCer {
  @Field(() => EstadoCer)
  estadoCer: EstadoCer;

  @Field(() => Int)
  cantidad: number;
}

@ObjectType()
export class ComederoSinVisitaReciente {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  coloniaId: number;

  @Field()
  ubicacionDetallada: string;

  // null si el comedero no tiene ninguna visita registrada nunca (distinto de "hace mucho").
  @Field(() => Date, { nullable: true })
  ultimaVisita: Date | null;
}

@ObjectType()
export class Estadisticas {
  @Field(() => [GatosPorEstadoCer])
  gatosPorEstadoCer: GatosPorEstadoCer[];

  @Field(() => [ComederoSinVisitaReciente])
  comederosSinVisitaReciente: ComederoSinVisitaReciente[];

  @Field(() => Int)
  esterilizacionesTrimestreActual: number;
}
