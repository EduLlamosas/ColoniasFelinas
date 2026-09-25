import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

@InputType()
export class SolicitarOrganizacionInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  // Mismo patrón que CreateOrganizacionInput.slug (ver organizaciones/dto) - lo propone quien
  // rellena el formulario, pero @@unique en la tabla es quien decide de verdad si se acepta.
  @Field()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug solo puede llevar minúsculas, números y guiones (p. ej. "ayuntamiento-ejemplo")',
  })
  @MaxLength(80)
  slug: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  contactoNombre: string;

  @Field()
  @IsEmail()
  contactoEmail: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactoTelefono?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  mensaje?: string;
}
