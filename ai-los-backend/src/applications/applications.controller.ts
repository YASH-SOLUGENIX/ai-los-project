import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';

@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
  ) {}

  @Post()
  @UseGuards(KeycloakAuthGuard)
  create(
    @Request() request: AuthenticatedRequest,
    @Body() createApplicationDto: CreateApplicationDto,
  ) {
    const customerId = request.user.sub;

    return this.applicationsService.create(
      customerId,
      createApplicationDto,
    );
  }

  @Get('my')
  @UseGuards(KeycloakAuthGuard)
  findMyApplications(@Request() request: AuthenticatedRequest) {
    const customerId = request.user.sub;

    return this.applicationsService.findMyApplications(customerId);
  }

  @Get('work-queues')
  @Roles('loan_officer', 'manager', 'auditor', 'admin')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  getWorkQueues(
    @Request() request: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const roles = request.user.realm_access?.roles ?? [];
    return this.applicationsService.getWorkQueues(roles, { status, search });
  }

  @Get(':id')
  @UseGuards(KeycloakAuthGuard)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() request: AuthenticatedRequest,
  ) {
    const userId = request.user.sub;
    const roles = request.user.realm_access?.roles ?? [];

    return this.applicationsService.findOne(id, userId, roles);
  }

  @Patch(':id')
  @UseGuards(KeycloakAuthGuard)
  updateDraft(
    @Param('id', ParseIntPipe) id: number,
    @Request() request: AuthenticatedRequest,
    @Body() updateApplicationDto: UpdateApplicationDto,
  ) {
    const customerId = request.user.sub;

    return this.applicationsService.updateDraft(
      id,
      customerId,
      updateApplicationDto,
    );
  }

  @Post(':id/review-start')
  @Roles('loan_officer')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  startReview(
    @Param('id', ParseIntPipe) id: number,
    @Request() request: AuthenticatedRequest,
  ) {
    const officerId = request.user.sub;
    return this.applicationsService.markUnderReview(id, officerId);
  }

  @Post(':id/submit')
  @UseGuards(KeycloakAuthGuard)
  submit(
    @Param('id', ParseIntPipe) id: number,
    @Request() request: AuthenticatedRequest,
  ) {
    const customerId = request.user.sub;

    return this.applicationsService.submit(
      id,
      customerId,
    );
  }
}