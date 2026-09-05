import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('loan_reviews')
export class LoanReview {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  applicationId: number;

  @Column()
  officerId: string;

  @Column()
  recommendation: string;

  @Column('text')
  rationale: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}