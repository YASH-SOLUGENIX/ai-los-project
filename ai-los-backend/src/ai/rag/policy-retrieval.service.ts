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

    const questionUpper = question.toUpperCase();

    let policyFocus = 'GENERAL';

    if (
      questionUpper.includes('DTI_ABOVE_LIMIT') ||
      questionUpper.includes('DTI') ||
      questionUpper.includes('DEBT-TO-INCOME')
    ) {
      policyFocus = 'DTI';
    } else if (
      questionUpper.includes('AMOUNT_BELOW_MINIMUM') ||
      questionUpper.includes('AMOUNT_ABOVE_MAXIMUM') ||
      questionUpper.includes('LOAN AMOUNT')
    ) {
      policyFocus = 'AMOUNT';
    } else if (
      questionUpper.includes('TENURE_BELOW_MINIMUM') ||
      questionUpper.includes('TENURE_ABOVE_MAXIMUM') ||
      questionUpper.includes('TENURE')
    ) {
      policyFocus = 'TENURE';
    } else if (
      questionUpper.includes('AGE_BELOW_MINIMUM') ||
      questionUpper.includes('MATURITY_AGE') ||
      questionUpper.includes('AGE')
    ) {
      policyFocus = 'AGE';
    }

    return this.policyChunkRepository.query(
      `
        SELECT
          id,
          "policyDocumentId",
          "chunkIndex",
          content,
          "pageNumber",
          source,

          CASE
            WHEN $3 = 'DTI'
              AND (
                content ILIKE '%DTI%'
                OR content ILIKE '%debt-to-income%'
              )
            THEN 1

            WHEN $3 = 'AMOUNT'
              AND (
                content ILIKE '%amount%'
                OR content ILIKE '%loan amount%'
              )
            THEN 1

            WHEN $3 = 'TENURE'
              AND content ILIKE '%tenure%'
            THEN 1

            WHEN $3 = 'AGE'
              AND (
                content ILIKE '%age%'
                OR content ILIKE '%maturity%'
              )
            THEN 1

            ELSE 0
          END AS policy_focus,

          1 - (embedding <=> $1::vector) AS similarity

        FROM policy_chunks

        WHERE embedding IS NOT NULL

        ORDER BY
          policy_focus DESC,
          embedding <=> $1::vector

        LIMIT $2
      `,
      [vector, limit, policyFocus],
    );
  }
}