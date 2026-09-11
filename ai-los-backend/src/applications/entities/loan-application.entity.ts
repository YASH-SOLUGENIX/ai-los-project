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

  @Column({ nullable: true })
  applicantName: string;

  @Column({ nullable: true })
  applicantAge: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  monthlyIncome: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  monthlyObligations: number;

  @Column({ nullable: true })
  employmentType: string;

  @Column({ nullable: true })
  employerName: string;

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}