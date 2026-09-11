import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoanDecision } from './entities/loan-decision.entity';
import { LoanApplication } from '../applications/entities/loan-application.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DecisionsService {
  constructor(
    @InjectRepository(LoanDecision)
    private readonly decisionRepository: Repository<LoanDecision>,

    @InjectRepository(LoanApplication)
    private readonly applicationRepository: Repository<LoanApplication>,

    private readonly auditService: AuditService,
  ) {}

  async makeDecision(
    applicationId: number,
    managerId: string,
    decision: string,
    reason: string,
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

    // 2. Application must be in manager review
    if (application.status !== 'OFFICER_RECOMMENDED') {
      throw new BadRequestException(
        'Only officer-recommended applications can be decided',
      );
    }

    // 3. Validate decision
    const allowedDecisions = [
      'APPROVE',
      'REJECT',
      'RETURN',
    ];

    if (!allowedDecisions.includes(decision)) {
      throw new BadRequestException(
        'Decision must be APPROVE, REJECT, or RETURN',
      );
    }

    // 4. Reason is mandatory
    if (!reason || !reason.trim()) {
      throw new BadRequestException(
        'Decision reason is required',
      );
    }

    // 5. Save manager decision
    const managerDecision = this.decisionRepository.create({
      applicationId,
      managerId,
      decision,
      reason,
    });

    const savedDecision =
      await this.decisionRepository.save(managerDecision);

    // 6. Update application status
    const beforeState = application.status;
    if (decision === 'APPROVE') {
      application.status = 'MANAGER_APPROVED';
    } else if (decision === 'REJECT') {
      application.status = 'MANAGER_REJECTED';
    } else {
      application.status = 'UNDER_REVIEW';
    }

    await this.applicationRepository.save(application);

    await this.auditService.recordEvent({
      applicationId,
      eventType: 'MANAGER_DECISION_RECORDED',
      actorId: managerId,
      actorRole: 'manager',
      details: {
        decision,
        reason,
      },
      beforeState,
      afterState: application.status,
    });

    return {
      message: 'Manager decision recorded successfully',
      decision: savedDecision,
      applicationStatus: application.status,
    };
  }
}