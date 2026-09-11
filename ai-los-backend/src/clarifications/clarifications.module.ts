import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClarificationsController } from './clarifications.controller';
import { ClarificationsService } from './clarifications.service';
import { LoanClarification } from './entities/clarification.entity';
import { LoanApplication } from '../applications/entities/loan-application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoanClarification,
      LoanApplication,
    ]),
  ],
  controllers: [ClarificationsController],
  providers: [ClarificationsService],
})
export class ClarificationsModule {} 