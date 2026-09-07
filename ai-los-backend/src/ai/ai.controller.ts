import {
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AiService } from './ai.service';

import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('applications')
export class AiController {
  constructor(
    private readonly aiService: AiService,
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
}