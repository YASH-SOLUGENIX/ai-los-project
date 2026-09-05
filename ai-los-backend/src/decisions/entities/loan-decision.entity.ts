import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('loan_decisions')
export class LoanDecision {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  applicationId: number;

  @Column()
  managerId: string;

  @Column()
  decision: string;

  @Column('text')
  reason: string;

  @Column({ nullable: true })
  aiRecommendation: string;

  @Column('text', { nullable: true })
  aiRationale: string;

  @CreateDateColumn()
  decidedAt: Date;
}