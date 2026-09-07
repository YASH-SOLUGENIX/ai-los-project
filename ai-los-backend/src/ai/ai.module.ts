import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OllamaService } from './ollama.service';

import { LoanApplication } from '../applications/entities/loan-application.entity';
import { LoanDocument } from '../documents/entities/loan-document.entity';
import { AIAssessment } from './entities/ai-assessment.entity';

@Module({
  imports: [
    ConfigModule,

    TypeOrmModule.forFeature([
      LoanApplication,
      LoanDocument,
      AIAssessment,
    ]),
  ],

  controllers: [AiController],

  providers: [
    AiService,
    OllamaService,
  ],
})
export class AiModule {}