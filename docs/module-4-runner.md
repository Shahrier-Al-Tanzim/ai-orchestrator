# Module 4: Parallel Runner Documentation

## Goals
- Build the concurrent model executor (`parallelRunner.js`) to execute multiple LLM calls in parallel.
- Maintain strict error isolation: if one model fails, crash the whole execution fast with the exact error details.
- Provide a console runner script to test and verify parallel API calls.

## Technical Implementation Details
- **Concurrent Execution**:
  - `src/lib/orchestration/parallelRunner.js` maps over the input model IDs array.
  - For each ID, it runs `createModel(id).generate(prompt)`.
  - It wraps each call in a try/catch block to tag any errors with the failed model ID before re-throwing.
  - Concurrency is achieved using standard `Promise.all` which naturally acts as a "fail-fast" barrier (rejects immediately when any promise rejects).
- **Console Validation Utility**:
  - `scripts/test-parallel.js` runs in Node.js, uses `dotenv` to load environment keys, and invokes the runner with `gemini-2-5-flash`, `groq-llama-3-3-70b`, and `mistral-large`.

## Verification
- Verified parallelRunner.js exists.
- Verified test-parallel.js runs successfully in local terminal and outputs results from all 3 providers.
