export type AiRecommendation =
  | 'PROCEED'
  | 'REVIEW'
  | 'DECLINE';

export type AiRiskSeverity =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';

export interface AiRiskFlag {
  code: string;
  severity: AiRiskSeverity;
}

export interface AiRecommendationCitation {
  policyChunkId: string;
  quote: string;
}

export interface AiRecommendationResult {
  recommendation: AiRecommendation;
  riskFlags: AiRiskFlag[];
  reasons: string[];
  citations: AiRecommendationCitation[];
  disclaimer: string;
}