// @ts-check
/**
 * @typedef {Object} ModelMetadata
 * @property {string} id - Unique identifier, e.g. 'gemini-2-5-flash'
 * @property {string} label - Human-readable name for UI dropdowns
 * @property {'free' | 'paid'} tier - Access tier (free vs paid)
 */


/**
 * List of models available to selection interfaces in the application.
 * @type {ModelMetadata[]}
 */

export const AVAILABLE_MODELS = [
    { id: 'gemini-2-5-flash', label: 'Google — Gemini 2.5 Flash', tier: 'free' },
    { id: 'groq-llama-3-3-70b', label: 'Groq — Llama 3.3 70B', tier: 'free' },
    { id: 'mistral-large', label: 'Mistral — Large', tier: 'free' },
];