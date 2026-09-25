import { Field, ID, ObjectType } from '@nestjs/graphql';

// Subconjunto público de Organizacion (ver organizaciones/entities) - sin storageKbUsados ni
// nada interno, es solo lo necesario para el desplegable "elige tu ayuntamiento" del formulario
// de registro de particulares.
@ObjectType()
export class OrganizacionPublica {
  @Field(() => ID)
  id: string;

  @Field()
  nombre: string;

  @Field()
  slug: string;
}
