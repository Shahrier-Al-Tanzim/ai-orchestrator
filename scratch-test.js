const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function testGroq() {
  const { generateObject } = await import('ai');
  const { createOpenAI } = await import('@ai-sdk/openai');
  const { EvaluatorResponseSchema } = await import('./src/lib/orchestration/schemas.js');

  const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
    compatibility: 'compatible', // ⚡ Force compatibility mode
  });

  try {
    const { object } = await generateObject({
      // Call groq(...) directly with structuredOutputs: false
      model: groq('llama-3.3-70b-versatile', { structuredOutputs: false }),
      prompt: 'Provide a list of capital cities',
      schema: EvaluatorResponseSchema,
    });
    console.log('✅ Success with Groq (compatibility + structuredOutputs: false)!');
    console.log(JSON.stringify(object, null, 2));
  } catch (err) {
    console.error('❌ Failed with Groq:', err.message);
  }
}

testGroq();
