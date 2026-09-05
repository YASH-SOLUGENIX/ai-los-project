import { Test, TestingModule } from '@nestjs/testing';
import { LoanProductsController } from './loan-products.controller';

describe('LoanProductsController', () => {
  let controller: LoanProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoanProductsController],
    }).compile();

    controller = module.get<LoanProductsController>(LoanProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
