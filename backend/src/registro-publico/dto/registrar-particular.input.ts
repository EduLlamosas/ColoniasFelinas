import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

@InputType()
export class RegistrarParticularInput {
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

  // El ayuntamiento al que quedará ligada la cuenta (ver Usuario.rol PARTICULAR) - lo elige quien
  // se registra, de una lista pública de organizaciones activas (ver
  // RegistroPublicoResolver#organizacionesPublicas), nunca un id numérico interno.
  @Field()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  organizacionSlug: string;
}
