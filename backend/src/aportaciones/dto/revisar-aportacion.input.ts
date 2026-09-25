import { Field, InputType, Int } from '@nestjs/graphql';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class RevisarAportacionInput {
  @Field(() => Int)
  @IsInt()
  id: number;

  @Field()
  @IsBoolean()
  aceptar: boolean;

  // Solo tiene sentido cuando aceptar=false - se le muestra tal cual a quien la mandó (ver
  // AportacionColonia.motivoRechazo, schema.prisma).
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoRechazo?: string;
}
