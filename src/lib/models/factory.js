// @ts-check
import { geminiProvider } from "./providers/gemini";
import { groqProvider } from "./providers/groq";
import { mistralProvider } from "./providers/mistral";

/**
 * AMpping of medl IDs tot their respective provider instances
 * @type {Record<string, import('./types').ModelProvider>}
 */

const providerMap = {
    [geminiProvider.id] : geminiProvider,
    [groqProvider.id] : groqProvider,
    [mistralProvider.id] : mistralProvider,
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