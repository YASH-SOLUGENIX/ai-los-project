import { Injectable } from '@nestjs/common';

@Injectable()
export class ChunkingService {
  private readonly chunkSize = 1000;
  private readonly chunkOverlap = 200;

  splitText(text: string): string[] {
    const cleanedText = text
      .replace(/\s+/g, ' ')
      .trim();

    const chunks: string[] = [];

    let start = 0;

    while (start < cleanedText.length) {
      const end = Math.min(
        start + this.chunkSize,
        cleanedText.length,
      );

      const chunk = cleanedText.slice(start, end).trim();

      if (chunk) {
        chunks.push(chunk);
      }

      if (end === cleanedText.length) {
        break;
      }

      start = end - this.chunkOverlap;
    }

    return chunks;
  }
}