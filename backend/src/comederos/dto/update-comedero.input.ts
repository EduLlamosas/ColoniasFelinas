import { InputType, PartialType } from '@nestjs/graphql';
import { CreateComederoInput } from './create-comedero.input.js';

@InputType()
export class UpdateComederoInput extends PartialType(CreateComederoInput) {}
