import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { EstadoCer, Sexo } from '@prisma/client';

@InputType()
export class CreateGatoInput {
  @Field(() => Int)
  @IsInt()
  coloniaId: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  nombre?: string;

  @Field(() => Sexo)
  @IsEnum(Sexo)
  sexo: Sexo;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  capaPelaje: string;

  @Field(() => EstadoCer)
  @IsEnum(EstadoCer)
  estadoCer: EstadoCer;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  tieneMicrochip?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  numMicrochip?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  marcajeOreja?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  fotoUrl?: string;
}
