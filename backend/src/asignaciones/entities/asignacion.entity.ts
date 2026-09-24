import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Voluntario } from '../../voluntarios/entities/voluntario.entity.js';

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

  // Resuelto bajo demanda vía DataLoader (ver dataloaders.ts) - sin esto, un cliente que quisiera
  // el nombre del voluntario solo tenía voluntarioId y tenía que cruzarlo a mano con otra query.
  @Field(() => Voluntario, { nullable: true })
  voluntario?: Voluntario | null;
}
