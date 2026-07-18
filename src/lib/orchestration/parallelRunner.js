// @ts-check
import { createModel } from '../models/factory.js';

/**
 * Executes a prompt across multiple models concurrently.
 * Fail-fast behavior: If any single model fails, the entire pipeline stops immediately.
 * 
 * @param {string} prompt - The question to send to the models
 * @param {string[]} modelIds - Array of model identifiers to run
 * @returns {Promise<Array<{ modelId: string, response: string, duration: string }>>} Array of model responses
 */

export async function runParallelModels(prompt, modelIds) {

    const runnerStart = Date.now(); // Record the start of the whole run

    const calls = modelIds.map(async (id)=>{
        try{
            const model = createModel(id);
            const start = Date.now();
            const response = await model.generate(prompt);
            const duration = ((Date.now() - start) / 1000).toFixed(2);
            const personalDuration = ((Date.now() - runnerStart) /1000).toFixed(2)
            // ⚡ PRINT IMMEDIATELY AS SOON AS THIS MODEL FINISHES:
            console.log(`\n⚡ [Instant Output] Model: ${id} finished in ${personalDuration}s:\nResponse: ${response}\n${'-'.repeat(40)}`);
            
            return { modelId: id, response, duration };
        }catch (err) {
            // Re-throw with the model ID attached to identify which provider failed
            throw new Error(`Model "${id}" failed: ${err.message}`);
        }
    });

    // Promise.all rejects immediately if any call throws an error
    return Promise.all(calls);
}