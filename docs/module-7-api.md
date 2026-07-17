# Module 7: API Route Documentation

## Goals
- Expose the pipeline orchestration process as a Next.js App Router API Route (Route Handler).
- Accept dynamic parameters (prompt, model list, evaluator model ID) via HTTP POST.
- Return the synthesized self-consistency response as validated JSON.

## Technical Implementation Details
- **Route Handler**:
  - `src/app/api/orchestrate/route.js` handles `POST` requests.
  - Implements input parameter validation: checks if `prompt` is present, `modelIds` is a non-empty array, and `evaluatorId` is a string.
  - Catches pipeline runtime errors and returns a `500 Internal Server Error` with JSON error messages.
- **Vercel/Next.js Lifecycle**:
  - Automatically loads `.env.local` environment variables inside the App Router execution container.

## Verification
- Run server using `npm run dev`.
- Tested the endpoint by sending a POST request containing custom prompts.
- Verified that it returns a valid JSON matching the `EvaluatorResponse` structure.
