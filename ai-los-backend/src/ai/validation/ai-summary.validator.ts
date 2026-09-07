import Ajv from 'ajv';

import { AiSummary } from '../interfaces/ai-summary.interface';
import { aiSummarySchema } from '../schemas/ai-summary.schema';

const ajv = new Ajv();

const validate = ajv.compile(aiSummarySchema);

export function validateAiSummary(
  value: unknown,
): value is AiSummary {
  return validate(value) as boolean;
}