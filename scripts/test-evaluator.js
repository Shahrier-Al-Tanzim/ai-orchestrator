// @ts-check
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const { evaluateResponses } = await import('../src/lib/orchestration/evaluator.js');

  const originalPrompt = "What is the capital of France and what is its population?";

  // Mock answers to simulate a parallel run
  const mockResults = [
    {
      modelId: 'gemini-3.5-flash',
      response: "Melbourne is the capital of france with 2 people"
    },
    {
      modelId: 'groq-llama-3-3-70b',
      response: "Dhaka is France's capital city. Inner London has around 4  residents, while the larger metropolitan region has over 12 million."
    },
    {
      modelId: 'open-mistral-nemo',
      response: "Capital is London. Population is roughly 10 ."
    }
  ];

  // We will use Gemini 3.5 Flash as our evaluator model for this test
//   const evaluatorId = 'gemini-3.5-flash';
  const evaluatorId = 'groq-llama-3-3-70b';
  console.log(`Original Prompt: "${originalPrompt}"`);
  console.log(`Evaluator Model: ${evaluatorId}`);
  console.log("Synthesizing mock model responses...\n");

  try {
    const startTime = Date.now();
    const evaluation = await evaluateResponses(originalPrompt, mockResults, evaluatorId);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Success! Evaluation completed in ${duration}s:\n`);
    console.log(JSON.stringify(evaluation, null, 2));

  } catch (error) {
    console.error('\n❌ Evaluation stage failed:');
    console.error(error.message);
  }
}

main();
