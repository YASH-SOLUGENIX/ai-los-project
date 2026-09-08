import {
  BadGatewayException,
  Injectable,
  RequestTimeoutException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

interface OllamaEmbeddingResponse {
  embeddings: number[][];
}

@Injectable()
export class OllamaEmbeddingService {
  private readonly baseUrl: string;
  private readonly model = 'nomic-embed-text';

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('OLLAMA_BASE_URL') ??
      'http://localhost:11434';
  }

  async generateEmbedding(
    text: string,
  ): Promise<number[]> {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 60_000);

    try {
      const response = await fetch(
        `${this.baseUrl}/api/embed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            input: text,
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new BadGatewayException(
          `Ollama embedding request failed: HTTP ${response.status}`,
        );
      }

      const data =
        (await response.json()) as OllamaEmbeddingResponse;

      const embedding = data.embeddings?.[0];

      if (!embedding || embedding.length === 0) {
        throw new BadGatewayException(
          'Ollama returned an empty embedding',
        );
      }

      return embedding;
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        throw new RequestTimeoutException(
          'Ollama embedding request timed out',
        );
      }

      if (
        error instanceof BadGatewayException ||
        error instanceof RequestTimeoutException
      ) {
        throw error;
      }

      throw new BadGatewayException(
        'Unable to generate embedding with Ollama',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}