// @ts-check
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const { runSelfConsistencyOrchestrator } = await import('../src/lib/orchestration/pipeline.js');

  // Let's use a real prompt that benefits from multiple opinions
  const testPrompt = "Should a new startup build their backend with NestJS or Next.js API Routes? Compare them and make a recommendation.";

  const testModels = [
    'gemini-3.1-flash-lite',
    'groq-llama-3-3-70b',
    'open-mistral-nemo'
  ];

  // We can use groq-llama-3-3-70b as the evaluator (testing our custom fallback wrapper!)
  const evaluatorId = 'groq-llama-3-3-70b';

  console.log(`🚀 Starting End-to-End Orchestrator Pipeline`);
  console.log(`Prompt: "${testPrompt}"\n`);

  try {
    const totalStart = Date.now();
    const finalResult = await runSelfConsistencyOrchestrator(testPrompt, testModels, evaluatorId);
    const totalDuration = ((Date.now() - totalStart) / 1000).toFixed(2);

    console.log(`\n🎉 End-to-End Pipeline Completed Successfully in ${totalDuration}s!`);
    console.log("==================================================");
    console.log("FINAL SYNTHESIZED ANSWER:\n");
    console.log(finalResult.finalAnswer);
    console.log("\n==================================================");
    console.log("EVALUATOR REASONING:\n");
    console.log(finalResult.reasoning);
    console.log("\n==================================================");
    console.log("CONTRIBUTIONS & CONFIDENCE:\n");
    console.log(`Confidence: ${finalResult.confidence.toUpperCase()}`);
    console.log(JSON.stringify(finalResult.contributions, null, 2));

  } catch (error) {
    console.error('\n❌ Pipeline execution failed:');
    console.error(error.message);
  }
}

main();
