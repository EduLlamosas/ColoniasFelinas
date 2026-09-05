import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

@InputType()
export class CreateComederoInput {
  @Field(() => Int)
  @IsInt()
  coloniaId: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  ubicacionDetallada: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({ require_tld: false })
  fotoUrl?: string;
}
