import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DecisionsController } from './decisions.controller';
import { DecisionsService } from './decisions.service';

import { LoanDecision } from './entities/loan-decision.entity';
import { LoanApplication } from '../applications/entities/loan-application.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoanDecision,
      LoanApplication,
    ]),
  ],
  controllers: [DecisionsController],
  providers: [DecisionsService],
})
export class DecisionsModule {}