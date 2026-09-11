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
    dto: Partial<CheckEligibilityDto> = {},
    userRoles: string[] = [],
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

    const isStaff =
      userRoles.includes('loan_officer') ||
      userRoles.includes('manager') ||
      userRoles.includes('auditor') ||
      userRoles.includes('admin');

    // 2. Make sure customer owns application unless staff
    if (!isStaff && application.customerId !== customerId) {
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

    const age = Number(dto.age ?? application.applicantAge ?? 25);
    const monthlyIncome =
      dto.monthlyIncome !== undefined
        ? Number(dto.monthlyIncome)
        : application.monthlyIncome
          ? Number(application.monthlyIncome)
          : 50000;
    const monthlyObligations =
      dto.monthlyObligations !== undefined
        ? Number(dto.monthlyObligations)
        : application.monthlyObligations
          ? Number(application.monthlyObligations)
          : 0;

    const principal = Number(application.requestedAmount);
    const minAmount = Number(loanProduct.minAmount);
    const maxAmount = Number(loanProduct.maxAmount);
    const requestedTenureMonths = Number(application.requestedTenureMonths);
    const minTenureMonths = Number(loanProduct.minTenureMonths);
    const maxTenureMonths = Number(loanProduct.maxTenureMonths);
    const maxMaturityAge = Number(loanProduct.maxMaturityAge ?? 65);

    const reasonCodes: string[] = [];

    // 4. Age check
    if (age < 21) {
      reasonCodes.push('AGE_BELOW_MINIMUM');
    }

    // 5. Maturity age check
    const maturityAge =
      age + requestedTenureMonths / 12;

    if (maturityAge > maxMaturityAge) {
      reasonCodes.push('MATURITY_AGE_ABOVE_MAXIMUM');
    }

    // 6. Loan amount check
    if (principal < minAmount) {
      reasonCodes.push('AMOUNT_BELOW_MINIMUM');
    }

    if (principal > maxAmount) {
      reasonCodes.push('AMOUNT_ABOVE_MAXIMUM');
    }

    // 7. Tenure check
    if (requestedTenureMonths < minTenureMonths) {
      reasonCodes.push('TENURE_BELOW_MINIMUM');
    }

    if (requestedTenureMonths > maxTenureMonths) {
      reasonCodes.push('TENURE_ABOVE_MAXIMUM');
    }

    // 8. Calculate estimated EMI
    const monthlyInterestRate =
      Number(loanProduct.interestRate) / 12 / 100;

    const numberOfMonths = requestedTenureMonths;

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

    // 9. Calculate DTI
    const dti =
      ((monthlyObligations + emi) /
        monthlyIncome) *
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
        age,
        maturityAge: Number(maturityAge.toFixed(2)),
        maxMaturityAge,
        requestedAmount: principal,
        requestedTenureMonths: numberOfMonths,
        estimatedEmi: Number(emi.toFixed(2)),
        monthlyIncome,
        monthlyObligations,
        dti: Number(dti.toFixed(2)),
        maxDti,
      },
    };
  }

  async getDeterministicResult(
    applicationId: number,
    age: number,
    monthlyIncome: number,
    monthlyObligations: number,
  ) {
    const application = await this.applicationRepository.findOne({
      where: {
        id: applicationId,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const loanProduct = await this.loanProductRepository.findOne({
      where: {
        id: application.loanProductId,
        isActive: true,
      },
    });

    if (!loanProduct) {
      throw new NotFoundException('Loan product not found');
    }

    const numAge = Number(age ?? 25);
    const numIncome = Number(monthlyIncome || 50000);
    const numObligations = Number(monthlyObligations || 0);

    const principal = Number(application.requestedAmount);
    const minAmount = Number(loanProduct.minAmount);
    const maxAmount = Number(loanProduct.maxAmount);
    const requestedTenureMonths = Number(application.requestedTenureMonths);
    const minTenureMonths = Number(loanProduct.minTenureMonths);
    const maxTenureMonths = Number(loanProduct.maxTenureMonths);
    const maxMaturityAge = Number(loanProduct.maxMaturityAge ?? 65);

    const reasonCodes: string[] = [];

    if (numAge < 21) {
      reasonCodes.push('AGE_BELOW_MINIMUM');
    }

    // Maturity age check
    const maturityAge =
      numAge + requestedTenureMonths / 12;

    if (maturityAge > maxMaturityAge) {
      reasonCodes.push('MATURITY_AGE_ABOVE_MAXIMUM');
    }

    if (principal < minAmount) {
      reasonCodes.push('AMOUNT_BELOW_MINIMUM');
    }

    if (principal > maxAmount) {
      reasonCodes.push('AMOUNT_ABOVE_MAXIMUM');
    }

    if (requestedTenureMonths < minTenureMonths) {
      reasonCodes.push('TENURE_BELOW_MINIMUM');
    }

    if (requestedTenureMonths > maxTenureMonths) {
      reasonCodes.push('TENURE_ABOVE_MAXIMUM');
    }

    const monthlyInterestRate =
      Number(loanProduct.interestRate) / 12 / 100;

    const numberOfMonths = requestedTenureMonths;

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

    const dti =
      ((numObligations + emi) /
        numIncome) *
      100;

    const maxDti = 50;

    if (dti > maxDti) {
      reasonCodes.push('DTI_ABOVE_LIMIT');
    }

    return {
      eligible: reasonCodes.length === 0,
      reasonCodes,
      details: {
        age: numAge,
        maturityAge: Number(maturityAge.toFixed(2)),
        maxMaturityAge,
        requestedAmount: principal,
        requestedTenureMonths: numberOfMonths,
        estimatedEmi: Number(emi.toFixed(2)),
        monthlyIncome: numIncome,
        monthlyObligations: numObligations,
        dti: Number(dti.toFixed(2)),
        maxDti,
      },
    };
  }
}