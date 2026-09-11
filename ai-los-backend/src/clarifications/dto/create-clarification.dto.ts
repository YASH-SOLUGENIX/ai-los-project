import {
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateClarificationDto {
  @IsString()
  @IsNotEmpty()
  question: string;
} 