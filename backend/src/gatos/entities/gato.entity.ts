import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { EstadoCer, Sexo } from '@prisma/client';
import { RegistroClinico } from '../../registros-clinicos/entities/registro-clinico.entity.js';

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

  // Resuelto bajo demanda vía DataLoader, limitado a los 3 más recientes (ver
  // registrosClinicosPorGato en dataloaders.ts) - es el "últimas tres vacunas de cada uno" del
  // ejemplo de la memoria (sección 2.2.2). Para el historial completo sigue existiendo la query
  // plana `registrosClinicos(gatoId)`, sin recortar.
  @Field(() => [RegistroClinico])
  registrosClinicos: RegistroClinico[];
}
