import { Field, Float, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { TipoSuelo } from '@prisma/client';
import { Gato } from '../../gatos/entities/gato.entity.js';
import { Comedero } from '../../comederos/entities/comedero.entity.js';
import { Asignacion } from '../../asignaciones/entities/asignacion.entity.js';

registerEnumType(TipoSuelo, {
  name: 'TipoSuelo',
});

@ObjectType()
export class Colonia {
  @Field(() => ID)
  id: string;

  // Lo asigna el ayuntamiento cuando registra oficialmente la colonia, no el propio sistema, y
  // ese trámite es un proceso administrativo aparte que puede tardar. Exigirlo en el alta
  // bloquearía censar una colonia nueva sobre el terreno el mismo día que se descubre.
  @Field(() => String, { nullable: true })
  codigoOficial: string | null;

  @Field()
  nombre: string;

  @Field(() => TipoSuelo)
  tipoSuelo: TipoSuelo;

  @Field(() => Float)
  latitud: number;

  @Field(() => Float)
  longitud: number;

  @Field(() => String, { nullable: true })
  observaciones: string | null;

  @Field(() => String, { nullable: true })
  fotoUrl: string | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Los tres siguientes se resuelven bajo demanda vía DataLoader en ColoniasResolver (ver
  // dataloaders.ts) - solo se calculan si la query los pide de verdad, y agrupados en una sola
  // consulta por lote aunque se pidan para varias colonias a la vez (sin esto, N colonias
  // dispararían N consultas separadas - el problema N+1 clásico de GraphQL).
  @Field(() => [Gato])
  gatos: Gato[];

  @Field(() => [Comedero])
  comederos: Comedero[];

  @Field(() => [Asignacion])
  asignaciones: Asignacion[];
}
