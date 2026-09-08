import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Usuario } from '../../usuarios/entities/usuario.entity.js';

@ObjectType()
export class VisitaComedero {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  comederoId: number;

  @Field(() => Int, { nullable: true })
  usuarioId: number | null;

  // Resuelto bajo demanda en el resolver a partir de usuarioId (mismo patrón que
  // Comedero.ultimaVisita) - null en trazas antiguas de antes de que este campo existiera.
  @Field(() => Usuario, { nullable: true })
  usuario?: Usuario | null;

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
