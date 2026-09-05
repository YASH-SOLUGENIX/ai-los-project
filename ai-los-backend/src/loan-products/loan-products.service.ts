import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoanProduct } from './entities/loan-product.entity';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';
import { UpdateLoanProductDto } from './dto/update-loan-product.dto';

@Injectable()
export class LoanProductsService {
  constructor(
    @InjectRepository(LoanProduct)
    private readonly loanProductRepository: Repository<LoanProduct>,
  ) {}

  async create(createLoanProductDto: CreateLoanProductDto) {
    const loanProduct = this.loanProductRepository.create(
      createLoanProductDto,
    );

    return this.loanProductRepository.save(loanProduct);
  }

  async findAll() {
    return this.loanProductRepository.find({
      where: {
        isActive: true,
      },
    });
  }
  async findOne(id: number) {
  return this.loanProductRepository.findOne({
    where: {
      id,
      isActive: true,
    },
  });
}
async update(
  id: number,
  updateLoanProductDto: UpdateLoanProductDto,
  ) {
  await this.loanProductRepository.update(
    id,
    updateLoanProductDto,
  );

  return this.loanProductRepository.findOne({
    where: {
      id,
    },
  });
 }

 async deactivate(id: number) {
  await this.loanProductRepository.update(id, {
    isActive: false,
  });

  return {
    message: 'Loan product deactivated successfully',
  };
 }
}