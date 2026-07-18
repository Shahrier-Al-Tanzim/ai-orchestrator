// @ts-check
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, generateObject } from 'ai';

const mistral = createOpenAI({
  baseURL: 'https://api.mistral.ai/v1',
  apiKey: process.env.MISTRAL_API_KEY,
});

/** @type {import('../types').ModelProvider} */
export const mistralNemoProvider = {
  id: 'open-mistral-nemo',
  label: 'Mistral — Nemo',

  async generate(prompt, options = {}) {
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY is not defined in environment variables.');
    }

    const { text } = await generateText({
      model: mistral.chat('open-mistral-nemo'),
      prompt,
      ...options,
    });
    return text;
  },

  async generateStructured(prompt, schema, options = {}) {
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error('MISTRAL_API_KEY is not defined in environment variables.');
    }

    const { object } = await generateObject({
      model: mistral.chat('open-mistral-nemo'),
      prompt,
      schema,
      ...options,
    });
    return object;
  },
};
