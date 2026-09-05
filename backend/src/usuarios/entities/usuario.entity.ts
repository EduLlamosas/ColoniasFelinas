import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { RolUsuario } from '@prisma/client';

registerEnumType(RolUsuario, { name: 'RolUsuario' });

@ObjectType()
export class Usuario {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  nombreCompleto: string;

  @Field(() => RolUsuario)
  rol: RolUsuario;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
