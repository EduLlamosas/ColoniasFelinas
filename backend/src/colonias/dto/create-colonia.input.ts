import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { TipoSuelo } from '@prisma/client';

@InputType()
export class CreateColoniaInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  codigoOficial: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @Field(() => TipoSuelo)
  @IsEnum(TipoSuelo)
  tipoSuelo: TipoSuelo;

  @Field(() => Float)
  @IsLatitude()
  latitud: number;

  @Field(() => Float)
  @IsLongitude()
  longitud: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  fotoUrl?: string;
}
