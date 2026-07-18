// @ts-check

import {createOpenAI} from '@ai-sdk/openai'
import {generateText, generateObject} from 'ai'

// Mistral also exposes an OpenAI-compatible endpoint.
// Alternatively, @ai-sdk/mistral exists, but using the OpenAI adapter
// demonstrates how standard compatible endpoints are configured.

const mistral = createOpenAI({
    baseURL : 'https://api.mistral.ai/v1',
    apiKey: process.env.MISTRAL_API_KEY,
});

/**@type {import('../types').ModelProvider} */
export const mistralProvider = {
    id: 'mistral-large',
    label: 'Mistral - Large',

    async generate(prompt, options ={}) {
         if (!process.env.MISTRAL_API_KEY) {
            throw new Error('MISTRAL_API_KEY is not defined in environment variables.');
        }

        const {text} = await generateText({
            model: mistral.chat('mistral-large-latest'),
            prompt,
            ...options,
        });
        return text;
    },

    async generateStructured(prompt, schema, options ={}) {
        if (!process.env.MISTRAL_API_KEY) {
            throw new Error('MISTRAL_API_KEY is not defined in environment variables.');
        }

        const {object} = await generateObject({
            model: mistral.chat('mistral-large-latest'),
            prompt,
            schema,
            ...options,
        });
        return object;
    },
};