# Self-Consistency LLM Orchestrator — Full Build Plan

## 0. Two-track build strategy

This project is built **twice, in two separate folders, one after the other** — not at the same time.

- **Track 1 — `/orchestrator-ai-sdk`** (build this first, completely, and deploy it). Uses the Vercel AI SDK (`ai` package + `@ai-sdk/*` adapters) as described throughout Sections 1-11 below. This is your primary, working, deployed project.
- **Track 2 — `/orchestrator-native-sdks`** (build this only after Track 1 is fully working and deployed). Same architecture, same factory pattern, same orchestration logic — but each provider file calls that provider's own official SDK directly (`openai`, `@anthropic-ai/sdk`, `groq-sdk`, etc.) instead of the AI SDK, so you personally write the normalization the AI SDK was doing for you in Track 1. Covered in Section 12, at the end of this document.

The point of this split: get a complete, deployed, working app fast using the abstraction (Track 1), then go back and learn what that abstraction was hiding by rebuilding the same provider layer by hand (Track 2), with zero pressure to get Track 2 done before you have something real and shippable. Everything in Sections 1-11 describes Track 1 only; Track 2 reuses the exact same orchestration/factory design, just with different internals in the provider files.

## 1. What this app does

A user types a question into a chat UI. The question is sent to **3 different LLMs in parallel**. Each returns its own answer. All 3 answers are then passed to a **4th "evaluator" model**, which compares them, identifies the strongest parts of each, and produces a single refined final answer — not a copy of any one model's response, but a synthesis.

The core design goal: **every model in the pipeline (all 3 parallel models + the evaluator) must be swappable** — paid or free, any provider — without touching orchestration code. This is achieved with a **provider interface + factory pattern**, so each model lives in its own file and the rest of the app only ever talks to the abstraction.

## 2. Tech stack

- **Next.js 14+ (App Router)**, JavaScript (not TypeScript, per your preference — though the interfaces below translate directly to TS later if you want it; TS would catch factory/interface mismatches at write-time, but the JSDoc typedefs below give most of that benefit without adding new syntax to learn right now). **Add `// @ts-check` as the first line of every `.js` file** — VS Code's built-in TypeScript engine will then read the JSDoc typedefs (like `ModelProvider` in Section 5.1) and flag type mistakes live as you type (wrong argument types, calling a method that doesn't exist, forgetting to `await` a promise), with zero new syntax and zero build step. This gets you most of TS's write-time safety net while staying 100% plain JavaScript — worth turning on in every file in this project.
- **Vercel** for deployment. **Free Hobby tier is enough for this project** — no paid Vercel plan required.
- **Zod** for schema validation and structured output parsing
- **Vercel AI SDK (`ai` package)** — a free, open-source npm library, not a paid service. It's the underlying HTTP client for each provider file, and already has adapters for OpenAI, Anthropic, Google, Groq, Mistral, and others, which saves you from hand-rolling fetch calls and response parsing for every single provider. You still write your own thin wrapper per provider (that's your factory pattern learning exercise) — the SDK just handles the messy parts underneath (retries, streaming primitives, provider-specific request shapes). **The only real cost anywhere in this stack is calling a paid model provider's API** — stick to free providers (Groq, Gemini, Mistral) and this entire project costs $0 to build, run, and host.
- No database needed for the MVP — conversation state lives in React state / URL params. (Optional stretch module below adds persistence.)

## 3. Core architectural decision: structured output vs streaming

**Use structured output (Zod) as the primary mechanism. Treat streaming as an optional later enhancement.**

Reasoning:
- The evaluator's job is fundamentally a **comparison and synthesis task** — you need reliable, parseable fields (final answer text, which model contributed the strongest reasoning, a short rationale). A Zod schema guarantees this shape every single time, regardless of which model is running as the evaluator.
- Streaming raw tokens is great for perceived speed on a single long response, but multiplexing 4 concurrent model calls (3 parallel + 1 evaluator) into one coherent streamed UI is a genuinely harder problem, and it doesn't help correctness — only perceived latency.
- Get the pipeline **correct first** with structured output end-to-end. Once that works, Module 11 below shows how to layer in streaming for just the final answer (the longest wait, and the one most worth the UX investment) without having to touch the core orchestration logic.

## 4. Folder structure (Track 1 — `/orchestrator-ai-sdk`)

```
/app
  /api
    /orchestrate
      route.js          → main API endpoint: runs the whole pipeline
  page.js                → chat UI page
  layout.js

/lib
  /models
    /providers
      openai.js          → OpenAI provider implementation
      claude.js           → Anthropic provider implementation
      gemini.js           → Google Gemini provider implementation
      groq.js              → Groq provider implementation
      mistral.js           → Mistral provider implementation
    factory.js             → createModel(modelId) factory function
    registry.js            → list of available models + metadata (for the frontend dropdown)
    types.js               → shared interface documentation (JSDoc typedefs since we're in JS)
  /orchestration
    parallelRunner.js      → fans out the prompt to 3 models concurrently
    evaluator.js           → calls the judge model with the structured output schema
    schemas.js             → Zod schemas (EvaluatorResponseSchema etc.)
  /utils
    errorHandling.js       → normalizes provider errors into a common shape
    retry.js               → simple retry-with-backoff helper

/components
  ChatInput.jsx
  ModelSelector.jsx        → dropdowns/checkboxes to pick which 3 models + evaluator
  ModelResponseCard.jsx    → displays one model's raw response
  FinalAnswerCard.jsx      → displays the synthesized final answer
  LoadingState.jsx
  ErrorBanner.jsx

/hooks
  useOrchestration.js      → manages the full request lifecycle: loading, results, errors

.env.local                 → API keys, never committed
```

## 5. The core abstraction (this is the heart of the "swap any model" requirement)

### 5.1 Provider interface (`lib/models/types.js`)

Every provider file must implement this shape. Since we're in plain JavaScript, document it with JSDoc so your editor still gives you type hints:

```js
/**
 * @typedef {Object} ModelProvider
 * @property {string} id - unique identifier, e.g. "openai-gpt4o-mini"
 * @property {string} label - human-readable name for the UI dropdown
 * @property {(prompt: string, options?: object) => Promise<string>} generate
 *   - takes a prompt, returns the raw text response
 * @property {(prompt: string, schema: import('zod').ZodSchema, options?: object) => Promise<object>} generateStructured
 *   - takes a prompt + Zod schema, returns a parsed object matching that schema
 */
```

Every single provider — OpenAI, Claude, Gemini, Groq, Mistral, whatever you add next — implements exactly these two methods. Nothing else in the app is allowed to know which underlying SDK or API shape a provider uses internally.

### 5.2 Example provider file (`lib/models/providers/groq.js`)

Building the free providers first, so this is your first real implementation — no paid API key needed to get the whole pipeline working:

```js
import { createGroq } from '@ai-sdk/groq';
import { generateText, generateObject } from 'ai';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export const groqProvider = {
  id: 'groq-llama-3-3-70b',
  label: 'Groq — Llama 3.3 70B',

  async generate(prompt, options = {}) {
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt,
      ...options,
    });
    return text;
  },

  async generateStructured(prompt, schema, options = {}) {
    const { object } = await generateObject({
      model: groq('llama-3.3-70b-versatile'),
      prompt,
      schema,
      ...options,
    });
    return object;
  },
};
```

`gemini.js` and `mistral.js` follow this exact same shape — just swap the SDK import, API key env var, and model string. Once your 3 free providers are working end-to-end, `openai.js` and `claude.js` slot in later using the identical pattern (see Section 8's module order).

### 5.3 The factory (`lib/models/factory.js`)

```js
// Phase 1: free providers only. Add openaiProvider / claudeProvider imports
// here later, once the free pipeline is verified end-to-end (see Section 8).
import { geminiProvider } from './providers/gemini';
import { groqProvider } from './providers/groq';
import { mistralProvider } from './providers/mistral';

const providerMap = {
  [geminiProvider.id]: geminiProvider,
  [groqProvider.id]: groqProvider,
  [mistralProvider.id]: mistralProvider,
};

export function createModel(modelId) {
  const provider = providerMap[modelId];
  if (!provider) {
    throw new Error(`Unknown model id: ${modelId}. Check lib/models/registry.js for valid ids.`);
  }
  return provider;
}
```

This is the entire point of the exercise: **anywhere in the app that needs a model, it calls `createModel(modelId)` and gets back an object with `.generate()` and `.generateStructured()`.** Nothing downstream cares whether that's OpenAI, Claude, Groq, or a free Mistral endpoint. Swapping a model is a one-line change: pass a different `modelId`.

### 5.4 Registry (`lib/models/registry.js`)

A plain list the frontend dropdown reads from, decoupled from the factory's internal map:

```js
export const AVAILABLE_MODELS = [
  { id: 'openai-gpt-4o-mini', label: 'OpenAI — GPT-4o mini', tier: 'paid' },
  { id: 'claude-haiku-4-5', label: 'Claude — Haiku 4.5', tier: 'paid' },
  { id: 'groq-llama-3-3-70b', label: 'Groq — Llama 3.3 70B', tier: 'free' },
  { id: 'gemini-2-5-flash', label: 'Google — Gemini 2.5 Flash', tier: 'free' },
  { id: 'mistral-large', label: 'Mistral — Large', tier: 'free' },
];
```

## 6. Orchestration logic

### 6.1 Parallel runner (`lib/orchestration/parallelRunner.js`)

```js
import { createModel } from '../models/factory';

/**
 * Fail-fast: if any model fails, the whole pipeline stops immediately.
 * The thrown error names exactly which model failed and why, so the
 * caller (the API route, then the console/UI) can report it clearly.
 */
export async function runParallelModels(prompt, modelIds) {
  const calls = modelIds.map(async (id) => {
    try {
      const response = await createModel(id).generate(prompt);
      return { modelId: id, response };
    } catch (err) {
      // Re-throw with the model id attached, so Promise.all rejects
      // with a message that says exactly which model broke and why.
      throw new Error(`Model "${id}" failed: ${err.message}`);
    }
  });

  // Promise.all (not allSettled) is deliberate here, per your requirement:
  // one failing model stops the entire request rather than silently
  // continuing with partial results.
  return Promise.all(calls);
}
```

This is a deliberate change from the usual "continue with partial results" pattern — here, **any single model failure halts the whole pipeline** and the error message names the exact model and reason. This is simpler to reason about while you're learning, and makes failures loud instead of silent. (If you want partial-continue resilience later, that's a one-line swap back to `Promise.allSettled` — see the note in Section 9.)

### 6.2 Structured output schema (`lib/orchestration/schemas.js`)

```js
import { z } from 'zod';

export const EvaluatorResponseSchema = z.object({
  finalAnswer: z.string().describe('The refined, synthesized best answer for the user'),
  reasoning: z.string().describe('Brief explanation of how the final answer was constructed'),
  contributions: z.array(
    z.object({
      modelId: z.string(),
      strengths: z.string().describe('What this model got right or contributed'),
    })
  ),
  confidence: z.enum(['low', 'medium', 'high']),
});
```

### 6.3 Evaluator (`lib/orchestration/evaluator.js`)

```js
import { createModel } from '../models/factory';
import { EvaluatorResponseSchema } from './schemas';

export async function evaluateResponses(originalPrompt, modelResults, evaluatorModelId) {
  // By the time we get here, runParallelModels has already thrown if any
  // model failed — so modelResults is guaranteed to be all successes.
  const evaluationPrompt = `
You are given a user's question and multiple AI-generated answers to it.
Compare them, identify the strongest parts of each, and write the best possible final answer.
Do not simply copy one answer — synthesize a refined response.

Original question: ${originalPrompt}

${modelResults.map((r, i) => `Answer ${i + 1} (model: ${r.modelId}):\n${r.response}`).join('\n\n')}
`;

  const evaluator = createModel(evaluatorModelId);
  return evaluator.generateStructured(evaluationPrompt, EvaluatorResponseSchema);
}
```

### 6.4 API route (`app/api/orchestrate/route.js`)

```js
import { runParallelModels } from '@/lib/orchestration/parallelRunner';
import { evaluateResponses } from '@/lib/orchestration/evaluator';

export async function POST(request) {
  const { prompt, modelIds, evaluatorModelId } = await request.json();

  if (!prompt || !modelIds || modelIds.length === 0 || !evaluatorModelId) {
    return Response.json({ error: 'Missing prompt, modelIds, or evaluatorModelId' }, { status: 400 });
  }

  // Step 1: parallel model calls. Separate try/catch so we can say exactly
  // which stage failed — "a parallel model failed" vs "the evaluator failed".
  let modelResults;
  try {
    modelResults = await runParallelModels(prompt, modelIds);
  } catch (err) {
    console.error('Pipeline stopped — a parallel model failed:', err.message);
    return Response.json({ error: err.message, stage: 'parallel-models' }, { status: 502 });
  }

  // Step 2: evaluator. Only reached if all 3 parallel models succeeded.
  try {
    const evaluation = await evaluateResponses(prompt, modelResults, evaluatorModelId);
    return Response.json({ modelResults, evaluation });
  } catch (err) {
    console.error('Pipeline stopped — the evaluator model failed:', err.message);
    return Response.json({ error: err.message, stage: 'evaluator' }, { status: 502 });
  }
}
```

Note the two separate `try/catch` blocks: this is deliberate so the error response (and your console log while testing) always tells you **which stage broke** — one of the 3 parallel models, or the evaluator itself — not just "something went wrong somewhere."

## 7. Frontend

### 7.1 Model selector (`components/ModelSelector.jsx`)

Reads from `AVAILABLE_MODELS` in the registry. Lets the user pick exactly 3 models for the parallel step and 1 model as the evaluator (a simple set of dropdowns or checkboxes is enough — no need for anything fancy).

### 7.2 Chat flow (`hooks/useOrchestration.js`)

Manages: `prompt`, `selectedModelIds`, `evaluatorModelId`, `isLoading`, `modelResults`, `finalAnswer`, `error`. Calls `POST /api/orchestrate`, updates state from the response.

### 7.3 Display components

- `ModelResponseCard.jsx` — one card per parallel model, showing its raw answer (or an error state if that model failed)
- `FinalAnswerCard.jsx` — the synthesized answer, plus an expandable section showing the evaluator's reasoning and per-model contributions (this is good for demoing that it's a genuine synthesis, not a copy)
- `LoadingState.jsx` — shows progress: "Waiting on 3 models..." → "Synthesizing final answer..."
- `ErrorBanner.jsx` — surfaces partial failures without blocking the whole result

## 8. Module breakdown (build in this order, each is a learning chunk)

Split deliberately into two phases: **backend fully verified in the console first, frontend second.** Don't start Phase B until every item in Phase A works and you've confirmed it by reading terminal/console output — not by looking at a UI.

### Phase A — backend only, all 3 models free, verified via console/curl

1. **Project setup** — `create-next-app`, install `ai`, `zod`, and only the free-provider SDK packages (`@ai-sdk/google`, Groq's SDK, Mistral's SDK). No OpenAI/Claude keys needed yet. Add `// @ts-check` as the first line of every `.js` file you create from here on (see Section 2) — it's free, live type-checking with no build step, and the earlier you get in the habit, the more mistakes it catches for you.
2. **Provider interface + all 3 free providers** — build `types.js`, then `groq.js`, `gemini.js`, and `mistral.js` (Section 5.2's Groq file is the template for all three)
3. **Factory pattern** — wire up `factory.js` and `registry.js` with only the 3 free providers registered
4. **Parallel runner** — fail-fast fan-out (Section 6.1), test it standalone first: write a tiny script (`node -e` or a `scripts/test-parallel.js` file) that calls `runParallelModels()` directly and `console.log`s the result, so you see it working before any API route exists
5. **Zod schema + evaluator** — structured output synthesis step, again test standalone with a script before wiring it into a route
6. **API route** — wire orchestration into `app/api/orchestrate/route.js`
7. **Backend verification pass** — hit the route with `curl` or Postman using all 3 free models. Confirm in the console: (a) a normal successful run returns a well-formed evaluation object, (b) deliberately breaking one model (bad API key, invalid model string) makes the whole request fail fast with a clear "Model X failed: [reason]" message and a 502, not a silent partial result. Do not move to Phase B until both of these are confirmed.

### Phase B — add paid providers, then build the frontend

8. **Add paid providers** — `openai.js` and `claude.js`, same interface, registered in `factory.js`/`registry.js` alongside the free ones. Re-run the Phase A verification pass (step 7) once with a paid model in the mix to confirm nothing about the abstraction changes.
9. **Basic chat UI** — input box, submit button, plain result display (no styling yet)
10. **Model selector UI** — dropdowns wired to the registry, showing free vs paid tier
11. **Response cards + final answer display** — proper formatted output, per-model cards, evaluator reasoning
12. **Error handling & loading states in the UI** — surface the backend's fail-fast error clearly (which model failed and why), retry button, loading indicators
13. **Deployment** — Vercel setup, environment variables, function timeout considerations (see below). **Once this is live and working end to end, Track 1 is done — move to Section 12 for Track 2.**
14. *(Optional, later, still within Track 1)* **Streaming the final answer** — once everything above works, revisit streaming specifically for the evaluator's `finalAnswer` field using the AI SDK's `streamObject`, which streams partial structured output as it's generated — you get both structure and streaming, but it's meaningfully more complex to wire up on the frontend (partial JSON parsing), which is why it's last, not first
15. *(Optional, later, still within Track 1)* **Conversation history / persistence** — if you want multi-turn context, not just single-shot Q&A

## 9. Deployment considerations (Vercel specifics)

- Vercel's Hobby plan serverless functions have execution time limits (historically around 10-60 seconds depending on plan and function type — check current limits on Vercel's docs before deploying, since these change). Your pipeline makes up to **4 sequential-ish model calls** (3 parallel + 1 evaluator that waits on all 3), so if any model is slow, you could approach that limit. Mitigate by:
  - Setting reasonable per-provider timeouts (e.g. 15s) so one slow model doesn't stall the whole request
  - Being aware that the fail-fast design (Section 6.1) means **one slow or failing model blocks the whole response** — this is the tradeoff of the requirement to stop and report on any failure, rather than silently continuing with partial results. If this becomes a problem in production (one flaky free-tier provider tanking your whole app), the fix is a one-line change from `Promise.all` back to `Promise.allSettled` in `parallelRunner.js` — but that's a deliberate later decision, not the default here.
- Store all API keys as Vercel environment variables, never in code
- Free-tier model providers (Groq, Gemini, Mistral) are rate-limited — since a single rate-limited model now fails the entire request (fail-fast), this matters more than it would with partial-continue. If you're demoing this live, test each free provider right beforehand to confirm none are currently rate-limited.

## 10. Things worth adding that weren't explicitly asked for

- **Per-request cost/token tracking** — log token usage per model call so you can see which models are expensive relative to their contribution quality. Useful given everything we discussed about budget.
- **A "raw JSON" debug view** — a collapsible panel showing the exact evaluator schema output, useful while you're learning to see structured output working correctly.
- **Clear fail-fast messaging in the UI** — since the backend stops the whole request the moment any one model fails, the frontend's `ErrorBanner.jsx` should surface the exact message from the API response ("Model 'gemini-2-5-flash' failed: rate limit exceeded") rather than a generic "something went wrong," so you can debug at a glance which provider needs attention.
- **A "compare mode" toggle** — a UI toggle to show all 3 raw responses side-by-side, so you and anyone reviewing your course project can visually verify the evaluator is actually doing meaningful synthesis, not just picking one.

## 11. Summary of the swap requirement

To use a different model anywhere in the pipeline: add a new provider file matching the interface in Section 5.1, register it in `factory.js` and `registry.js`, and select it in the UI dropdown. No changes to `parallelRunner.js`, `evaluator.js`, or the API route are ever required. That's the whole point of the abstraction.

## 12. Track 2 — rebuilding with native provider SDKs (start only after Track 1 is deployed)

### 12.1 Goal

Rebuild the exact same app in a new folder, `/orchestrator-native-sdks`, but this time each provider file talks to that provider's own official SDK directly — no `ai` package, no `@ai-sdk/*` adapters anywhere. This is where you see, firsthand, the raw request/response shapes, streaming mechanics, and error types that the AI SDK was normalizing away in Track 1.

### 12.2 What carries over unchanged

Copy these files from Track 1 into Track 2 with **no changes** — this is deliberate, so you can see clearly that the abstraction boundary really is just the provider files:

- `lib/models/types.js` — the `ModelProvider` interface stays identical: still just `generate(prompt)` and `generateStructured(prompt, schema)`
- `lib/models/factory.js` and `registry.js` — unchanged, since they only ever call the interface, never a provider's internals
- `lib/orchestration/parallelRunner.js`, `evaluator.js`, `schemas.js` — unchanged, fail-fast logic and all
- `app/api/orchestrate/route.js` — unchanged
- Everything in `/components` and `/hooks` — unchanged

If any of these files need to change to make Track 2 work, that's a signal the interface in 12.3 leaked something provider-specific — go back and fix the interface, don't leak it into orchestration code.

### 12.3 What you rewrite: the provider files

Install each provider's own official package instead of an AI SDK adapter:

```
npm install groq-sdk openai @anthropic-ai/sdk @google/generative-ai @mistralai/mistralai
```

**Example: `groq.js`, rewritten with the native Groq SDK (no AI SDK):**

```js
import Groq from 'groq-sdk';

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const groqProvider = {
  id: 'groq-llama-3-3-70b',
  label: 'Groq — Llama 3.3 70B',

  async generate(prompt, options = {}) {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      ...options,
    });
    // Groq's raw response nests the text here — YOU have to know this shape now;
    // in Track 1 the AI SDK adapter knew it for you.
    return completion.choices[0].message.content;
  },

  async generateStructured(prompt, schema, options = {}) {
    // Groq's SDK has no built-in Zod integration like AI SDK's generateObject.
    // You do it manually: ask for JSON in the prompt, parse it, validate with Zod yourself.
    const jsonInstructions = `Respond only with valid JSON matching this shape, no other text:\n${schema.toString()}`;
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: `${prompt}\n\n${jsonInstructions}` }],
      response_format: { type: 'json_object' },
      ...options,
    });
    const raw = JSON.parse(completion.choices[0].message.content);
    return schema.parse(raw); // throws if the model's JSON doesn't match — you now handle that yourself
  },
};
```

Notice what changed compared to the Track 1 version: you now know exactly where the text lives in Groq's response (`completion.choices[0].message.content`), and you've had to hand-build the "ask for JSON, parse it, validate it" logic that `generateObject` was doing silently in Track 1.

**Do this same rewrite for each provider**, and you'll see the differences the AI SDK was hiding:
- **OpenAI** (`openai` package) — very similar shape to Groq's (`chat.completions.create`, `choices[0].message.content`), since Groq's API is intentionally OpenAI-compatible
- **Anthropic** (`@anthropic-ai/sdk`) — different shape entirely: `client.messages.create()`, and the response text lives in a `content` array of blocks (`response.content[0].text`), not a `choices` array
- **Google Gemini** (`@google/generative-ai`) — different again: `model.generateContent(prompt)`, and text comes from `result.response.text()` — a method call, not a property
- **Mistral** (`@mistralai/mistralai`) — closer to OpenAI's shape, but with its own client initialization and slightly different parameter names

### 12.4 Module breakdown for Track 2

1. Set up `/orchestrator-native-sdks` as a fresh Next.js project (or copy Track 1's project and strip out the `ai`/`@ai-sdk/*` dependencies)
2. Copy over the unchanged files from Section 12.2
3. Rewrite `groq.js` using the native `groq-sdk` package (Section 12.3's example) — test it standalone with a console script, same as Phase A did in Track 1
4. Rewrite `gemini.js` and `mistral.js` natively — notice how much more each one differs from Groq's shape than the Track 1 versions did
5. Verify the backend end-to-end via curl, exactly as in Track 1's Phase A step 7 — same fail-fast behavior should hold, since `parallelRunner.js` didn't change
6. Add `openai.js` and `claude.js` natively — Claude's `content` array shape is the biggest departure from the others, good place to slow down and actually read Anthropic's API docs
7. Reuse Track 1's frontend as-is (it only ever talked to `/api/orchestrate`, so it doesn't know or care which track's backend is running) — or copy it into this folder too if you want two fully independent, deployable projects
8. *(Optional)* Deploy Track 2 separately on Vercel too, so you have both versions live and can compare them side by side

### 12.5 What this second pass should teach you

By the end of Track 2, you should be able to explain, from memory, at least: where the response text lives in each of the 5 providers' raw responses, which providers use a `messages` array vs a single `prompt`/`contents` field, how each one handles structured/JSON output (native support vs manual prompting), and what a rate-limit or auth error actually looks like from each provider's raw SDK — all of which Track 1's AI SDK abstraction quietly handled for you.
