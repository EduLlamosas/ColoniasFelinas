import { Field, InputType, Int } from '@nestjs/graphql';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EstadoCer, TipoEventoClinico } from '@prisma/client';

@InputType()
export class CreateRegistroClinicoInput {
  @Field(() => Int)
  @IsInt()
  gatoId: number;

  @Field(() => TipoEventoClinico)
  @IsEnum(TipoEventoClinico)
  tipo: TipoEventoClinico;

  @Field()
  @IsDateString()
  fecha: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  diagnostico: string;

  @Field(() => EstadoCer)
  @IsEnum(EstadoCer)
  nuevoEstadoCer: EstadoCer;

  // Opcional: solo lo manda la app móvil, ver el mismo campo en CreateVisitaComederoInput.
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
