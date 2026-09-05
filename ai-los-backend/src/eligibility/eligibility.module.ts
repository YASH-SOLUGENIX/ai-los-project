import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EligibilityController } from './eligibility.controller';
import { EligibilityService } from './eligibility.service';

import { LoanApplication } from '../applications/entities/loan-application.entity';
import { LoanProduct } from '../loan-products/entities/loan-product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoanApplication,
      LoanProduct,
    ]),
  ],
  controllers: [EligibilityController],
  providers: [EligibilityService],
})
export class EligibilityModule {}