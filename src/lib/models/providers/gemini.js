// Initialize the Google Gemini client
// IT autmatiocally reads process.env.GEMINI_API_KEY

import { generateObject } from 'ai';

const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
});

/** @type {import('../types').ModelProvider} */
export const geminiProvider = {
    id: 'gemini-2-5-flash',
    label: 'Google - gemini 2.5 Flash',

    async generate(prompt, options = {}) {
        if(!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not defined in environment variables.');
        }

        const {text} = await generateText({
            model: google("gemini-2.5-flash"),
            prompt, 
            ...options,
        });

        return text;
    },

    async generateStructued(prompt, schema, options = {}) {
        if(!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not defined in environment variables.');
        }

        const {object} = await generateObject({
            model: google('gemini-2.5-flash'),
            prompt,
            schema,
            ...options,
        });

        return object;
    },
};