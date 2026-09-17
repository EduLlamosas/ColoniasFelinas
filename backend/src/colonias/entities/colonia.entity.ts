import { Field, Float, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { TipoSuelo } from '@prisma/client';

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
}
