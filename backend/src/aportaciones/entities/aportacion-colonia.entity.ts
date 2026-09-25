import { Field, Float, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { EstadoAportacion, TipoSuelo } from '@prisma/client';
import { AportacionGato } from './aportacion-gato.entity.js';

registerEnumType(EstadoAportacion, { name: 'EstadoAportacion' });

@ObjectType()
export class AportacionColonia {
  @Field(() => ID)
  id: string;

  @Field()
  nombre: string;

  @Field(() => TipoSuelo)
  tipoSuelo: TipoSuelo;

  @Field(() => Float)
  latitud: number;

  @Field(() => Float)
  longitud: number;

  @Field(() => String, { nullable: true })
  observaciones: string | null;

  @Field(() => String, { nullable: true })
  fotoUrl: string | null;

  @Field(() => EstadoAportacion)
  estado: EstadoAportacion;

  @Field(() => String, { nullable: true })
  motivoRechazo: string | null;

  @Field(() => ID, { nullable: true })
  coloniaCreadaId: string | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [AportacionGato])
  gatos: AportacionGato[];
}
