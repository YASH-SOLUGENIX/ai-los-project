export interface AiSummary {
  facts: string[];

  missing: string[];

  inconsistencies: string[];

  risks: string[];

  sourceReferences: string[];

  summary: string;
}