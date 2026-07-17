# Module 4: Parallel Runner Documentation

## Goals
- Build the concurrent model executor (`parallelRunner.js`) to execute multiple LLM calls in parallel.
- Maintain strict error isolation: if one model fails, crash the whole execution fast with the exact error details.
- Provide a console runner script (`test-parallel.js`) to test and verify parallel API calls.

## Files Created / Modified
- **`src/lib/orchestration/parallelRunner.js`** (Created): Core logic for concurrent execution.
- **`scripts/test-parallel.js`** (Created): Terminal test coordinator.
- **`src/lib/models/providers/mistralNemo.js`** (Created): Fast Mistral Nemo provider.
- **`src/lib/models/factory.js`** (Modified): Registered Nemo provider.
- **`src/lib/models/registry.js`** (Modified): Added Nemo provider to list.

## Packages & Functions Used
- **`ai`** (Vercel AI SDK): `generateText` for text completion.
- **`@ai-sdk/google`**: `createGoogleGenerativeAI` to initialize Google Gemini models.
- **`@ai-sdk/openai`**: `createOpenAI` initialized with custom `baseURL` for Groq/Mistral endpoints.
- **`dotenv`**: Loaded in `test-parallel.js` to parse `.env.local` when executing scripts outside of Next.js.

---

## Errors Faced in Testing & Solutions

### 1. Error: `ERR_MODULE_NOT_FOUND`
* **Symptoms**: Node crashed complaining it couldn't find the `factory` module imported from `parallelRunner.js`.
* **Cause**: Standard Node.js running in ES Modules mode strictly requires explicit relative file extensions (`.js`), whereas Next.js/Webpack resolves extensionless paths automatically.
* **Solution**: Updated relative imports in `parallelRunner.js` and `factory.js` to explicitly end in `.js` (e.g. `import { createModel } from '../models/factory.js';`).

### 2. Error: `Model "gemini-2-5-flash" failed: This model is no longer available to new users`
* **Symptoms**: API call to Gemini failed with a 404/deprecation message.
* **Cause**: Google retired the legacy `gemini-2.5-flash` model for new accounts in favor of newer model architectures.
* **Solution**: Replaced the model string with the latest working flagship model **`gemini-3.5-flash`** inside `registry.js`, `gemini.js`, and `test-parallel.js`.

### 3. Error: `Model "mistral-large" failed: Not Found (404)`
* **Symptoms**: The Mistral API returned a 404 Kong routing error.
* **Cause**: Calling the provider directly (e.g., `mistral('mistral-large-latest')`) triggers the Vercel AI SDK to use OpenAI's newer Responses API under the `/v1/responses` path. Mistral's API does not implement this route.
* **Solution**: Invoked the model via `.chat()` instead: `mistral.chat('open-mistral-nemo')` (and `groq.chat(...)` for Groq). This explicitly forces the SDK to target the standard `/v1/chat/completions` endpoint. Removed the invalid `compatibility: 'compatible'` configuration property.

### 4. Error: Severe API Latency (~56 seconds)
* **Symptoms**: The parallel runner was blocked for nearly a minute waiting on Mistral.
* **Cause**: `mistral-large-latest` is a massive flagship model, and Mistral's free tier was placing the request in a long server queue.
* **Solution**: Created a new lightweight provider for the fast **`open-mistral-nemo`** model. Swapped this model in for testing, dropping parallel runtime latency from ~56s to **~1.2s**.

---

## Latency & Streaming Optimizations
- **Timeline Tracking**: Added a `runnerStart` timestamp inside `parallelRunner.js`.
- **Instant Logging**: Configured a `console.log` inside the `async` loop. As soon as any model finishes its API request, it immediately prints its response and time elapsed to the terminal without waiting for the other models to resolve.
