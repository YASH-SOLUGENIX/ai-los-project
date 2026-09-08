import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('policy_documents')
export class PolicyDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  filePath: string;

  @Column()
  mimeType: string;

  @CreateDateColumn()
  createdAt: Date;
}