// @ts-check
import { runParallelModels } from './parallelRunner.js';
import { evaluateResponses } from './evaluator.js';

/**
 * Executes the entire self-consistency orchestration workflow end-to-end:
 * 1. Runs the prompt across multiple target models in parallel.
 * 2. Feeds the prompt and all parallel results to the evaluator model.
 * 3. Returns the combined object containing the evaluation and the original responses.
 * 
 * @param {string} prompt - The user's original question
 * @param {string[]} modelIds - Array of model IDs to query concurrently
 * @param {string} evaluatorModelId - The model ID of the evaluator
 * @returns {Promise<{ evaluation: import('./schemas').EvaluatorResponse, responses: Array<{ modelId: string, response: string, duration: string }> }>} The combined results object
 */

export async function runSelfConsistencyOrchestrator(prompt, modelIds, evaluatorModelId) {
    // 1. Exectue paraller model questies
    const runnerStart = Date.now();
    console.log(`[Pipeline] Launching parallel execution for ${modelIds.length} models...`);
    const parallelResults = await runParallelModels(prompt, modelIds);
    const runnerDuration = ((Date.now() - runnerStart) / 1000).toFixed(2);
    console.log(`[Pipeline] Parallel execution completed in ${runnerDuration}s.`);

    // 2. Synthesisze results using the evaluatr model
    console.log(`[Pipeline] Initiating synthesis stage using evaluator "${evaluatorModelId}"...`);
    const synthesisStart = Date.now();
    const evaluationResult = await evaluateResponses(prompt, parallelResults, evaluatorModelId);
    const synthesisDuration = ((Date.now() - synthesisStart) / 1000).toFixed(2);
    console.log(`[Pipeline] Synthesis stage completed in ${synthesisDuration}s.`);

    return {
        evaluation: evaluationResult,
        responses: parallelResults
    };
}
