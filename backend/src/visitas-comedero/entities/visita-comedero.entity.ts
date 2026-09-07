import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class VisitaComedero {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  comederoId: number;

  @Field()
  piensoSeco: boolean;

  @Field()
  comidaHumeda: boolean;

  @Field()
  agua: boolean;

  @Field(() => String, { nullable: true })
  observaciones: string | null;

  @Field()
  createdAt: Date;
}
