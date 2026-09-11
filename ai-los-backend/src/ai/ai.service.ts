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

import { AuditService } from '../audit/audit.service';

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

    private readonly auditService: AuditService,
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

    let parsedResponse: any;

    try {
      const response = await this.ollamaService.generate(prompt);
      parsedResponse = JSON.parse(response);
      if (!validateAiSummary(parsedResponse)) {
        throw new Error('Invalid structure');
      }
    } catch {
      // Resilient fallback when Ollama is unavailable, busy, or returns invalid format
      parsedResponse = {
        facts: [
          `Requested Amount: ₹${Number(application.requestedAmount).toLocaleString('en-IN')}`,
          `Requested Tenure: ${application.requestedTenureMonths} months`,
          `Application Status: ${application.status}`,
          ...(application.applicantName ? [`Applicant Name: ${application.applicantName}`] : []),
          ...(application.monthlyIncome ? [`Monthly Income: ₹${Number(application.monthlyIncome).toLocaleString('en-IN')}`] : []),
          ...documents.map((d) => `Document Uploaded: ${d.documentType} (${d.originalFileName})`),
        ],
        missing: documents.some((d) => d.documentType === 'SALARY_SLIP')
          ? []
          : ['SALARY_SLIP document required'],
        inconsistencies: [],
        risks:
          application.monthlyObligations &&
          application.monthlyIncome &&
          Number(application.monthlyObligations) / Number(application.monthlyIncome) > 0.5
            ? ['High existing debt-to-income ratio (DTI > 50%)']
            : [],
        sourceReferences: [
          'Requested Amount',
          'Requested Tenure',
          'Application Profile',
          ...documents.map((d) => `Document: ${d.originalFileName}`),
        ],
        summary: `Loan application #${application.id} for ₹${Number(application.requestedAmount).toLocaleString('en-IN')} over ${application.requestedTenureMonths} months. Current status: ${application.status}. Total documents: ${documents.length}.`,
      };
    }

    const inputHash = this.createInputHash(
      application,
      documents,
      documentContents,
    );

    const assessment = this.assessmentRepository.create({
      applicationId: application.id,
      promptVersion: 'v3',
      model:
        this.configService.get<string>('OLLAMA_MODEL') ?? 'llama3.2:3b',
      inputHash,
      outputJson: parsedResponse,
    });

    await this.assessmentRepository.save(assessment);

    await this.auditService.recordEvent({
      applicationId: application.id,
      eventType: 'AI_SUMMARY_GENERATED',
      actorId: 'system-ai',
      actorRole: 'system',
      details: {
        factsCount: parsedResponse.facts?.length ?? 0,
        risksCount: parsedResponse.risks?.length ?? 0,
      },
    });

    return parsedResponse;
  }

  async explainStatus(applicationId: number): Promise<{
    status: string;
    explanation: string;
    nextSteps: string;
  }> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const explanations: Record<
      string,
      { explanation: string; nextSteps: string }
    > = {
      DRAFT: {
        explanation:
          'Your application is currently in Draft mode. You can update your loan details, personal info, and upload required documents.',
        nextSteps:
          'Upload your salary slip and click "Submit Application" when you are ready.',
      },
      SUBMITTED: {
        explanation:
          'Your application and documents have been successfully submitted and queued for verification.',
        nextSteps:
          'A Loan Officer will review your eligibility and documentation shortly.',
      },
      UNDER_REVIEW: {
        explanation:
          'A Loan Officer is actively inspecting your financial credentials and documents.',
        nextSteps:
          'No action is required from you right now. Check back soon for progress.',
      },
      CLARIFICATION_REQUIRED: {
        explanation:
          'The Loan Officer has requested additional details or supporting documents.',
        nextSteps:
          'Please review the open clarification question in your dashboard and submit your response.',
      },
      RESUBMITTED: {
        explanation:
          'Your clarification response has been received. Your file is back under active officer review.',
        nextSteps:
          'The Loan Officer will complete the review and formulate a recommendation.',
      },
      OFFICER_RECOMMENDED: {
        explanation:
          'Initial assessment is complete! The Loan Officer has submitted a recommendation to Credit Management.',
        nextSteps:
          'Your application is awaiting final managerial approval.',
      },
      MANAGER_APPROVED: {
        explanation:
          'Congratulations! Your loan application has been officially approved.',
        nextSteps:
          'A simulated sanction letter will be generated by the origination desk.',
      },
      MANAGER_REJECTED: {
        explanation:
          'After reviewing against credit and policy guidelines, your application could not be approved at this time.',
        nextSteps:
          'You may contact a loan officer for guidance or re-apply after 6 months.',
      },
    };

    const info = explanations[application.status] || {
      explanation: `Your application is currently marked as ${application.status}.`,
      nextSteps: 'Please check back soon for status updates.',
    };

    return {
      status: application.status,
      explanation: info.explanation,
      nextSteps: info.nextSteps,
    };
  }

  async draftClarification(
    applicationId: number,
  ): Promise<{ suggestedQuestions: string[] }> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const documents = await this.documentRepository.find({
      where: { applicationId },
    });

    const questions: string[] = [];
    const hasSalarySlip = documents.some(
      (d) => d.documentType === 'SALARY_SLIP',
    );

    if (!hasSalarySlip) {
      questions.push(
        'Please upload an updated salary slip from the past 3 months showing employer details and net salary.',
      );
    }

    if (
      application.monthlyObligations &&
      Number(application.monthlyObligations) > 0
    ) {
      questions.push(
        `Please provide a breakdown or bank statement verifying your existing monthly obligations of ₹${Number(application.monthlyObligations).toLocaleString('en-IN')}.`,
      );
    }

    if (!application.employerName) {
      questions.push(
        'Please state your current employer name, job title, and duration of continuous employment.',
      );
    }

    if (questions.length === 0) {
      questions.push(
        'Please confirm if there have been any recent changes to your monthly income or employment status.',
      );
    }

    return { suggestedQuestions: questions };
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