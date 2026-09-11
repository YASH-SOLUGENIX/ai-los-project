import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';

import { LoanApplication } from './entities/loan-application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { LoanDocument } from '../documents/entities/loan-document.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(LoanApplication)
    private readonly applicationRepository: Repository<LoanApplication>,

    @InjectRepository(LoanDocument)
    private readonly documentRepository: Repository<LoanDocument>,

    private readonly auditService: AuditService,
  ) {}

  async create(
    customerId: string,
    createApplicationDto: CreateApplicationDto,
  ) {
    const application = this.applicationRepository.create({
      customerId,
      loanProductId: createApplicationDto.loanProductId,
      requestedAmount: createApplicationDto.requestedAmount,
      requestedTenureMonths: createApplicationDto.requestedTenureMonths,
      applicantName: createApplicationDto.applicantName,
      applicantAge: createApplicationDto.applicantAge,
      monthlyIncome: createApplicationDto.monthlyIncome,
      monthlyObligations: createApplicationDto.monthlyObligations,
      employmentType: createApplicationDto.employmentType,
      employerName: createApplicationDto.employerName,
      status: 'DRAFT',
      version: 1,
    });

    const saved = await this.applicationRepository.save(application);

    await this.auditService.recordEvent({
      applicationId: saved.id,
      eventType: 'APPLICATION_CREATED',
      actorId: customerId,
      actorRole: 'customer',
      details: {
        requestedAmount: saved.requestedAmount,
        requestedTenureMonths: saved.requestedTenureMonths,
      },
      afterState: 'DRAFT',
    });

    return saved;
  }

  async updateDraft(
    id: number,
    customerId: string,
    dto: UpdateApplicationDto,
  ) {
    const application = await this.applicationRepository.findOne({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.customerId !== customerId) {
      throw new ForbiddenException(
        'You do not have access to this application',
      );
    }

    if (application.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only applications in DRAFT status can be modified',
      );
    }

    if (dto.version !== undefined && dto.version !== application.version) {
      throw new ConflictException(
        'Optimistic lock exception: application has been modified by another action',
      );
    }

    if (dto.loanProductId !== undefined) application.loanProductId = dto.loanProductId;
    if (dto.requestedAmount !== undefined) application.requestedAmount = dto.requestedAmount;
    if (dto.requestedTenureMonths !== undefined) application.requestedTenureMonths = dto.requestedTenureMonths;
    if (dto.applicantName !== undefined) application.applicantName = dto.applicantName;
    if (dto.applicantAge !== undefined) application.applicantAge = dto.applicantAge;
    if (dto.monthlyIncome !== undefined) application.monthlyIncome = dto.monthlyIncome;
    if (dto.monthlyObligations !== undefined) application.monthlyObligations = dto.monthlyObligations;
    if (dto.employmentType !== undefined) application.employmentType = dto.employmentType;
    if (dto.employerName !== undefined) application.employerName = dto.employerName;

    application.version = (application.version || 1) + 1;

    const saved = await this.applicationRepository.save(application);

    await this.auditService.recordEvent({
      applicationId: saved.id,
      eventType: 'APPLICATION_UPDATED',
      actorId: customerId,
      actorRole: 'customer',
      details: { version: saved.version },
      beforeState: 'DRAFT',
      afterState: 'DRAFT',
    });

    return saved;
  }

  async findMyApplications(customerId: string) {
    return this.applicationRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, userId: string, userRoles: string[] = []) {
    const application = await this.applicationRepository.findOne({
      where: { id },
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
      throw new ForbiddenException(
        'You do not have access to this application',
      );
    }

    return application;
  }

  async getWorkQueues(
    userRoles: string[],
    filters: { status?: string; search?: string } = {},
  ) {
    const isOfficer = userRoles.includes('loan_officer');
    const isManager = userRoles.includes('manager');

    let allowedStatuses: string[] = [];

    if (filters.status) {
      allowedStatuses = [filters.status];
    } else if (isManager) {
      allowedStatuses = [
        'OFFICER_RECOMMENDED',
        'MANAGER_APPROVED',
        'MANAGER_REJECTED',
      ];
    } else if (isOfficer) {
      allowedStatuses = [
        'SUBMITTED',
        'RESUBMITTED',
        'UNDER_REVIEW',
        'CLARIFICATION_REQUIRED',
        'OFFICER_RECOMMENDED',
      ];
    } else {
      allowedStatuses = [
        'SUBMITTED',
        'RESUBMITTED',
        'UNDER_REVIEW',
        'OFFICER_RECOMMENDED',
      ];
    }

    const queryBuilder = this.applicationRepository
      .createQueryBuilder('app')
      .where('app.status IN (:...statuses)', { statuses: allowedStatuses });

    if (filters.search) {
      queryBuilder.andWhere(
        '(app.applicantName ILIKE :search OR CAST(app.id AS text) ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    queryBuilder.orderBy('app.updatedAt', 'DESC');

    return queryBuilder.getMany();
  }

  async markUnderReview(id: number, officerId: string) {
    const application = await this.applicationRepository.findOne({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (
      application.status === 'SUBMITTED' ||
      application.status === 'RESUBMITTED'
    ) {
      const beforeState = application.status;
      application.status = 'UNDER_REVIEW';
      const saved = await this.applicationRepository.save(application);

      await this.auditService.recordEvent({
        applicationId: saved.id,
        eventType: 'APPLICATION_UNDER_REVIEW',
        actorId: officerId,
        actorRole: 'loan_officer',
        beforeState,
        afterState: 'UNDER_REVIEW',
      });

      return saved;
    }

    return application;
  }

  async submit(id: number, customerId: string) {
    const application = await this.applicationRepository.findOne({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.customerId !== customerId) {
      throw new ForbiddenException(
        'You do not have access to this application',
      );
    }

    const salarySlip = await this.documentRepository.findOne({
      where: {
        applicationId: id,
        documentType: 'SALARY_SLIP',
      },
    });

    if (!salarySlip) {
      throw new BadRequestException(
        'Missing required document: SALARY_SLIP',
      );
    }

    if (application.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft applications can be submitted',
      );
    }

    application.status = 'SUBMITTED';
    const saved = await this.applicationRepository.save(application);

    await this.auditService.recordEvent({
      applicationId: saved.id,
      eventType: 'APPLICATION_SUBMITTED',
      actorId: customerId,
      actorRole: 'customer',
      beforeState: 'DRAFT',
      afterState: 'SUBMITTED',
    });

    return saved;
  }
}