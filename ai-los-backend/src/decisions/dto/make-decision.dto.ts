import {
  IsIn,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class MakeDecisionDto {
  @IsIn(['APPROVE', 'REJECT', 'RETURN'])
  decision: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}