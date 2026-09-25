import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Organizacion {
  @Field(() => ID)
  id: string;

  @Field()
  nombre: string;

  @Field()
  slug: string;

  @Field()
  activo: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

// Resultado de crearOrganizacion: la contraseña temporal del primer admin solo viaja UNA VEZ, en
// esta respuesta - no se guarda en ningún sitio (Usuario solo guarda el hash) y no hay
// infraestructura de envío de email en este proyecto todavía, así que quien la da de alta
// (el superadmin) la transmite él mismo al ayuntamiento por el canal que sea.
@ObjectType()
export class OrganizacionCreada {
  @Field(() => Organizacion)
  organizacion: Organizacion;

  @Field()
  adminPasswordTemporal: string;
}
