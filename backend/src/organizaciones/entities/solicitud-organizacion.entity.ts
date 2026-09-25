import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { EstadoSolicitud } from '@prisma/client';

registerEnumType(EstadoSolicitud, { name: 'EstadoSolicitud' });

// Una organización todavía no existe: esto es solo la solicitud de alta enviada desde el
// formulario público (ver RegistroPublicoResolver#solicitarOrganizacion). Solo se convierte en una
// Organizacion/Usuario reales si un superadmin la aprueba (OrganizacionesResolver#aprobarSolicitud).
@ObjectType()
export class SolicitudOrganizacion {
  @Field(() => ID)
  id: string;

  @Field()
  nombre: string;

  @Field()
  slug: string;

  @Field()
  contactoNombre: string;

  @Field()
  contactoEmail: string;

  @Field(() => String, { nullable: true })
  contactoTelefono: string | null;

  @Field(() => String, { nullable: true })
  mensaje: string | null;

  @Field(() => EstadoSolicitud)
  estado: EstadoSolicitud;

  @Field(() => ID, { nullable: true })
  organizacionCreadaId: string | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
