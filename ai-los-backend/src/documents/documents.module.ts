import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { LoanDocument } from './entities/loan-document.entity';
import { LoanApplication } from '../applications/entities/loan-application.entity';

@Module({
  imports: [
  TypeOrmModule.forFeature([
    LoanDocument,
    LoanApplication,
  ]),
],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}