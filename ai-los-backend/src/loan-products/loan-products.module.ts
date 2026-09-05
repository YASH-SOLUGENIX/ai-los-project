import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoanProductsController } from './loan-products.controller';
import { LoanProductsService } from './loan-products.service';
import { LoanProduct } from './entities/loan-product.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([LoanProduct]),
  ],
  controllers: [LoanProductsController],
  providers: [LoanProductsService],
})
export class LoanProductsModule {}