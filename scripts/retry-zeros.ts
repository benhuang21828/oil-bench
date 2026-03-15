import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { buildPromptForDate } from '../src/lib/inference/promptBuilder';
import { runInference } from '../src/lib/inference/openRouter';
import { DailyPredictionOutput } from '../src/lib/types';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const model = process.env.LLM_MODEL_NAME || "google/gemini-2.5-flash";
  const dirModelName = model.replace(/[^a-zA-Z0-9_-]/g, '_');
  const predictionsPath = path.join(process.cwd(), 'data', 'prediction', dirModelName, 'predictions.json');
  
  const data = await fs.readFile(predictionsPath, 'utf8');
  const predictions: DailyPredictionOutput[] = JSON.parse(data);

  const datesToRetry = predictions
    .filter(p => !p.prediction.predict_target_price || p.prediction.predict_target_price === 0)
    .map(p => p.targetDate);

  console.log(`Found ${datesToRetry.length} dates with 0 predictions:`, datesToRetry);

  for (const dateFmt of datesToRetry) {
    console.log(`\n============================`);
    console.log(`Retrying Inference for: ${dateFmt}`);
    console.log(`============================`);
    
    try {
      const prompt = await buildPromptForDate(dateFmt);
      // Wait for inference
      const prediction = await runInference(prompt, dateFmt);
      
      console.log(`[SUCCESS] Prediction target price $${prediction.predict_target_price} saved for ${dateFmt}`);
      
      // Respect OpenRouter rate limits
      await delay(2000);
    } catch (e: any) {
      console.error(`[ERROR] Failed inference for ${dateFmt}: ${e.message}`);
    }
  }
}

run().catch(console.error);
