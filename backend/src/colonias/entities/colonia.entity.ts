import { Field, Float, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { TipoSuelo } from '@prisma/client';

registerEnumType(TipoSuelo, {
  name: 'TipoSuelo',
});

@ObjectType()
export class Colonia {
  @Field(() => ID)
  id: string;

  @Field()
  codigoOficial: string;

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
