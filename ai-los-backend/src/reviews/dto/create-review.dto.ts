import {
  IsIn,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class CreateReviewDto {
  @IsIn(['PROCEED', 'REVIEW', 'DECLINE'])
  recommendation: string;

  @IsString()
  @IsNotEmpty()
  rationale: string;
}
