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

  const prompt = this.buildSummaryPrompt(
    application,
    documents,
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
);

const assessment = this.assessmentRepository.create({
  applicationId: application.id,
  promptVersion: 'v1',
  model:
  this.configService.get<string>('OLLAMA_MODEL') ??
  'llama3.2:3b',
  inputHash,
  outputJson: parsedResponse,
 });

 await this.assessmentRepository.save(assessment);

 return parsedResponse;
}

  private buildSummaryPrompt(
    application: LoanApplication,
    documents: LoanDocument[],
  ): string {
    return `
You are an AI assistant for a Digital Loan Origination System.

Your task is to summarize the loan application.

IMPORTANT RULES:
- Do NOT approve the application.
- Do NOT reject the application.
- Do NOT make a loan recommendation.
- Do NOT invent information.
- Only use information provided below.
- If information is missing, put it in "missing".
- If information appears contradictory, put it in "inconsistencies".

Return ONLY valid JSON.

Required JSON format:

{
  "facts": ["fact 1", "fact 2"],
  "missing": ["missing item 1"],
  "inconsistencies": ["inconsistency 1"],
  "summary": "short summary"
}

APPLICATION:

Application ID: ${application.id}
Customer ID: ${application.customerId}
Loan Product ID: ${application.loanProductId}
Requested Amount: ${application.requestedAmount}
Requested Tenure: ${application.requestedTenureMonths} months
Status: ${application.status}

DOCUMENTS:

${documents
  .map(
    (document) =>
      `- Type: ${document.documentType}
- File: ${document.originalFileName}
- MIME Type: ${document.mimeType}`,
  )
  .join('\n')}

Remember:
Return JSON only.
Do not provide a recommendation.
`;
  }

  private createInputHash(
  application: LoanApplication,
  documents: LoanDocument[],
): string {
  const input = JSON.stringify({
    application,
    documents,
  });

  return createHash('sha256')
    .update(input)
    .digest('hex');
  }
}