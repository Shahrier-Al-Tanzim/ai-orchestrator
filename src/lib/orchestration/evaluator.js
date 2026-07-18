// @ts-check
import { createModel } from '../models/factory.js';
import { EvaluatorResponseSchema } from './schemas.js';
import { z } from 'zod';
/**
 * Takes the original user prompt and all parallel responses,
 * builds a prompt for the evaluator, and calls generateStructured.
 * 
 * @param {string} originalPrompt - The user's original question
 * @param {Array<{ modelId: string, response: string }>} modelResults - Array of outputs from parallel run
 * @param {string} evaluatorModelId - The model ID of the evaluator
 * @returns {Promise<z.infer<typeof EvaluatorResponseSchema>>} The parsed and validated evaluation object
 */

export async function evaluateResponses(originalPrompt, modelResults, evaluatorModelId) {
    // Construct the prompt presenting all answers to the evaluator
    const evaluationPrompt = `You are an expert evaluator synthesizing a final response to this question: "${originalPrompt}"

Here are the answers provided by different AI models:
${modelResults.map((r, i) => `---
Model: ${r.modelId}
Answer: ${r.response}`).join('\n\n')}

CRITICAL EVALUATION RULES:
1. DETECT PROMPT TYPE (FACT VS. OPINION):
   - First, determine if the question seeks objective facts (e.g., capital cities, math, historical dates, scientific statistics) or subjective opinions, design choices, comparisons, or recommendations (e.g., NestJS vs. Next.js, apples vs. bananas, architectural designs).
2. IF THE QUESTION IS FACTUAL:
   - Fact-check the inputs strictly. Do not assume the model answers are correct. If a model provides factually incorrect information, you must identify it as wrong.
   - In the "contributions" array, if a model was completely incorrect, explicitly state: "None - provided incorrect information (specify what was wrong)".
3. IF THE QUESTION IS OPINION-BASED / SUBJECTIVE:
   - Do not label opinions, preferences, or trade-off recommendations as "incorrect" simply because they differ. Instead, evaluate the quality, perspective, and depth of reasoning of each model's argument.
   - In the "contributions" array, identify the unique perspective, key arguments, or trade-offs that the model contributed (e.g., "Highlighted the developer velocity and serverless deployment benefits of Next.js", "Analyzed the modularity and enterprise-readiness of NestJS").
4. NO DISHONEST ATTRIBUTION: Never claim a model provided a correct fact or argument if it did not literally state it in the input answers above.
5. INTERNAL KNOWLEDGE FALLBACK: If all input answers are wrong, incomplete, or contradict each other, you MUST use your own internal knowledge to write the correct, refined "finalAnswer". In your "reasoning", state clearly that the input models were incorrect or insufficient and that you had to rely on your own internal knowledge.
`;

    const evaluator = createModel(evaluatorModelId);

    // Call generateStructured to return validated JSON matching our schema
    return evaluator.generateStructured(evaluationPrompt, EvaluatorResponseSchema);
}