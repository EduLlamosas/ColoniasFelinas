import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Asignacion {
  @Field(() => Int)
  voluntarioId: number;

  @Field(() => Int)
  coloniaId: number;

  @Field()
  rolAsignado: string;

  @Field()
  createdAt: Date;
}
