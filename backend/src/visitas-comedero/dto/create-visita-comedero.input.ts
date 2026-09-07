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
}
