import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { buildPromptForDate } from '../src/lib/inference/promptBuilder';
import { runInference } from '../src/lib/inference/openRouter';

async function run() {
  const dateFmt = '2026-02-28';
  console.log(`Running Inference for: ${dateFmt}`);
  try {
    const prompt = await buildPromptForDate(dateFmt);
    const prediction = await runInference(prompt, dateFmt);
    console.log(`[SUCCESS] Prediction target price $${prediction.predict_target_price} saved for ${dateFmt}`);
  } catch (e: any) {
    console.error(`[ERROR] Failed inference for ${dateFmt}: ${e.message}`);
  }
}

run().catch(console.error);
