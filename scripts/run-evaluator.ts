import 'dotenv/config';
import { evaluatePredictions } from '../src/lib/evaluation/evaluator';

async function run() {
  const model = process.env.LLM_MODEL_NAME || "google/gemini-2.5-flash";
  console.log(`\n============================`);
  console.log(`Evaluating predictions for model: ${model}`);
  console.log(`============================`);
  
  try {
    const metrics = await evaluatePredictions(model);
    console.log('\n[SUCCESS] Evaluation Complete!');
    console.log(JSON.stringify(metrics, null, 2));
  } catch (e: any) {
    console.error(`[ERROR] Failed to evaluate: ${e.message}`);
  }
}

run().catch(console.error);
