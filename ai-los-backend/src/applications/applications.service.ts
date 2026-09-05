import {  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoanApplication } from './entities/loan-application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { LoanDocument } from '../documents/entities/loan-document.entity';

@Injectable()
export class ApplicationsService {
  constructor(
  @InjectRepository(LoanApplication)
  private readonly applicationRepository: Repository<LoanApplication>,

  @InjectRepository(LoanDocument)
  private readonly documentRepository: Repository<LoanDocument>,
) {}

  async create(
    customerId: string,
    createApplicationDto: CreateApplicationDto,
  ) {
    const application = this.applicationRepository.create({
      customerId,
      loanProductId: createApplicationDto.loanProductId,
      requestedAmount: createApplicationDto.requestedAmount,
      requestedTenureMonths:
        createApplicationDto.requestedTenureMonths,
      status: 'DRAFT',
    });

    return this.applicationRepository.save(application);
  }

  async findMyApplications(customerId: string) {
  return this.applicationRepository.find({
    where: {
      customerId,
    },
    order: {
      createdAt: 'DESC',
    },
   });
 }

 async findOne(id: number, customerId: string) {
  const application = await this.applicationRepository.findOne({
    where: {
      id,
    },
  });

  if (!application) {
    throw new NotFoundException('Application not found');
  }

  if (application.customerId !== customerId) {
    throw new ForbiddenException(
      'You do not have access to this application',
    );
  }

  return application;
}

async submit(id: number, customerId: string) {
  const application = await this.applicationRepository.findOne({
    where: {
      id,
    },
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

  return this.applicationRepository.save(application);
}

}