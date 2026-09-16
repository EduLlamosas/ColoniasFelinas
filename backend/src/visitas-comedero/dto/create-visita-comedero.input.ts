import { Field, InputType, Int } from '@nestjs/graphql';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateVisitaComederoInput {
  @Field(() => Int)
  @IsInt()
  comederoId: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  piensoSeco?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  comidaHumeda?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  agua?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  observaciones?: string;

  // Opcional: solo lo manda la app móvil (ver offlineQueue.ts ahí), que reintenta esta mutación
  // sola cuando recupera conexión y necesita poder distinguir "esto ya se guardó, la respuesta
  // se perdió" de "esto es una visita nueva de verdad". El frontend web, que nunca reintenta
  // nada por su cuenta, simplemente no lo manda - sin clave, el servicio crea siempre una fila
  // nueva, exactamente el comportamiento de antes de este campo.
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
