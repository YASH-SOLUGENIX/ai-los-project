import {
  IsInt,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';

export class CreateApplicationDto {
  @IsInt()
  @IsPositive()
  loanProductId: number;

  @IsNumber()
  @IsPositive()
  requestedAmount: number;

  @IsInt()
  @Min(1)
  requestedTenureMonths: number;
}