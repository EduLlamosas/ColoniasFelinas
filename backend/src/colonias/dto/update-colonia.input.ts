import { InputType, PartialType } from '@nestjs/graphql';
import { CreateColoniaInput } from './create-colonia.input.js';

@InputType()
export class UpdateColoniaInput extends PartialType(CreateColoniaInput) {}
