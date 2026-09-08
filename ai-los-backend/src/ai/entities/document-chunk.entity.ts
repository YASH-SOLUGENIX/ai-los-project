import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_chunks')
export class DocumentChunk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  documentName: string;

  @Column()
  chunkIndex: number;

  @Column('text')
  content: string;

  @Column({ nullable: true })
  pageNumber?: number;

  @Column({ nullable: true })
  source?: string;
}