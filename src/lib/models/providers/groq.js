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

         // 1. Append the schema instructions directly to the prompt
        const schemaInstructions = `
            You must return your response as a valid JSON object matching this schema:
            ${JSON.stringify(/** @type {any} */ (schema).shape, null, 2)}
            Return ONLY the raw JSON object. Do not wrap it in markdown formatting (like \`\`\`json) and do not write any conversational text.`;

        // 2. Call our standard text generator
        const responseText = await this.generate(`${prompt}\n${schemaInstructions}`, options);

        // 3. Parse and validate the response against the Zod schema
        try {
            // Strip code block markers if the model accidentally included them
            const cleanJSON = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJSON);
            
            // Validate the structure using Zod
            return schema.parse(parsed);
        } catch (err) {
            throw new Error(`Groq failed to return valid JSON matching the schema: ${err.message}. Raw output: ${responseText}`);
        }
    }

}