import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Param,
  Patch,
  Delete
} from '@nestjs/common';

import { LoanProductsService } from './loan-products.service';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';

import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateLoanProductDto } from './dto/update-loan-product.dto';

@Controller('loan-products')
export class LoanProductsController {
  constructor(
    private readonly loanProductsService: LoanProductsService,
  ) {}

  @Get()
  @UseGuards(KeycloakAuthGuard)
  findAll() {
    return this.loanProductsService.findAll();
  }
  @Get(':id')
  @UseGuards(KeycloakAuthGuard)
  findOne(@Param('id') id: string) {
   return this.loanProductsService.findOne(Number(id));
  }

  @Post()
  @Roles('manager')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  create(@Body() createLoanProductDto: CreateLoanProductDto) {
    return this.loanProductsService.create(createLoanProductDto);
  }

  @Patch(':id')
  @Roles('manager')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  update(
  @Param('id') id: string,
  @Body() updateLoanProductDto: UpdateLoanProductDto,
  ) {
  return this.loanProductsService.update(
      Number(id),
      updateLoanProductDto,
  );
  }

  @Delete(':id')
  @Roles('manager')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  deactivate(@Param('id') id: string) {
    return this.loanProductsService.deactivate(Number(id));
  }
}