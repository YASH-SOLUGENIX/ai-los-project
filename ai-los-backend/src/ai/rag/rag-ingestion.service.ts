import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoanDocument } from '../../documents/entities/loan-document.entity';
import { DocumentChunk } from '../entities/document-chunk.entity';

import { PdfTextExtractorService } from './pdf-text-extractor.service';
import { ChunkingService } from './chunking.service';
import { OllamaEmbeddingService } from '../ollama-embedding.service';

@Injectable()
export class RagIngestionService {
 constructor(
  @InjectRepository(LoanDocument)
  private readonly documentRepository: Repository<LoanDocument>,

  @InjectRepository(DocumentChunk)
  private readonly chunkRepository: Repository<DocumentChunk>,

  private readonly pdfTextExtractor: PdfTextExtractorService,

  private readonly chunkingService: ChunkingService,

  private readonly ollamaEmbeddingService: OllamaEmbeddingService,
) {}

  async ingestDocument(documentId: number) {
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
      },
    });

    if (!document) {
      throw new NotFoundException(
        'Document not found',
      );
    }

    const text = await this.pdfTextExtractor.extractText(
      document.filePath,
    );

    const chunks =
      this.chunkingService.splitText(text);

    await this.chunkRepository.delete({
      documentName: document.originalFileName,
    });

   const chunkEntities = chunks.map(
  (content, index) =>
    this.chunkRepository.create({
      documentName: document.originalFileName,
      chunkIndex: index,
      content,
      source: document.filePath,
    }),
);

const savedChunks =
  await this.chunkRepository.save(chunkEntities);

for (const chunk of savedChunks) {
  const embedding =
    await this.ollamaEmbeddingService.generateEmbedding(
      chunk.content,
    );

  const vector = `[${embedding.join(',')}]`;

  await this.chunkRepository.query(
    `
      UPDATE document_chunks
      SET embedding = $1::vector
      WHERE id = $2
    `,
    [vector, chunk.id],
  );
}

return savedChunks;

    return this.chunkRepository.save(
      chunkEntities,
    );
  }
}