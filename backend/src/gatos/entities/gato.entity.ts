import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { EstadoCer, Sexo } from '@prisma/client';

registerEnumType(Sexo, { name: 'Sexo' });
registerEnumType(EstadoCer, { name: 'EstadoCer' });

@ObjectType()
export class Gato {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  coloniaId: number;

  @Field(() => String, { nullable: true })
  nombre: string | null;

  @Field(() => Sexo)
  sexo: Sexo;

  @Field(() => Date, { nullable: true })
  fechaNacimiento: Date | null;

  @Field()
  capaPelaje: string;

  @Field(() => EstadoCer)
  estadoCer: EstadoCer;

  @Field(() => String, { nullable: true })
  observaciones: string | null;

  @Field()
  tieneMicrochip: boolean;

  @Field(() => String, { nullable: true })
  numMicrochip: string | null;

  @Field()
  marcajeOreja: boolean;

  @Field(() => String, { nullable: true })
  fotoUrl: string | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
