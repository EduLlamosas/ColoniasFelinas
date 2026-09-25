import { Field, ID, ObjectType } from '@nestjs/graphql';
import { EstadoAportacion, EstadoCer, Sexo } from '@prisma/client';

@ObjectType()
export class AportacionGato {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  aportacionColoniaId: string;

  @Field(() => String, { nullable: true })
  nombre: string | null;

  @Field(() => Sexo)
  sexo: Sexo;

  @Field()
  capaPelaje: string;

  @Field(() => EstadoCer)
  estadoCer: EstadoCer;

  @Field(() => String, { nullable: true })
  observaciones: string | null;

  @Field(() => String, { nullable: true })
  fotoUrl: string | null;

  @Field(() => EstadoAportacion)
  estado: EstadoAportacion;

  @Field(() => String, { nullable: true })
  motivoRechazo: string | null;

  @Field(() => ID, { nullable: true })
  gatoCreadoId: string | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
