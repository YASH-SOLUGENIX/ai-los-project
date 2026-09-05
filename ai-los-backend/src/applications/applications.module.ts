import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { LoanApplication } from './entities/loan-application.entity';
import { LoanDocument } from '../documents/entities/loan-document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoanApplication,
       LoanDocument,
    ]),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}