import {
  Body,
  Controller,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import type { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';

@Controller('applications')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
  ) {}

  @Post(':id/review')
  @Roles('loan_officer')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  createReview(
    @Param('id') id: string,
    @Request() request: AuthenticatedRequest,
    @Body() dto: CreateReviewDto,
  ) {
    const officerId = request.user.sub;

    return this.reviewsService.createReview(
      Number(id),
      officerId,
      dto,
    );
  }
}