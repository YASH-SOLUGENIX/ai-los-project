import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PolicyDocument } from '../entities/policy-document.entity';
import { PolicyChunk } from '../entities/policy-chunk.entity';

import { PdfTextExtractorService } from './pdf-text-extractor.service';
import { ChunkingService } from './chunking.service';
import { OllamaEmbeddingService } from '../ollama-embedding.service';

@Injectable()
export class PolicyIngestionService {
  constructor(
    @InjectRepository(PolicyDocument)
    private readonly policyDocumentRepository: Repository<PolicyDocument>,

    @InjectRepository(PolicyChunk)
    private readonly policyChunkRepository: Repository<PolicyChunk>,

    private readonly pdfTextExtractor: PdfTextExtractorService,

    private readonly chunkingService: ChunkingService,

    private readonly ollamaEmbeddingService: OllamaEmbeddingService,
  ) {}

  async ingestPolicy(policyDocumentId: number) {
    const policyDocument =
      await this.policyDocumentRepository.findOne({
        where: {
          id: policyDocumentId,
        },
      });

    if (!policyDocument) {
      throw new NotFoundException(
        'Policy document not found',
      );
    }

    const text =
      await this.pdfTextExtractor.extractText(
        policyDocument.filePath,
      );

    const chunks =
      this.chunkingService.splitText(text);

    await this.policyChunkRepository.delete({
      policyDocumentId,
    });

    const savedChunks =
      await this.policyChunkRepository.save(
        chunks.map((content, index) =>
          this.policyChunkRepository.create({
            policyDocumentId,
            chunkIndex: index,
            content,
            source: policyDocument.filePath,
          }),
        ),
      );

    for (const chunk of savedChunks) {
      const embedding =
        await this.ollamaEmbeddingService.generateEmbedding(
          chunk.content,
        );

      const vector = `[${embedding.join(',')}]`;

      await this.policyChunkRepository.query(
        `
          UPDATE policy_chunks
          SET embedding = $1::vector
          WHERE id = $2
        `,
        [vector, chunk.id],
      );
    }

    return savedChunks;
  }
}