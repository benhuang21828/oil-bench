import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { buildPromptForDate } from '../src/lib/inference/promptBuilder';
import { runInference } from '../src/lib/inference/openRouter';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const pricesDir = path.join(process.cwd(), 'data', 'raw', 'prices');
  let files: string[] = [];
  
  try {
    files = await fs.readdir(pricesDir);
  } catch (e) {
    console.error('No price data found to backfill inferences from.');
    return;
  }

  // Filter for JSON and sort chronological
  const dates = files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  console.log(`Found ${dates.length} historical dates to process for inference.`);

  for (const dateFmt of dates) {
    console.log(`\n============================`);
    console.log(`Running Inference for: ${dateFmt}`);
    console.log(`============================`);
    
    try {
      const prompt = await buildPromptForDate(dateFmt);
      // Wait for inference
      const prediction = await runInference(prompt, dateFmt);
      
      console.log(`[SUCCESS] Prediction target price $${prediction.predict_target_price} saved for ${dateFmt}`);
      
      // Respect OpenRouter rate limits (a few seconds between calls is polite for free or standard tiers)
      await delay(2000);
    } catch (e: any) {
      console.error(`[ERROR] Failed inference for ${dateFmt}: ${e.message}`);
    }
  }
}

run().catch(console.error);
