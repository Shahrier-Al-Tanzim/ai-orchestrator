// @ts-check

import {createOpenAI} from '@ai-sdk/openai'
import {generateText, generateObject} from 'ai'

// Groq exposes an OpenAI-compatible API, so we use the @ai-sdk/openai adapter
// pointed to Groq's custom API endpoint.

const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
});

/** @type {import('../types').ModelProvider} */
export const groqProvider = {
    id: 'groq-llama-3-3-70b',
    label: 'Groq - Llama 3.3 70B',

    async generate(prompt, options = {}) {
        if (!process.env.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY is not defined in environment variables.');
        }

        const {text} = await generateText({
            model: groq.chat('llama-3.3-70b-versatile'),
            prompt,
            ...options,
        });

        return text;
    },

    async generateStructured(prompt, schema, options={}) {
        if (!process.env.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY is not defined in environment variables.');
        }

       const {object} = await generateObject({
        model: groq.chat('llama-3.3-70b-versatile'),
        prompt,
        schema,
        ...options,
       })

        return object;
    }
}