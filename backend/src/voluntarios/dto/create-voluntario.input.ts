import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsUrl, Matches } from 'class-validator';

@InputType()
export class CreateVoluntarioInput {
  @Field()
  @IsString()
  @Matches(/^\d{8}[A-Za-z]$/, { message: 'El DNI debe tener 8 dígitos y una letra' })
  dni: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  telefono?: string;

  @Field()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  urlCesionDatos: string;
}
