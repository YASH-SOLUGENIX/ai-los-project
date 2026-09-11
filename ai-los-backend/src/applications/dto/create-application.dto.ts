import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateApplicationDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  loanProductId: number;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  requestedAmount: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  requestedTenureMonths: number;

  @IsOptional()
  @IsString()
  applicantName?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(18)
  applicantAge?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyIncome?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyObligations?: number;

  @IsOptional()
  @IsString()
  employmentType?: string;

  @IsOptional()
  @IsString()
  employerName?: string;
}