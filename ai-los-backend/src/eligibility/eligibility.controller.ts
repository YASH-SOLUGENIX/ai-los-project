import {
  Body,
  Controller,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { EligibilityService } from './eligibility.service';
import { CheckEligibilityDto } from './dto/check-eligibility.dto';

import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';

@Controller('applications')
export class EligibilityController {
  constructor(
    private readonly eligibilityService: EligibilityService,
  ) {}

  @Post(':id/eligibility')
  @UseGuards(KeycloakAuthGuard)
  checkEligibility(
    @Param('id') id: string,
    @Request() request: AuthenticatedRequest,
    @Body() dto: CheckEligibilityDto,
  ) {
    const customerId = request.user.sub;

    return this.eligibilityService.checkEligibility(
      Number(id),
      customerId,
      dto,
    );
  }
}