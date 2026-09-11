import {
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  Body
} from '@nestjs/common';

import { AiService } from './ai.service';
import { RagIngestionService } from './rag/rag-ingestion.service';

import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RagRetrievalService } from './rag/rag-retrieval.service';
import { AiRecommendationService } from './ai-recommendation.service';
import { CheckEligibilityDto } from '../eligibility/dto/check-eligibility.dto';

@Controller('applications')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly ragIngestionService: RagIngestionService,
    private readonly ragRetrievalService: RagRetrievalService,
    private readonly aiRecommendationService: AiRecommendationService,
  ) {}

  @Post(':id/ai-summary')
  @Roles('loan_officer')
  @UseGuards(
    KeycloakAuthGuard,
    RolesGuard,
  )
  generateApplicationSummary(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.aiService.generateApplicationSummary(id);
  }

  @Post('rag/ingest/:documentId')
  @Roles('loan_officer')
  @UseGuards(
    KeycloakAuthGuard,
    RolesGuard,
  )
  async ingestDocument(
    @Param('documentId', ParseIntPipe) documentId: number,
  ) {
    return this.ragIngestionService.ingestDocument(
      documentId,
    );
  }
@Post('rag/search')
@Roles('loan_officer')
@UseGuards(
  KeycloakAuthGuard,
  RolesGuard,
)
searchRag(
  @Body('question') question: string,
) {
  return this.ragRetrievalService.search(question);
}

  @Post(':id/ai-recommendation')
  @Roles('loan_officer', 'manager')
  @UseGuards(
    KeycloakAuthGuard,
    RolesGuard,
  )
  recommend(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CheckEligibilityDto>,
  ) {
    return this.aiRecommendationService.recommend(
      id,
      dto,
    );
  }

  @Post(':id/ai-explain')
  @UseGuards(KeycloakAuthGuard)
  explainStatus(@Param('id', ParseIntPipe) id: number) {
    return this.aiService.explainStatus(id);
  }

  @Post(':id/ai-clarify-draft')
  @Roles('loan_officer')
  @UseGuards(
    KeycloakAuthGuard,
    RolesGuard,
  )
  draftClarification(@Param('id', ParseIntPipe) id: number) {
    return this.aiService.draftClarification(id);
  }
}