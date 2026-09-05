import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoanReview } from './entities/loan-review.entity';
import { LoanApplication } from '../applications/entities/loan-application.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(LoanReview)
    private readonly reviewRepository: Repository<LoanReview>,

    @InjectRepository(LoanApplication)
    private readonly applicationRepository: Repository<LoanApplication>,
  ) {}

  async createReview(
    applicationId: number,
    officerId: string,
    dto: CreateReviewDto,
  ) {
    // 1. Find application
    const application = await this.applicationRepository.findOne({
      where: {
        id: applicationId,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // 2. Application must be submitted
    if (application.status !== 'SUBMITTED') {
      throw new BadRequestException(
        'Only submitted applications can be reviewed',
      );
    }

    // 3. Check if officer already reviewed this application
    const existingReview = await this.reviewRepository.findOne({
      where: {
        applicationId,
      },
    });

    if (existingReview) {
      throw new BadRequestException(
        'Application has already been reviewed',
      );
    }

    // 4. Create review
    const review = this.reviewRepository.create({
      applicationId,
      officerId,
      recommendation: dto.recommendation,
      rationale: dto.rationale,
    });

    const savedReview = await this.reviewRepository.save(review);

    // 5. Move application to manager review
    application.status = 'MANAGER_REVIEW';

    await this.applicationRepository.save(application);

    return {
      message: 'Officer review submitted successfully',
      review: savedReview,
      applicationStatus: application.status,
    };
  }
}