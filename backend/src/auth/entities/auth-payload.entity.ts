import { Field, ObjectType } from '@nestjs/graphql';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken: string;

  @Field(() => Usuario)
  usuario: Usuario;
}
