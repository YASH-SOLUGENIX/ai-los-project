import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoanApplication } from '../applications/entities/loan-application.entity';
import { LoanDocument } from '../documents/entities/loan-document.entity';

import { OllamaService } from './ollama.service';
import { AiSummary } from './interfaces/ai-summary.interface';
import { validateAiSummary } from './validation/ai-summary.validator';
import { AIAssessment } from './entities/ai-assessment.entity';
import { PdfTextExtractorService } from './rag/pdf-text-extractor.service';

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(LoanApplication)
    private readonly applicationRepository: Repository<LoanApplication>,

    @InjectRepository(LoanDocument)
    private readonly documentRepository: Repository<LoanDocument>,

    @InjectRepository(AIAssessment)
    private readonly assessmentRepository: Repository<AIAssessment>,

    private readonly ollamaService: OllamaService,

    private readonly configService: ConfigService,

    private readonly pdfTextExtractor: PdfTextExtractorService,
  ) {}

  async generateApplicationSummary(
    applicationId: number,
  ): Promise<AiSummary> {
    const application =
      await this.applicationRepository.findOne({
        where: {
          id: applicationId,
        },
      });

    if (!application) {
      throw new NotFoundException(
        'Application not found',
      );
    }

    const documents =
      await this.documentRepository.find({
        where: {
          applicationId,
        },
      });

    const documentContents: {
      documentType: string;
      fileName: string;
      text: string | null;
    }[] = [];

    for (const document of documents) {
      try {
        const text =
          await this.pdfTextExtractor.extractText(
            document.filePath,
          );

        documentContents.push({
          documentType: document.documentType,
          fileName: document.originalFileName,
          text,
        });
      } catch {
        documentContents.push({
          documentType: document.documentType,
          fileName: document.originalFileName,
          text: null,
        });
      }
    }

    const prompt = this.buildSummaryPrompt(
      application,
      documents,
      documentContents,
    );

    const response =
      await this.ollamaService.generate(prompt);

    let parsedResponse: unknown;

    try {
      parsedResponse = JSON.parse(response);
    } catch {
      throw new BadGatewayException(
        'Ollama returned invalid JSON',
      );
    }

    if (!validateAiSummary(parsedResponse)) {
      throw new BadGatewayException(
        'Ollama returned an invalid AI summary structure',
      );
    }

    const inputHash = this.createInputHash(
      application,
      documents,
      documentContents,
    );

    const assessment =
      this.assessmentRepository.create({
        applicationId: application.id,
        promptVersion: 'v3',
        model:
          this.configService.get<string>(
            'OLLAMA_MODEL',
          ) ?? 'llama3.2:3b',
        inputHash,
        outputJson: parsedResponse,
      });

    await this.assessmentRepository.save(
      assessment,
    );

    return parsedResponse;
  }

  private buildSummaryPrompt(
    application: LoanApplication,
    documents: LoanDocument[],
    documentContents: {
      documentType: string;
      fileName: string;
      text: string | null;
    }[],
  ): string {
    const documentMetadata =
      documents.length === 0
        ? 'No documents are available.'
        : documents
            .map(
              (document) =>
                `- Type: ${document.documentType}
- File: ${document.originalFileName}
- MIME Type: ${document.mimeType}
- File Size: ${document.fileSize} bytes`,
            )
            .join('\n\n');

    const extractedDocumentText =
      documentContents.length === 0
        ? 'No document content is available.'
        : documentContents
            .map(
              (document) =>
                `DOCUMENT TYPE: ${document.documentType}
FILE NAME: ${document.fileName}

EXTRACTED CONTENT:
${
  document.text ??
  '[Document content could not be extracted]'
}`,
            )
            .join('\n\n--------------------\n\n');

    return `
You are an AI assistant for a Digital Loan Origination System.

Your task is to generate a structured summary of the
loan application using ONLY the information provided below.

IMPORTANT RULES:

1. Do NOT approve the application.
2. Do NOT reject the application.
3. Do NOT make a loan recommendation.
4. Do NOT make a credit decision.
5. Do NOT invent information.
6. Do NOT infer information that is not present in the
   application data or extracted document content.
7. Do NOT calculate eligibility.
8. If information needed for the summary is unavailable,
   put it in "missing".

9. Only report an inconsistency when two explicitly supplied
   pieces of information contradict each other.

10. Every inconsistency must identify the two conflicting
    pieces of information.

11. Do NOT treat different applications, examples, or
    hypothetical values as information about this application.

12. Do NOT invent inconsistencies.

13. Risks must be limited to objectively identifiable concerns
    directly supported by the supplied application data or
    extracted document content.

14. Do NOT classify a loan amount as "high", "risky", or
    "large" unless an explicit supplied policy or threshold
    supports that conclusion.

15. Do NOT make credit-risk judgments.

16. Do NOT infer that missing salary means the applicant has
    no income when other financial information is present.

17. Source references must refer only to information
    actually supplied below.

18. Do not invent source references.


RETURN ONLY VALID JSON.

Required JSON structure:

{
  "facts": [
    "Requested Amount: 250000.00"
  ],
  "missing": [],
  "inconsistencies": [],
  "risks": [],
  "sourceReferences": [
    "Requested Amount",
    "Requested Tenure",
    "Status",
    "Document: salary-slip.pdf"
  ],
  "summary": "Short factual summary of the application."
}

APPLICATION:

Application ID: ${application.id}
Loan Product ID: ${application.loanProductId}
Requested Amount: ${application.requestedAmount}
Requested Tenure: ${application.requestedTenureMonths} months
Status: ${application.status}

DOCUMENT METADATA:

${documentMetadata}

EXTRACTED DOCUMENT CONTENT:

${extractedDocumentText}

IMPORTANT:

Use the extracted document content when available.

Only report information that is explicitly present in the
application data or extracted document content.

If a document contains Net Pay, report Net Pay as a fact.
Do not rename Net Pay as Salary unless the document explicitly
identifies it as Salary.

Only report an inconsistency when two actual supplied values
or statements contradict each other.

Do not create an inconsistency from example values contained
in these instructions.

Do not create a risk merely because the requested loan amount
appears large.

Do not make credit-risk judgments.

If there are no objectively supported risks, return:

"risks": []

If there are no actual inconsistencies, return:

"inconsistencies": []

The summary must accurately reflect the facts that were
actually extracted from the document.

Return JSON only.
`;
  }

  private createInputHash(
    application: LoanApplication,
    documents: LoanDocument[],
    documentContents: {
      documentType: string;
      fileName: string;
      text: string | null;
    }[],
  ): string {
    const input = JSON.stringify({
      application,
      documents,
      documentContents,
    });

    return createHash('sha256')
      .update(input)
      .digest('hex');
  }
}