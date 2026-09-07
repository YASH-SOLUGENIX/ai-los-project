import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('ai_assessments')
export class AIAssessment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  applicationId: number;

  @Column()
  promptVersion: string;

  @Column()
  model: string;

  @Column()
  inputHash: string;

  @Column('jsonb')
  outputJson: object;

  @CreateDateColumn()
  createdAt: Date;
}