# Module 2: Provider Interface & Free Providers Documentation

## Goals
- Define a uniform contract (`ModelProvider`) that all models must implement.
- Implement the wrappers for the three free LLM providers: Groq, Google Gemini, and Mistral using the Vercel AI SDK.

## Technical Implementation Details
- **Type Checking**: Utilizes `// @ts-check` at the top of Javascript files to leverage JSDoc typedef annotation matching in VS Code's editor engine.
- **Provider Interface**: A unified shape exposing:
  - `id`: Unique identifier
  - `label`: UI display name
  - `generate(prompt, options)`: Standard text generation
  - `generateStructured(prompt, schema, options)`: Structured object validation via Zod
- **SDK Integrations**:
  - Google Gemini uses `@ai-sdk/google`.
  - Groq and Mistral are OpenAI-compatible, so they use `@ai-sdk/openai` configured with custom base URLs/endpoints and matching model names.

## Verification
- Verified module files exist in `src/lib/models/` and `src/lib/models/providers/`.
