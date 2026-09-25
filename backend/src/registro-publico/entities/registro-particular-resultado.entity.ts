import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RegistroParticularResultado {
  @Field()
  email: string;

  // Siempre true: registrarParticular manda el correo de verificación de forma síncrona (ver
  // RegistroPublicoService) antes de devolver esta respuesta. Si el envío falla (SMTP caído),
  // la mutación entera falla y no se llega a crear el usuario - mejor eso que una cuenta que
  // nunca recibe su email y se queda atascada sin forma de reenviarlo en esta primera versión.
  @Field()
  emailVerificacionEnviado: boolean;
}
