import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PolicyChunk } from '../entities/policy-chunk.entity';
import { OllamaEmbeddingService } from '../ollama-embedding.service';

@Injectable()
export class PolicyRetrievalService {
  constructor(
    @InjectRepository(PolicyChunk)
    private readonly policyChunkRepository: Repository<PolicyChunk>,

    private readonly ollamaEmbeddingService: OllamaEmbeddingService,
  ) {}

  async search(
    question: string,
    limit = 10,
  ) {
    const embedding =
      await this.ollamaEmbeddingService.generateEmbedding(
        question,
      );

    const vector = `[${embedding.join(',')}]`;

    return this.policyChunkRepository.query(
      `
        SELECT
          id,
          "policyDocumentId",
          "chunkIndex",
          content,
          "pageNumber",
          source,
          1 - (embedding <=> $1::vector) AS similarity
        FROM policy_chunks
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `,
      [vector, limit],
    );
  }
}