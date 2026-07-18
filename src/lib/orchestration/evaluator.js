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
1. FACT-CHECK THE INPUTS: Do not assume the model answers are correct. If a model provides factually incorrect information (e.g. naming the wrong capital city or incorrect numbers), you must identify it as wrong.
2. NO DISHONEST ATTRIBUTION: Never claim a model provided a correct fact (like the correct capital city or population) if it did not literally state it in the input answers above.
3. INTERNAL KNOWLEDGE FALLBACK: If all input answers are wrong, incomplete, or contradict each other, you MUST use your own internal knowledge to write the correct, refined "finalAnswer". In your "reasoning", state clearly that the input models were incorrect and that you had to rely on your own internal knowledge to supply the correct facts.
4. STRENGTHS AND WEAKNESSES: In the "contributions" array, accurately document what each model got right or wrong. If a model was completely incorrect, explicitly state: "None - provided incorrect information (specify what was wrong)".
`;

    const evaluator = createModel(evaluatorModelId);

    // Call generateStructured to return validated JSON matching our schema
    return evaluator.generateStructured(evaluationPrompt, EvaluatorResponseSchema);
}