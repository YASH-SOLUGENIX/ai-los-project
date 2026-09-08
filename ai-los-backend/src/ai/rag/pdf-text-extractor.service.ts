import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { readFile } from 'fs/promises';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class PdfTextExtractorService {
  async extractText(filePath: string): Promise<string> {
    try {
      const fileBuffer = await readFile(filePath);

      const parser = new PDFParse({
        data: fileBuffer,
      });

      const pdfData = await parser.getText();

      const text = pdfData.text.trim();

      await parser.destroy();

      if (!text) {
        throw new BadRequestException(
          'PDF does not contain extractable text',
        );
      }

      return text;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        'Failed to extract text from PDF',
      );
    }
  }
}