import {
  BadGatewayException,
  Injectable,
  RequestTimeoutException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface OllamaResponse {
  response: string;
}

@Injectable()
export class OllamaService {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('OLLAMA_BASE_URL') ??
      'http://localhost:11434';

    this.model =
      this.configService.get<string>('OLLAMA_MODEL') ??
      'llama3.2:3b';
  }

  async generate(prompt: string): Promise<string> {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 120_000);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          format: 'json',
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BadGatewayException(
          `Ollama returned HTTP ${response.status}`,
        );
      }

      const data = (await response.json()) as OllamaResponse;

      return data.response;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new RequestTimeoutException('Ollama request timed out');
      }

      if (
        error instanceof BadGatewayException ||
        error instanceof RequestTimeoutException
      ) {
        throw error;
      }

      throw new BadGatewayException(
        'Unable to communicate with Ollama',
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}