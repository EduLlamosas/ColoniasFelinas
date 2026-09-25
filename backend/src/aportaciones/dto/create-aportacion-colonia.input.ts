import { Field, Float, InputType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoSuelo } from '@prisma/client';
import { CreateAportacionGatoInput } from './create-aportacion-gato.input.js';

// ArrayMaxSize(20): tope duro de un único envío, además del contador acumulado por cuenta en
// AportacionesService (MAX_GATOS_PARTICULAR) - evita que una sola aportación agote de golpe todo
// el cupo de la cuenta en una petición.
const MAX_GATOS_POR_APORTACION = 20;

@InputType()
export class CreateAportacionColoniaInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
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
  @MaxLength(500)
  observaciones?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  fotoUrl?: string;

  // Los gatos van bundled con la colonia (ver comentario de alcance en AportacionGato) - no existe
  // una mutación separada para "añadir un gato a una aportación ya enviada".
  @Field(() => [CreateAportacionGatoInput])
  @IsArray()
  @ArrayMaxSize(MAX_GATOS_POR_APORTACION)
  @ValidateNested({ each: true })
  @Type(() => CreateAportacionGatoInput)
  gatos: CreateAportacionGatoInput[];
}
