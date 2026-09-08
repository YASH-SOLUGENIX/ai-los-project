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

@Injectable()
export class AiRecommendationService {
  constructor(
    @InjectRepository(LoanApplication)
    private readonly applicationRepository: Repository<LoanApplication>,

    private readonly ollamaService: OllamaService,

    private readonly policyRetrievalService: PolicyRetrievalService,

    private readonly eligibilityService: EligibilityService,
  ) {}

  async recommend(
    applicationId: number,
    dto: CheckEligibilityDto,
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
    const eligibilityResult =
      await this.eligibilityService.getDeterministicResult(
        applicationId,
        dto.age,
        dto.monthlyIncome,
        dto.monthlyObligations,
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
18. Never create a policy-grounded reason simply because
    a policy chunk appears generally relevant.
19. If you cannot find an exact supporting policy statement,
    do not create that policy-grounded reason.
20. A deterministic failure may be reported using its
    supplied reason code, but the AI must not invent a
    policy explanation for that failure.

CITATION RULES:

21. A Policy Chunk ID is the NUMBER shown in:
    [Policy Chunk ID: X]

22. The citation policyChunkId MUST be exactly one of
    the numeric Policy Chunk IDs supplied below.

23. Do NOT use policy rule IDs such as:
    POL-EL-01
    POL-EL-02
    POL-EL-03
    POL-EL-04
    POL-EL-05
    POL-DOC-04
    POL-AI-01

    as the citation policyChunkId.

24. Policy rule IDs may appear inside the citation quote,
    but they are NOT Policy Chunk IDs.

25. The citation quote MUST be copied character-for-character
    from the corresponding policy chunk.

26. Do NOT rewrite, summarize, paraphrase, or modify
    the citation quote.

27. Before returning a citation, verify that the exact quote
    appears inside the corresponding policy chunk.

28. If you cannot copy an exact quote from the chunk,
    DO NOT create that citation.

29. Do NOT generate a citation merely because a policy rule
    seems relevant.

30. Use a SHORT quote copied directly from the policy chunk,
    preferably one complete sentence.

31. Do NOT cite an unrelated policy chunk.

32. If the deterministic result contains DTI_ABOVE_LIMIT,
    you MAY explain that the backend has identified a
    deterministic DTI eligibility failure.

33. For DTI_ABOVE_LIMIT, use the policy statement describing
    deterministic DTI calculation as the supporting citation.

34. Do NOT claim that the policy defines a specific DTI
    threshold unless that threshold appears exactly in the
    supplied policy chunks.

35. A valid DTI reason may be:
    "The deterministic eligibility result contains DTI_ABOVE_LIMIT."

36. For this DTI reason, cite the exact policy text explaining
    that DTI is calculated by deterministic application code.

37. Do NOT cite an unrelated policy chunk.

ALLOWED RECOMMENDATIONS:

PROCEED
REVIEW
DECLINE

RECOMMENDATION RULES:

38. If the deterministic eligibility result is true AND
    the supplied policy chunks do not identify any unmet
    mandatory requirement, recommendation MUST be
    "PROCEED".

39. If the deterministic eligibility result is false because
    of one or more reason codes, recommendation MUST be
    "REVIEW" unless the supplied policy explicitly supports
    "DECLINE" for that exact condition.

40. If required information or required documents are missing,
    recommendation MUST be "REVIEW".

41. If application information is contradictory or the supplied
    policy context is insufficient to determine the outcome,
    recommendation MUST be "REVIEW".

42. "DECLINE" may ONLY be returned when the supplied policy
    explicitly supports declining the application for a condition
    that is actually present in the application data.

3. Never use "DECLINE" merely because a deterministic eligibility
    check failed unless the supplied policy explicitly says that
43  condition results in decline.

344 If the deterministic result contains DTI_ABOVE_LIMIT,
    recommendation MUST be "REVIEW" unless the supplied policy
    explicitly supports "DECLINE" for that exact DTI condition.

45. If the deterministic result contains no reason codes,
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
- If Reason Codes contains DTI_ABOVE_LIMIT, the backend
  has already determined that DTI exceeds the configured
  deterministic limit.
- Do not invent another DTI threshold.

APPLICATION:

Loan Amount: ${application.requestedAmount}
Loan Tenure: ${application.requestedTenureMonths} months
Status: ${application.status}

APPROVED POLICY CHUNKS:

${policyText}

RETURN ONLY VALID JSON.

RETURN ONLY VALID JSON.

Required JSON structure:

{
  "recommendation": "REVIEW",
  "riskFlags": [
    {
      "code": "DTI_HIGH",
      "severity": "MEDIUM"
    }
  ],
  "reasons": [
    "The deterministic eligibility result contains DTI_ABOVE_LIMIT."
  ],
  "citations": [
    {
      "policyChunkId": "2",
      "quote": "POL-EL-05 — Debt-to-income (DTI) is calculated by deterministic application code using the configured business rule. The LLM must not calculate DTI."
    }
  ],
  "disclaimer": "Advisory output; human approval required"
}

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
     * If deterministic eligibility passes and Ollama gives
     * the meaningless response ["REVIEW"], normalize it.
     */
    if (
      eligibilityResult.eligible &&
      eligibilityResult.reasonCodes.length === 0 &&
      parsedResponse.recommendation === 'REVIEW' &&
      parsedResponse.reasons.length === 1 &&
      parsedResponse.reasons[0] === 'REVIEW'
    ) {
      parsedResponse.recommendation = 'PROCEED';
      parsedResponse.reasons = [];
      parsedResponse.citations = [];
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
     * Validate every citation against the actual retrieved
     * policy chunk.
     */
    const validChunkIds = new Set(
      policyChunks.map(
        (chunk: any) => String(chunk.id),
      ),
    );

    for (const citation of parsedResponse.citations) {
      if (!validChunkIds.has(citation.policyChunkId)) {
        throw new BadGatewayException(
          `AI returned an invalid policy chunk citation: ${citation.policyChunkId}`,
        );
      }

      const chunk = policyChunks.find(
        (item: any) =>
          String(item.id) === citation.policyChunkId,
      );

      if (
        !chunk ||
        !chunk.content.includes(citation.quote)
      ) {
        throw new BadGatewayException(
          `AI returned a citation quote that does not match policy chunk ${citation.policyChunkId}`,
        );
      }
    }

    return parsedResponse;
  }
}