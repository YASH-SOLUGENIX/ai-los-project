import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

import { LoanReview } from './entities/loan-review.entity';
import { LoanApplication } from '../applications/entities/loan-application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoanReview,
      LoanApplication,
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}