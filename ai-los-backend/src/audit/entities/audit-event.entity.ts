import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_events')
export class AuditEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  applicationId: number;

  @Column()
  eventType: string;

  @Column()
  actorId: string;

  @Column()
  actorRole: string;

  @Column('jsonb', { nullable: true })
  details: Record<string, any> | null;

  @Column({ nullable: true })
  beforeState: string;

  @Column({ nullable: true })
  afterState: string;

  @CreateDateColumn()
  createdAt: Date;
}
