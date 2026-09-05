import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoanApplication } from '../applications/entities/loan-application.entity';
import { LoanProduct } from '../loan-products/entities/loan-product.entity';
import { CheckEligibilityDto } from './dto/check-eligibility.dto';

@Injectable()
export class EligibilityService {
  constructor(
    @InjectRepository(LoanApplication)
    private readonly applicationRepository: Repository<LoanApplication>,

    @InjectRepository(LoanProduct)
    private readonly loanProductRepository: Repository<LoanProduct>,
  ) {}

  async checkEligibility(
    applicationId: number,
    customerId: string,
    dto: CheckEligibilityDto,
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

    // 2. Make sure customer owns application
    if (application.customerId !== customerId) {
      throw new BadRequestException(
        'You do not have access to this application',
      );
    }

    // 3. Find loan product
    const loanProduct = await this.loanProductRepository.findOne({
      where: {
        id: application.loanProductId,
        isActive: true,
      },
    });

    if (!loanProduct) {
      throw new NotFoundException('Loan product not found');
    }

    const reasonCodes: string[] = [];

    // 4. Age check
    if (dto.age < 21) {
      reasonCodes.push('AGE_BELOW_MINIMUM');
    }

    // 5. Loan amount check
    if (application.requestedAmount < loanProduct.minAmount) {
      reasonCodes.push('AMOUNT_BELOW_MINIMUM');
    }

    if (application.requestedAmount > loanProduct.maxAmount) {
      reasonCodes.push('AMOUNT_ABOVE_MAXIMUM');
    }

    // 6. Tenure check
    if (
      application.requestedTenureMonths <
      loanProduct.minTenureMonths
    ) {
      reasonCodes.push('TENURE_BELOW_MINIMUM');
    }

    if (
      application.requestedTenureMonths >
      loanProduct.maxTenureMonths
    ) {
      reasonCodes.push('TENURE_ABOVE_MAXIMUM');
    }

    // 7. Calculate estimated EMI
    const monthlyInterestRate =
      Number(loanProduct.interestRate) / 12 / 100;

    const numberOfMonths =
      application.requestedTenureMonths;

    const principal = Number(application.requestedAmount);

    const emi =
      monthlyInterestRate === 0
        ? principal / numberOfMonths
        : (principal *
            monthlyInterestRate *
            Math.pow(
              1 + monthlyInterestRate,
              numberOfMonths,
            )) /
          (Math.pow(
            1 + monthlyInterestRate,
            numberOfMonths,
          ) - 1);

    // 8. Calculate DTI
    const dti =
      ((dto.monthlyObligations + emi) /
        dto.monthlyIncome) *
      100;

    // MVP DTI limit
    const maxDti = 50;

    if (dti > maxDti) {
      reasonCodes.push('DTI_ABOVE_LIMIT');
    }

    return {
      eligible: reasonCodes.length === 0,
      reasonCodes,
      details: {
        age: dto.age,
        requestedAmount: principal,
        requestedTenureMonths: numberOfMonths,
        estimatedEmi: Number(emi.toFixed(2)),
        monthlyIncome: dto.monthlyIncome,
        monthlyObligations: dto.monthlyObligations,
        dti: Number(dti.toFixed(2)),
        maxDti,
      },
    };
  }
}