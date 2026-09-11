import {
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class RespondClarificationDto {
  @IsString()
  @IsNotEmpty()
  response: string;
}