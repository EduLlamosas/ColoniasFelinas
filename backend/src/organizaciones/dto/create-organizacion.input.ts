import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

@InputType()
export class CreateOrganizacionInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  // Sin mayúsculas/espacios/acentos a propósito: pensado para identificar la organización en
  // sitios donde eso importa más adelante (subdominio, URL de invitación...), no solo como texto.
  @Field()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug solo puede llevar minúsculas, números y guiones (p. ej. "ayuntamiento-ejemplo")',
  })
  @MaxLength(80)
  slug: string;

  @Field()
  @IsEmail()
  adminEmail: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  adminNombre: string;
}
