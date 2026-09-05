import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';

import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
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
  findMyApplications(
  @Request() request: AuthenticatedRequest,
  ) {
  const customerId = request.user.sub;

  return this.applicationsService.findMyApplications(
    customerId,
  );
}

  @Get(':id')
@UseGuards(KeycloakAuthGuard)
findOne(
  @Param('id') id: string,
  @Request() request: AuthenticatedRequest,
) {
  const customerId = request.user.sub;

  return this.applicationsService.findOne(
    Number(id),
    customerId,
  );
}

@Post(':id/submit')
@UseGuards(KeycloakAuthGuard)
submit(
  @Param('id') id: string,
  @Request() request: AuthenticatedRequest,
) {
  const customerId = request.user.sub;

  return this.applicationsService.submit(
    Number(id),
    customerId,
  );
}

} 