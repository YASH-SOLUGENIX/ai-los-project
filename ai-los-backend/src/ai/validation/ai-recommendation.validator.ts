import {
  AiRecommendationResult,
} from '../interfaces/ai-recommendation.interface';

export function validateAiRecommendation(
  value: unknown,
): value is AiRecommendationResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const result = value as Record<string, unknown>;

  if (
    result.recommendation !== 'PROCEED' &&
    result.recommendation !== 'REVIEW' &&
    result.recommendation !== 'DECLINE'
  ) {
    return false;
  }

  if (!Array.isArray(result.riskFlags)) {
    return false;
  }

  for (const flag of result.riskFlags) {
    if (!flag || typeof flag !== 'object') {
      return false;
    }

    const riskFlag = flag as Record<string, unknown>;

    if (typeof riskFlag.code !== 'string') {
      return false;
    }

    if (
      riskFlag.severity !== 'LOW' &&
      riskFlag.severity !== 'MEDIUM' &&
      riskFlag.severity !== 'HIGH'
    ) {
      return false;
    }
  }

  if (
    !Array.isArray(result.reasons) ||
    !result.reasons.every(
      (item) => typeof item === 'string',
    )
  ) {
    return false;
  }

  if (!Array.isArray(result.citations)) {
    return false;
  }

  for (const citation of result.citations) {
    if (!citation || typeof citation !== 'object') {
      return false;
    }

    const item = citation as Record<string, unknown>;

    if (
      typeof item.policyChunkId !== 'string' ||
      item.policyChunkId.trim() === ''
    ) {
      return false;
    }

    if (
      typeof item.quote !== 'string' ||
      item.quote.trim() === ''
    ) {
      return false;
    }
  }

  if (
    typeof result.disclaimer !== 'string' ||
    result.disclaimer.trim() === ''
  ) {
    return false;
  }

  return true;
}