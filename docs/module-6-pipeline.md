# Module 6: Orchestrator Pipeline Documentation

## Goals
- Combine the concurrent execution stage (`parallelRunner.js`) and the synthesis stage (`evaluator.js`) into a single, unified pipeline function.
- Create an end-to-end console test script (`test-pipeline.js`) to verify the workflow with real API calls across three different model providers.

## Technical Implementation Details
- **Pipeline Function**:
  - `src/lib/orchestration/pipeline.js` exports `runSelfConsistencyOrchestrator(prompt, modelIds, evaluatorId)`.
  - It calls `runParallelModels(prompt, modelIds)` to get concurrent responses.
  - It pipes the prompt and the parallel results into `evaluateResponses(prompt, parallelResults, evaluatorId)` and returns the structured evaluation object.
- **Verification Script**:
  - `scripts/test-pipeline.js` runs the pipeline with:
    - Parallel models: `['gemini-3.5-flash', 'groq-llama-3-3-70b', 'open-mistral-nemo']`
    - Evaluator model: `groq-llama-3-3-70b` (since we patched its structured output fallback!)
    - Prompts a real, complex query and prints the final structured JSON object.

## Verification
- Verified end-to-end execution of `scripts/test-pipeline.js` completes successfully and parses the final validated JSON output conforming to `EvaluatorResponseSchema`.
