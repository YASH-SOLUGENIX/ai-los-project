import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('loan_officers')
export class LoanOfficer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  employeeId: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  fullName: string;

  @Column({ default: 'MAIN-BRANCH' })
  branchCode: string;

  @Column({ default: 'Retail Lending' })
  department: string;

  @Column('decimal', { precision: 12, scale: 2, default: 1000000.00 })
  maxReviewAmount: number;

  @Column({ nullable: true, unique: true })
  keycloakId: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
