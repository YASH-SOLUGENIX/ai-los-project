import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { ClarificationsService } from './clarifications.service';
import { CreateClarificationDto } from './dto/create-clarification.dto';
import { RespondClarificationDto } from './dto/respond-clarification.dto';
import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';

@Controller('applications')
@UseGuards(KeycloakAuthGuard)
export class ClarificationsController {
  constructor(
    private readonly clarificationsService: ClarificationsService,
  ) {}

  @Post(':applicationId/clarifications')
  @Roles('loan_officer')
  @UseGuards(RolesGuard)
  createClarification(
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateClarificationDto,
  ) {
    return this.clarificationsService.createClarification(
      applicationId,
      request.user.sub,
      dto,
    );
  }

  @Post('clarifications/:clarificationId/respond')
  @Roles('customer')
  @UseGuards(RolesGuard)
  respondToClarification(
    @Param('clarificationId', ParseIntPipe) clarificationId: number,
    @Request() request: AuthenticatedRequest,
    @Body() dto: RespondClarificationDto,
  ) {
    return this.clarificationsService.respondToClarification(
      clarificationId,
      request.user.sub,
      dto,
    );
  }

  @Get(':applicationId/clarifications')
  @Roles('customer', 'loan_officer', 'manager', 'auditor', 'admin')
  @UseGuards(RolesGuard)
  getApplicationClarifications(
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @Request() request: AuthenticatedRequest,
  ) {
    const roles = request.user.realm_access?.roles ?? [];
    return this.clarificationsService.getApplicationClarifications(
      applicationId,
      request.user.sub,
      roles,
    );
  }
} 