// @ts-check
const path = require('path');

// Next.js configures environment variables via dotenv. Since we are running
// this file outside of Next.js, we manually load .env.local into process.env.
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Destructure our runner function using dynamic imports because our project
// is configured as ES modules, and Node.js requires imports to resolve properly.
async function main() {
  const { runParallelModels } = await import('../src/lib/orchestration/parallelRunner.js');

  const testPrompt = "Write a one-sentence definition of open-source software.";
  const testModels = [
    'gemini-3.5-flash',
    'groq-llama-3-3-70b',
    'open-mistral-nemo',
  ];

  console.log(`Prompt: "${testPrompt}"`);
  console.log(`Running concurrently on: ${testModels.join(', ')}...\n`);

  try {
    const startTime = Date.now();
    const results = await runParallelModels(testPrompt, testModels);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Success! All models finished in ${duration} seconds:\n`);
    
    results.forEach((res, i) => {
      console.log(`[${i + 1}] Model: ${res.modelId} (took ${res.duration}s)`);
      console.log(`Response: ${res.response}`);
      console.log('-'.repeat(50));
    });

  } catch (error) {
    console.error('\n❌ Pipeline execution failed:');
    console.error(error.message);
  }
}

main();
