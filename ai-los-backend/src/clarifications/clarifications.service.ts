import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoanClarification } from './entities/clarification.entity';
import { LoanApplication } from '../applications/entities/loan-application.entity';
import { CreateClarificationDto } from './dto/create-clarification.dto';
import { RespondClarificationDto } from './dto/respond-clarification.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ClarificationsService {
  constructor(
    @InjectRepository(LoanClarification)
    private readonly clarificationRepository: Repository<LoanClarification>,

    @InjectRepository(LoanApplication)
    private readonly applicationRepository: Repository<LoanApplication>,

    private readonly auditService: AuditService,
  ) {}

  async createClarification(
    applicationId: number,
    officerId: string,
    dto: CreateClarificationDto,
  ) {
    const application = await this.applicationRepository.findOne({
      where: {
        id: applicationId,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (
      application.status !== 'SUBMITTED' &&
      application.status !== 'UNDER_REVIEW'
    ) {
      throw new BadRequestException(
        'Clarification cannot be requested for this application',
      );
    }

    const clarification = this.clarificationRepository.create({
      applicationId,
      officerId,
      question: dto.question,
      status: 'OPEN',
    });

    const beforeState = application.status;
    application.status = 'CLARIFICATION_REQUIRED';

    await this.applicationRepository.save(application);
    const saved = await this.clarificationRepository.save(clarification);

    await this.auditService.recordEvent({
      applicationId,
      eventType: 'CLARIFICATION_REQUESTED',
      actorId: officerId,
      actorRole: 'loan_officer',
      details: {
        clarificationId: saved.id,
        question: dto.question,
      },
      beforeState,
      afterState: 'CLARIFICATION_REQUIRED',
    });

    return saved;
  }

  async respondToClarification(
    clarificationId: number,
    customerId: string,
    dto: RespondClarificationDto,
  ) {
    const clarification =
      await this.clarificationRepository.findOne({
        where: {
          id: clarificationId,
        },
      });

    if (!clarification) {
      throw new NotFoundException('Clarification not found');
    }

    const application = await this.applicationRepository.findOne({
      where: {
        id: clarification.applicationId,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.customerId !== customerId) {
      throw new BadRequestException(
        'You do not have access to this clarification',
      );
    }

    if (clarification.status !== 'OPEN') {
      throw new BadRequestException(
        'Clarification is no longer open',
      );
    }

    clarification.customerResponse = dto.response;
    clarification.status = 'RESPONDED';

    const beforeState = application.status;
    application.status = 'RESUBMITTED';

    await this.applicationRepository.save(application);
    const saved = await this.clarificationRepository.save(clarification);

    await this.auditService.recordEvent({
      applicationId: application.id,
      eventType: 'CLARIFICATION_RESPONDED',
      actorId: customerId,
      actorRole: 'customer',
      details: {
        clarificationId,
        response: dto.response,
      },
      beforeState,
      afterState: 'RESUBMITTED',
    });

    return saved;
  }

  async getApplicationClarifications(
    applicationId: number,
    userId: string,
    userRoles: string[] = [],
  ) {
    const application = await this.applicationRepository.findOne({
      where: {
        id: applicationId,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const isStaff =
      userRoles.includes('loan_officer') ||
      userRoles.includes('manager') ||
      userRoles.includes('auditor') ||
      userRoles.includes('admin');

    if (!isStaff && application.customerId !== userId) {
      throw new BadRequestException(
        'You do not have access to this application',
      );
    }

    return this.clarificationRepository.find({
      where: {
        applicationId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
} 