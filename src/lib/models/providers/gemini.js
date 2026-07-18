// @ts-check 
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, generateObject, streamText } from 'ai';

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
});

/** @type {import('../types').ModelProvider} */
export const geminiProvider = {
    id: 'gemini-3.1-flash-lite',
    label: 'Google — Gemini 3.1 Flash Lite',

    async generate(prompt, options = {}) {
        if(!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not defined in environment variables.');
        }

        const {text} = await generateText({
            model: google("gemini-3.1-flash-lite"),
            prompt, 
            ...options,
        });

        return text;
    },

    async stream(prompt, options = {}) {
        if(!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not defined in environment variables.');
        }

        const { textStream } = await streamText({
            model: google("gemini-3.1-flash-lite"),
            prompt,
            ...options,
        });

        return textStream;
    },

    async generateStructured(prompt, schema, options = {}) {
        if(!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not defined in environment variables.');
        }

        const {object} = await generateObject({
            model: google('gemini-3.1-flash-lite'),
            prompt,
            schema,
            ...options,
        });

        return object;
    },
};
