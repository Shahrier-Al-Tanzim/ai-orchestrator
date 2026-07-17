# Module 5: Zod Schema & Evaluator Documentation

## Goals
- Define a structured Zod validation schema representing the output of the LLM pipeline's evaluation stage.
- Implement the evaluator function `evaluateResponses` to format comparison prompts and call `.generateStructured()` to get validated JSON.
- Create a terminal test script to verify structured output parsing.

## Technical Implementation Details
- **Zod Schema**:
  - `src/lib/orchestration/schemas.js` exports `EvaluatorResponseSchema` which requires:
    - `finalAnswer`: Synthesized response.
    - `reasoning`: Summary of the evaluation.
    - `contributions`: Array tracking strengths of each model ID.
    - `confidence`: Enum of 'low', 'medium', 'high'.
- **Evaluator**:
  - `src/lib/orchestration/evaluator.js` maps over the parallel results to create a structured evaluation prompt.
  - Resolves the evaluator model provider via `createModel` and executes `.generateStructured` with the schema.

## Verification
- Verified Zod schemas export correctly.
- Verified terminal execution of `scripts/test-evaluator.js` works and returns a validated JSON object conforming to the schema.
