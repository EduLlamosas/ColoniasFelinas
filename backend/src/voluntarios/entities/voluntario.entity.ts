import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Voluntario {
  @Field(() => ID)
  id: string;

  @Field()
  dni: string;

  @Field()
  nombre: string;

  @Field(() => String, { nullable: true })
  telefono: string | null;

  @Field()
  urlCesionDatos: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
