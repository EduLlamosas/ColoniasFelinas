import { InputType, PartialType } from '@nestjs/graphql';
import { CreateVoluntarioInput } from './create-voluntario.input.js';

@InputType()
export class UpdateVoluntarioInput extends PartialType(CreateVoluntarioInput) {}
