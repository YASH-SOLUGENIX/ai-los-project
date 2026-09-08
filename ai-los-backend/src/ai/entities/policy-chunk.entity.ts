import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('policy_chunks')
export class PolicyChunk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  policyDocumentId: number;

  @Column()
  chunkIndex: number;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  pageNumber?: number;

  @Column({ nullable: true })
  source?: string;
}