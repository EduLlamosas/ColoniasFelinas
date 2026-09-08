import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { TipoEventoClinico } from '@prisma/client';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';

registerEnumType(TipoEventoClinico, { name: 'TipoEventoClinico' });

@ObjectType()
export class RegistroClinico {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  gatoId: number;

  @Field(() => Int, { nullable: true })
  usuarioId: number | null;

  // Resuelto bajo demanda a partir de usuarioId - null en registros previos a este campo.
  @Field(() => Usuario, { nullable: true })
  usuario?: Usuario | null;

  @Field(() => TipoEventoClinico)
  tipo: TipoEventoClinico;

  @Field()
  fecha: Date;

  @Field()
  diagnostico: string;

  @Field()
  createdAt: Date;
}
