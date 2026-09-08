import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OllamaService } from './ollama.service';
import { PdfTextExtractorService } from './rag/pdf-text-extractor.service';

import { LoanApplication } from '../applications/entities/loan-application.entity';
import { LoanDocument } from '../documents/entities/loan-document.entity';
import { AIAssessment } from './entities/ai-assessment.entity';
import { DocumentChunk } from './entities/document-chunk.entity';
import { ChunkingService } from './rag/chunking.service';
import { RagIngestionService } from './rag/rag-ingestion.service';
import { OllamaEmbeddingService } from './ollama-embedding.service';
import { RagRetrievalService } from './rag/rag-retrieval.service';
import { AiRecommendationService } from './ai-recommendation.service';
import { PolicyDocument } from './entities/policy-document.entity';
import { PolicyChunk } from './entities/policy-chunk.entity';
import { PolicyIngestionService } from './rag/policy-ingestion.service';
import { PolicyController } from './policy.controller';
import { PolicyRetrievalService } from './rag/policy-retrieval.service';
import { EligibilityModule } from '../eligibility/eligibility.module';

@Module({
  imports: [
    ConfigModule,
    EligibilityModule,
    TypeOrmModule.forFeature([
      LoanApplication,
      LoanDocument,
      AIAssessment,
      DocumentChunk,
      PolicyDocument,
      PolicyChunk
    ]),
  ],

  controllers: [AiController, PolicyController],

  providers: [
    AiService,
    OllamaService,
    OllamaEmbeddingService,
    PdfTextExtractorService,
    ChunkingService,
    RagIngestionService,
    RagRetrievalService,
    AiRecommendationService,
    PolicyIngestionService,
    PolicyRetrievalService,  
  ],
})
export class AiModule {}