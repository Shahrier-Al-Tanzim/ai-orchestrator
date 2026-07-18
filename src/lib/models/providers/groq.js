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

        // 1. Build a clean, human-readable JSON representation of the Zod schema
        const cleanSchema = {};
        const shape = /** @type {any} */ (schema).shape || {};
        
        for (const key of Object.keys(shape)) {
            const field = shape[key];
            const typeName = field._def.typeName;
            const description = field._def.description || '';
            
            if (typeName === 'ZodString') {
                cleanSchema[key] = `string - ${description}`;
            } else if (typeName === 'ZodEnum') {
                const values = field._def.values.join(', ');
                cleanSchema[key] = `enum (${values}) - ${description}`;
            } else if (typeName === 'ZodArray') {
                const elementShape = field._def.type.shape || {};
                const arrayItemSchema = {};
                for (const subKey of Object.keys(elementShape)) {
                    arrayItemSchema[subKey] = `${elementShape[subKey]._def.typeName.replace('Zod', '').toLowerCase()} - ${elementShape[subKey]._def.description || ''}`;
                }
                cleanSchema[key] = [arrayItemSchema];
            } else {
                cleanSchema[key] = `string - ${description}`;
            }
        }

        // 2. Append the clean schema instructions directly to the prompt
        const schemaInstructions = `You must return your response as a valid JSON object matching this structure:
            {
            "finalAnswer": "string - The refined, synthesized best answer for the user",
            "reasoning": "string - Brief explanation of how the final answer was constructed",
            "contributions": [
                {
                "modelId": "string - The exact ID of the model",
                "strengths": "string - What this model got right or contributed"
                }
            ],
            "confidence": "string - Must be exactly one of: 'low', 'medium', or 'high'"
            }
            CRITICAL FORMATTING RULES:
            1. "contributions" MUST be a JSON array of objects. Never return it as a single string.
            2. "confidence" MUST be exactly one of these three lowercase values: "low", "medium", or "high". Do not add any explanation, capitalization, or extra characters to the confidence value.
            3. Return ONLY the raw JSON object. Do not wrap it in markdown code block formatting (like \`\`\`json) and do not write any conversational text.`;

        // 3. Call our standard text generator
        const responseText = await this.generate(`${prompt}\n${schemaInstructions}`, options);

        // 4. Parse and validate the response against the Zod schema
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