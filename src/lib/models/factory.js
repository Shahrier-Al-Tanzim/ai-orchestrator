// @ts-check
import { geminiProvider } from "./providers/gemini.js";
import { groqProvider } from "./providers/groq.js";
import { mistralProvider } from "./providers/mistral.js";
import { mistralNemoProvider } from "./providers/mistralNemo.js";

/**
 * Mapping of model IDs to their respective provider instances
 * @type {Record<string, import('./types').ModelProvider>}
 */

const providerMap = {
    [geminiProvider.id] : geminiProvider,
    [groqProvider.id] : groqProvider,
    [mistralProvider.id] : mistralProvider,
    [mistralNemoProvider.id] : mistralNemoProvider,
};

/**
 * Factory function to retrieve a model provider instance by its ID.
 * @param {string} modelId - The unique model identifier
 * @returns {import('./types').ModelProvider} The configured provider wrapper
 * @throws {Error} If the model ID is not registered
 */

export function createModel(modelId) {
    const provider = providerMap[modelId];
    
    if (!provider) {
    throw new Error(
      `Unknown model id: "${modelId}". Check src/lib/models/registry.js for valid ids.`
    );
  }
  
  return provider;
}