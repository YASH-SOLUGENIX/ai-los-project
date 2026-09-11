import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('loan_products')
export class LoanProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('decimal', { precision: 12, scale: 2 })
  minAmount: number;

  @Column('decimal', { precision: 12, scale: 2 })
  maxAmount: number;

  @Column('decimal', { precision: 5, scale: 2 })
  interestRate: number;

  @Column()
  minTenureMonths: number;

  @Column()
  maxTenureMonths: number;

  @Column({ name: 'max_maturity_age' })
  maxMaturityAge: number;

  @Column({ default: true })
  isActive: boolean;
}