// @ts-check
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const { runSelfConsistencyOrchestrator } = await import('../src/lib/orchestration/pipeline.js');

  const testPrompt = "Should a new startup build their backend with NestJS or Next.js API Routes? Compare them and make a recommendation.";
  const testModels = [
    'gemini-3.1-flash-lite',
    'groq-llama-3-3-70b',
    'open-mistral-nemo'
  ];
  const evaluatorId = 'groq-llama-3-3-70b';

  console.log(`🚀 Starting End-to-End Orchestrator Pipeline`);
  console.log(`Prompt: "${testPrompt}"\n`);

  try {
    const totalStart = Date.now();
    const result = await runSelfConsistencyOrchestrator(testPrompt, testModels, evaluatorId);
    const totalDuration = ((Date.now() - totalStart) / 1000).toFixed(2);

    console.log(`\n🎉 End-to-End Pipeline Completed Successfully in ${totalDuration}s!`);
    
    console.log("\n==================================================");
    console.log("INTERMEDIATE MODEL RESPONSES:\n");
    result.responses.forEach((res, i) => {
      console.log(`[${i + 1}] Model: ${res.modelId} (took ${res.duration}s)`);
      console.log(`Response: ${res.response.substring(0, 150)}...`);
      console.log('-'.repeat(40));
    });

    console.log("\n==================================================");
    console.log("FINAL SYNTHESIZED ANSWER:\n");
    console.log(result.evaluation.finalAnswer);
    console.log("\n==================================================");
    console.log("EVALUATOR REASONING:\n");
    console.log(result.evaluation.reasoning);
    console.log("\n==================================================");
    console.log("CONTRIBUTIONS & CONFIDENCE:\n");
    console.log(`Confidence: ${result.evaluation.confidence.toUpperCase()}`);
    console.log(JSON.stringify(result.evaluation.contributions, null, 2));

  } catch (error) {
    console.error('\n❌ Pipeline execution failed:');
    console.error(error.message);
  }
}

main();
