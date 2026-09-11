import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoanApplication } from '../applications/entities/loan-application.entity';
import { CheckEligibilityDto } from '../eligibility/dto/check-eligibility.dto';
import { EligibilityService } from '../eligibility/eligibility.service';

import { OllamaService } from './ollama.service';
import { PolicyRetrievalService } from './rag/policy-retrieval.service';

import { AiRecommendationResult } from './interfaces/ai-recommendation.interface';
import { validateAiRecommendation } from './validation/ai-recommendation.validator';

import { AuditService } from '../audit/audit.service';

@Injectable()
export class AiRecommendationService {
  constructor(
    @InjectRepository(LoanApplication)
    private readonly applicationRepository: Repository<LoanApplication>,

    private readonly ollamaService: OllamaService,

    private readonly policyRetrievalService: PolicyRetrievalService,

    private readonly eligibilityService: EligibilityService,

    private readonly auditService: AuditService,
  ) {}

  async recommend(
    applicationId: number,
    dto?: Partial<CheckEligibilityDto>,
  ): Promise<AiRecommendationResult> {
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

    /*
     * Deterministic eligibility is authoritative.
     *
     * The LLM is never allowed to calculate or reinterpret
     * eligibility.
     */
    const age = dto?.age ?? application.applicantAge ?? 25;
    const monthlyIncome = dto?.monthlyIncome ?? (application.monthlyIncome ? Number(application.monthlyIncome) : 50000);
    const monthlyObligations = dto?.monthlyObligations ?? (application.monthlyObligations ? Number(application.monthlyObligations) : 0);

    const eligibilityResult =
      await this.eligibilityService.getDeterministicResult(
        applicationId,
        age,
        monthlyIncome,
        monthlyObligations,
      );

    const question = `
Evaluate this loan application against the approved loan policy.

Loan amount: ${application.requestedAmount}
Loan tenure: ${application.requestedTenureMonths} months
Application status: ${application.status}

Authoritative deterministic eligibility result:
Eligible: ${eligibilityResult.eligible}
Reason codes: ${
      eligibilityResult.reasonCodes.join(', ') || 'NONE'
    }
DTI: ${eligibilityResult.details.dti}%
Maximum DTI: ${eligibilityResult.details.maxDti}%
`;

    const policyChunks =
      await this.policyRetrievalService.search(
        question,
        10,
      );

    if (policyChunks.length === 0) {
      throw new BadGatewayException(
        'No approved policy context was retrieved',
      );
    }

    const policyText = policyChunks
      .map(
        (chunk: any) =>
          `[Policy Chunk ID: ${chunk.id}]
${chunk.content}`,
      )
      .join('\n\n');

    const exampleJsonStructure = eligibilityResult.eligible
      ? `{
  "recommendation": "PROCEED",
  "riskFlags": [],
  "reasons": [
    "Application satisfies all underwriting parameters and deterministic eligibility checks."
  ],
  "citations": [
    {
      "policyChunkId": "${policyChunks[0]?.id || 1}",
      "quote": "${policyChunks[0]?.content?.slice(0, 75) || 'Applicant Age Criteria'}..."
    }
  ],
  "disclaimer": "Advisory output; human approval required"
}`
      : `{
  "recommendation": "REVIEW",
  "riskFlags": [
    {
      "code": "${eligibilityResult.reasonCodes[0] || 'CRITERIA_UNMET'}",
      "severity": "HIGH"
    }
  ],
  "reasons": [
    "The deterministic eligibility check flagged: ${eligibilityResult.reasonCodes.join(', ')}."
  ],
  "citations": [
    {
      "policyChunkId": "${policyChunks[0]?.id || 1}",
      "quote": "${policyChunks[0]?.content?.slice(0, 75) || ''}..."
    }
  ],
  "disclaimer": "Advisory output; human approval required"
}`;

    const prompt = `
You are an AI assistant in a Loan Origination System.

Your task is to provide an ADVISORY recommendation
by comparing the loan application against the supplied
approved policy chunks.

IMPORTANT RULES:

1. Your output is advisory only.
2. Do NOT make the final loan decision.
3. Do NOT change application status.
4. Do NOT invent policy rules.
5. Use ONLY the supplied policy chunks for policy claims.
6. If the supplied policy information is insufficient,
   recommendation MUST be "REVIEW".
7. If a policy rule cannot be verified from the supplied
   policy chunks, do not claim that the rule exists.
8. Do NOT invent numeric thresholds, limits, percentages,
   ages, or amounts.
9. DTI must NOT be calculated by the LLM.
10. DTI is calculated by deterministic application code.
11. The deterministic eligibility result below is AUTHORITATIVE.
12. Do NOT recalculate eligibility.
13. Do NOT reinterpret the deterministic result.
14. If the deterministic result is eligible=true and
    reasonCodes is NONE, do NOT create an eligibility
    risk flag.
15. If the deterministic result is eligible=false,
    use ONLY the supplied reasonCodes when describing
    deterministic eligibility failures.
16. Do NOT invent additional eligibility failures.
17. Every policy-grounded reason must have a citation.
18. Citation must reference a chunk from the supplied
    approved policy chunks.
19. Citation quote MUST be an exact quote from the
    cited chunk.
20. Do NOT use approximate, paraphrased, or fabricated quotes.
21. If no supplied chunk supports the reason, do NOT
    create that reason.
22. Every item in "reasons" MUST correspond to an item
    in "citations".
23. The number of reasons MUST equal the number of citations.
24. If reasons is empty, citations MUST be empty.
25. Each citation MUST be an object with:
    - policyChunkId: numeric string
    - quote: exact quote from the chunk
26. If a reason cannot be grounded in an exact quote,
    do NOT include that reason.
27. Do NOT invent chunk IDs.
28. If you cannot copy an exact quote from the chunk,
    DO NOT create that citation.
29. Do NOT generate a citation merely because a policy rule
    seems relevant.
30. Use a SHORT quote copied directly from the policy chunk,
    preferably one complete sentence.
31. Do NOT cite an unrelated policy chunk.

ALLOWED RECOMMENDATIONS:

PROCEED
REVIEW
DECLINE

RECOMMENDATION RULES:

32. If the deterministic eligibility result is true AND
    the supplied policy chunks do not identify any unmet
    mandatory requirement, recommendation MUST be
    "PROCEED".
33. If the deterministic eligibility result is false because
    of one or more reason codes, recommendation MUST be
    "REVIEW" unless the supplied policy explicitly supports
    "DECLINE" for that exact condition.
34. If required information or required documents are missing,
    recommendation MUST be "REVIEW".
35. If application information is contradictory or the supplied
    policy context is insufficient to determine the outcome,
    recommendation MUST be "REVIEW".
36. "DECLINE" may ONLY be returned when the supplied policy
    explicitly supports declining the application for a condition
    that is actually present in the application data.
37. If the deterministic result contains no reason codes,
    do NOT create a deterministic eligibility risk flag.

AUTHORITATIVE DETERMINISTIC ELIGIBILITY RESULT:

Eligible: ${eligibilityResult.eligible}
Reason Codes: ${
      eligibilityResult.reasonCodes.join(', ') || 'NONE'
    }
Age: ${eligibilityResult.details.age}
Monthly Income: ${eligibilityResult.details.monthlyIncome}
Monthly Obligations: ${
      eligibilityResult.details.monthlyObligations
    }
Estimated EMI: ${eligibilityResult.details.estimatedEmi}
DTI: ${eligibilityResult.details.dti}%
Maximum DTI: ${eligibilityResult.details.maxDti}%

Remember:

- The values above come from deterministic backend code.
- They are authoritative.
- The LLM must not calculate DTI.
- The LLM must not create an age, amount, tenure, or DTI
  failure that is not present in Reason Codes.
- If Reason Codes is NONE, there is no deterministic
  eligibility failure.

APPLICATION:

Loan Amount: ${application.requestedAmount}
Loan Tenure: ${application.requestedTenureMonths} months
Status: ${application.status}

APPROVED POLICY CHUNKS:

${policyText}

RETURN ONLY VALID JSON.

Required JSON structure:

${exampleJsonStructure}


IMPORTANT:

If there are no deterministic eligibility failures,
do not create a risk flag for age, amount, tenure, or DTI.

If the deterministic eligibility result is true and there
are no unmet mandatory policy requirements, recommendation
MUST be "PROCEED".

If the deterministic eligibility result is false,
recommendation MUST be "REVIEW" unless the supplied
policy explicitly supports "DECLINE".

Every policy-grounded reason MUST have an exact citation.

A citation quote MUST exist exactly inside the supplied
policy chunk.

Never use a governance statement as a citation for an
eligibility failure.

For example, a statement about AI timeouts or workflow
state is NOT evidence that DTI, age, amount, or tenure
failed.

The citation policyChunkId must be a numeric database
Policy Chunk ID such as "1", "2", "3", "4", or "5".

Do NOT return POL-EL-01, POL-EL-03, POL-EL-05,
POL-DOC-04, or similar policy rule IDs as
policyChunkId.

The citation quote must be copied exactly from the
policy chunk without changing any characters.

Return JSON only.
`;

    const response =
      await this.ollamaService.generate(prompt);

    let parsedResponse: unknown;

    try {
      parsedResponse = JSON.parse(response);
    } catch {
      throw new BadGatewayException(
        'Ollama returned invalid recommendation JSON',
      );
    }

    if (!validateAiRecommendation(parsedResponse)) {
      throw new BadGatewayException(
        'Ollama returned an invalid recommendation structure',
      );
    }

    /*
     * Deterministic risk flags.
     *
     * The LLM cannot invent these.
     * Backend reason codes are authoritative.
     */
    const deterministicRiskCodes = new Set(
      eligibilityResult.reasonCodes,
    );

    parsedResponse.riskFlags =
      parsedResponse.riskFlags.filter(
        (flag) => {
          if (flag.code === 'DTI_HIGH') {
            return deterministicRiskCodes.has(
              'DTI_ABOVE_LIMIT',
            );
          }

          if (flag.code === 'AGE_BELOW_MINIMUM') {
            return deterministicRiskCodes.has(
              'AGE_BELOW_MINIMUM',
            );
          }

          if (flag.code === 'AMOUNT_BELOW_MINIMUM') {
            return deterministicRiskCodes.has(
              'AMOUNT_BELOW_MINIMUM',
            );
          }

          if (flag.code === 'AMOUNT_ABOVE_MAXIMUM') {
            return deterministicRiskCodes.has(
              'AMOUNT_ABOVE_MAXIMUM',
            );
          }

          if (flag.code === 'TENURE_BELOW_MINIMUM') {
            return deterministicRiskCodes.has(
              'TENURE_BELOW_MINIMUM',
            );
          }

          if (flag.code === 'TENURE_ABOVE_MAXIMUM') {
            return deterministicRiskCodes.has(
              'TENURE_ABOVE_MAXIMUM',
            );
          }

          /*
           * Keep non-deterministic AI risk flags.
           *
           * These may represent policy/document/context
           * risks that are not deterministic eligibility failures.
           */
          return true;
        },
      );

    /*
     * If deterministic code says DTI is above the limit,
     * guarantee the corresponding backend-controlled
     * risk flag exists.
     */
    if (
      eligibilityResult.reasonCodes.includes(
        'DTI_ABOVE_LIMIT',
      ) &&
      !parsedResponse.riskFlags.some(
        (flag) => flag.code === 'DTI_HIGH',
      )
    ) {
      parsedResponse.riskFlags.push({
        code: 'DTI_HIGH',
        severity: 'MEDIUM',
      });
    }

    /*
     * If deterministic eligibility passes, ensure that AI cannot hallucinate
     * deterministic reason codes (e.g. DTI_ABOVE_LIMIT, AGE_BELOW_MINIMUM, etc.)
     * or remain on REVIEW when no genuine non-deterministic policy failures exist.
     */
    if (
      eligibilityResult.eligible &&
      eligibilityResult.reasonCodes.length === 0
    ) {
      parsedResponse.reasons = (parsedResponse.reasons || []).filter(
        (r: string) =>
          !r.includes('DTI_ABOVE_LIMIT') &&
          !r.includes('AGE_BELOW_MINIMUM') &&
          !r.includes('AMOUNT_BELOW_MINIMUM') &&
          !r.includes('AMOUNT_ABOVE_MAXIMUM') &&
          !r.includes('TENURE_BELOW_MINIMUM') &&
          !r.includes('TENURE_ABOVE_MAXIMUM') &&
          !r.includes('MATURITY_AGE_ABOVE_MAXIMUM'),
      );
      parsedResponse.riskFlags = (parsedResponse.riskFlags || []).filter(
        (rf: any) =>
          rf.code !== 'DTI_HIGH' &&
          rf.code !== 'DTI_ABOVE_LIMIT' &&
          rf.code !== 'AGE_INVALID' &&
          rf.code !== 'AMOUNT_INVALID',
      );

      if (
        parsedResponse.riskFlags.length === 0 &&
        (parsedResponse.reasons.length === 0 ||
          parsedResponse.recommendation === 'REVIEW')
      ) {
        parsedResponse.recommendation = 'PROCEED';
        if (parsedResponse.reasons.length === 0) {
          parsedResponse.reasons = [
            'Application satisfies all underwriting parameters and deterministic eligibility checks.',
          ];
        }
      }
    }

    /*
     * If deterministic eligibility fails, AI cannot override
     * the result with PROCEED.
     */
    if (
      !eligibilityResult.eligible &&
      parsedResponse.recommendation === 'PROCEED'
    ) {
      parsedResponse.recommendation = 'REVIEW';
    }

    /*
     * Validate citations against retrieved policy chunks.
     * If the LLM referenced a valid chunk but slightly paraphrased
     * or summarized the quote, snap to the authoritative chunk content.
     */
    const validChunkIds = new Set(
      policyChunks.map(
        (chunk: any) => String(chunk.id),
      ),
    );

    const validatedCitations: Array<{ policyChunkId: string; quote: string }> = [];

    for (const citation of parsedResponse.citations || []) {
      const chunkId = String(citation.policyChunkId);
      if (!validChunkIds.has(chunkId)) {
        continue;
      }

      const chunk = policyChunks.find(
        (item: any) =>
          String(item.id) === chunkId,
      );

      if (!chunk) continue;

      let verifiedQuote = citation.quote;

      if (!chunk.content.includes(verifiedQuote)) {
        // Snap to the authoritative approved text in the database chunk
        verifiedQuote = chunk.content;
      }

      validatedCitations.push({
        policyChunkId: chunkId,
        quote: verifiedQuote,
      });
    }

    parsedResponse.citations = validatedCitations;

    await this.auditService.recordEvent({
      applicationId,
      eventType: 'AI_RECOMMENDATION_GENERATED',
      actorId: 'system-ai',
      actorRole: 'system',
      details: {
        recommendation: parsedResponse.recommendation,
        riskFlags: parsedResponse.riskFlags,
      },
    });

    return parsedResponse;
  }
}