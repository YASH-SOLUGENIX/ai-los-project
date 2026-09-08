import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DocumentChunk } from '../entities/document-chunk.entity';
import { OllamaEmbeddingService } from '../ollama-embedding.service';

@Injectable()
export class RagRetrievalService {
  constructor(
    @InjectRepository(DocumentChunk)
    private readonly chunkRepository: Repository<DocumentChunk>,

    private readonly ollamaEmbeddingService: OllamaEmbeddingService,
  ) {}

  async search(
    question: string,
    limit = 3,
  ) {
    const embedding =
      await this.ollamaEmbeddingService.generateEmbedding(
        question,
      );

    const vector = `[${embedding.join(',')}]`;

    return this.chunkRepository.query(
      `
        SELECT
          id,
          "documentName",
          "chunkIndex",
          content,
          "pageNumber",
          source,
          1 - (embedding <=> $1::vector) AS similarity
        FROM document_chunks
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `,
      [vector, limit],
    );
  }
}