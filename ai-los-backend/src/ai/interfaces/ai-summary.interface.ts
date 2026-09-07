export interface AiSummary {
  facts: string[];
  missing: string[];
  inconsistencies: string[];
  summary: string;
}