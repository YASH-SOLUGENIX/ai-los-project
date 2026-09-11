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
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(LoanReview)
    private readonly reviewRepository: Repository<LoanReview>,

    @InjectRepository(LoanApplication)
    private readonly applicationRepository: Repository<LoanApplication>,

    private readonly auditService: AuditService,
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

    // 2. Application must be submitted or in review
    if (
      application.status !== 'SUBMITTED' &&
      application.status !== 'RESUBMITTED' &&
      application.status !== 'UNDER_REVIEW'
    ) {
      throw new BadRequestException(
        'Only submitted, resubmitted, or under review applications can be reviewed',
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
    const beforeState = application.status;
    application.status = 'OFFICER_RECOMMENDED';
    await this.applicationRepository.save(application);

    await this.auditService.recordEvent({
      applicationId,
      eventType: 'OFFICER_RECOMMENDATION_RECORDED',
      actorId: officerId,
      actorRole: 'loan_officer',
      details: {
        recommendation: dto.recommendation,
        rationale: dto.rationale,
      },
      beforeState,
      afterState: 'OFFICER_RECOMMENDED',
    });

    return {
      message: 'Officer review submitted successfully',
      review: savedReview,
      applicationStatus: application.status,
    };
  }
}