import { InputType, PartialType } from '@nestjs/graphql';
import { CreateGatoInput } from './create-gato.input.js';

@InputType()
export class UpdateGatoInput extends PartialType(CreateGatoInput) {}
