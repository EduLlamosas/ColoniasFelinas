import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateAsignacionInput {
  @Field(() => Int)
  @IsInt()
  voluntarioId: number;

  @Field(() => Int)
  @IsInt()
  coloniaId: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  rolAsignado: string;
}
