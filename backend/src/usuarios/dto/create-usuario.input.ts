import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { RolUsuario } from '@prisma/client';

@InputType()
export class CreateUsuarioInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(8)
  password: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  nombreCompleto: string;

  // Elegido por el ADMINISTRADOR que invita, no por quien se da de alta (aquí no hay auto-registro
  // - ver auth.resolver.ts). Con GraphQL enums basta con la referencia al enum de Prisma.
  @Field(() => RolUsuario)
  rol: RolUsuario;
}
