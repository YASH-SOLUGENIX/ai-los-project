import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('loan_documents')
export class LoanDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  applicationId: number;

  @Column()
  documentType: string;

  @Column()
  originalFileName: string;

  @Column()
  storedFileName: string;

  @Column()
  filePath: string;

  @Column()
  mimeType: string;

  @Column()
  fileSize: number;

  @CreateDateColumn()
  uploadedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}