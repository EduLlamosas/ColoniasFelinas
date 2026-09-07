import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { TipoEventoClinico } from '@prisma/client';

registerEnumType(TipoEventoClinico, { name: 'TipoEventoClinico' });

@ObjectType()
export class RegistroClinico {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  gatoId: number;

  @Field(() => TipoEventoClinico)
  tipo: TipoEventoClinico;

  @Field()
  fecha: Date;

  @Field()
  diagnostico: string;

  @Field()
  createdAt: Date;
}
