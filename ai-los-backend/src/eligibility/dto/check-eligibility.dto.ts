import {
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';

export class CheckEligibilityDto {
  @IsInt()
  @Min(21)
  age: number;

  @IsNumber()
  @Min(1)
  monthlyIncome: number;

  @IsNumber()
  @Min(0)
  monthlyObligations: number;
}