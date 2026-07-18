// @ts-check

/**
 * @typedef {Object} ModelProvider
 * @property {string} id - Unique identifier for the model, e.g. "gemini-2-5-flash"
 * @property {string} label - Human-readable name for the UI dropdown
 * @property {(prompt: string, options?: object) => Promise<string>} generate
 *  - Takes a prompt string and returns the raw model text response
 * @property {(prompt: string, options?: object) => Promise<AsyncIterable<string>>} stream
 *  - Takes a prompt and returns an asynchronous iterable stream of text chunks
 * @property {(prompt: string, schema: import('zod').ZodSchema, options?: object) => Promise<object>} generateStructured
 *  - Takes a prompt string + zod schema and returns a parsed object matching that schema
 */

export {};
