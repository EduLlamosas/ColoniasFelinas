import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Comedero {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  coloniaId: number;

  @Field()
  ubicacionDetallada: string;

  @Field(() => String, { nullable: true })
  fotoUrl: string | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
