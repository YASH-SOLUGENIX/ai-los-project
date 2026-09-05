import {
  Body,
  Controller,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { DecisionsService } from './decisions.service';
import { MakeDecisionDto } from './dto/make-decision.dto';

import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import type { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';

@Controller('applications')
export class DecisionsController {
  constructor(
    private readonly decisionsService: DecisionsService,
  ) {}

  @Post(':id/decision')
  @Roles('manager')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  makeDecision(
    @Param('id') id: string,
    @Request() request: AuthenticatedRequest,
    @Body() dto: MakeDecisionDto,
  ) {
    const managerId = request.user.sub;

    return this.decisionsService.makeDecision(
      Number(id),
      managerId,
      dto.decision,
      dto.reason,
    );
  }
}