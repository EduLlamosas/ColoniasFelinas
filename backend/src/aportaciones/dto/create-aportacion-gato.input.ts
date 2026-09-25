import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { EstadoCer, Sexo } from '@prisma/client';

// Mismos campos que CreateGatoInput (gatos/dto) salvo coloniaId - aquí el gato siempre va
// anidado dentro de CreateAportacionColoniaInput.gatos, nunca suelto (ver el comentario de
// alcance en AportacionGato, schema.prisma).
@InputType()
export class CreateAportacionGatoInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @Field(() => Sexo)
  @IsEnum(Sexo)
  sexo: Sexo;

  @Field()
  @IsString()
  @MaxLength(200)
  capaPelaje: string;

  @Field(() => EstadoCer)
  @IsEnum(EstadoCer)
  estadoCer: EstadoCer;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  fotoUrl?: string;
}
