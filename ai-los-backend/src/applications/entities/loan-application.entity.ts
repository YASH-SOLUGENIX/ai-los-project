import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('loan_applications')
export class LoanApplication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  customerId: string;

  @Column()
  loanProductId: number;

  @Column('decimal', { precision: 12, scale: 2 })
  requestedAmount: number;

  @Column()
  requestedTenureMonths: number;

  @Column({ default: 'DRAFT' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}