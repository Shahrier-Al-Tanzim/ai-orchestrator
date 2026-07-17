// @ts-check
import { z } from 'zod';

/**
 * Zod Schema for validation and structure of the evaluator model response.
 * This guarantees the exact shape of JSON returned by the evaluator model.
 */
export const EvaluatorResponseSchema = z.object({
  finalAnswer: z.string().describe('The refined, synthesized best answer for the user'),
  reasoning: z.string().describe('Brief explanation of how the final answer was constructed from the model contributions'),
  contributions: z.array(
    z.object({
      modelId: z.string(),
      strengths: z.string().describe('What this model got right or contributed to the final synthesis'),
    })
  ).describe('Mapping of what each model contributed'),
  confidence: z.enum(['low', 'medium', 'high']).describe('Evaluation confidence level in the generated final answer'),
});
