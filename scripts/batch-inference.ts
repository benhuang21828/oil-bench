import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { buildPromptForDate } from '../src/lib/inference/promptBuilder';
import { DailyPredictionOutput } from '../src/lib/types';

const CONCURRENCY = 15;
const MAX_RETRIES = 3;

async function run() {
  const model = process.env.LLM_MODEL_NAME || "moonshotai/kimi-k2.5";
  const pricesDir = path.join(process.cwd(), 'data', 'raw', 'prices');
  let files: string[] = [];

  try {
    files = await fs.readdir(pricesDir);
  } catch (e) {
    console.error(`Could not read ${pricesDir}`);
    return;
  }

  // Find all available dates
  const allDates = files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // Load existing predictions to correctly resume
  const dirModelName = model.replace(/[^a-zA-Z0-9_-]/g, '_');
  const predictionsPath = path.join(process.cwd(), 'data', 'prediction', dirModelName, 'predictions.json');

  let existingDates = new Set<string>();
  try {
    const data = await fs.readFile(predictionsPath, 'utf8');
    const parsed = JSON.parse(data);
    for (const p of parsed) {
      if (p.prediction && p.prediction.predict_target_price > 0) {
        existingDates.add(p.targetDate);
      }
    }
  } catch(e) {}

  const datesToProcess = allDates.filter(d => !existingDates.has(d));

  if (datesToProcess.length === 0) {
    console.log("No new dates to process.");
    return;
  }

  console.log(`Found ${datesToProcess.length} historical dates to process concurrently for ${model}.`);

  const apiKey = process.env.OPENROUTER_KEY;

  async function processDate(dateFmt: string) {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
      try {
        const prompt = await buildPromptForDate(dateFmt);
        const payload = {
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: "json_object" }
        };

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, {
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          timeout: 120000 
        });

        const completion = response.data.choices?.[0]?.message?.content;
        if (!completion) throw new Error("Empty response");

        let parsed: any;
        try {
          parsed = JSON.parse(completion);
        } catch(e) {
          const firstBrace = completion.indexOf('{');
          const lastBrace = completion.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              const cleaned = completion.substring(firstBrace, lastBrace + 1);
              parsed = JSON.parse(cleaned);
          } else {
              throw new Error(`Failed to find JSON block.`);
          }
        }

        const output: DailyPredictionOutput = {
          targetDate: dateFmt,
          prediction: {
            date: new Date(dateFmt).toISOString(),
            model,
            predict_target_price: parsed.predict_target_price || 0,
            portfolio_allocation: typeof parsed.portfolio_allocation === 'number' ? parsed.portfolio_allocation : 50,
            reasoning: parsed.reasoning || "Failed to parse reasoning."
          }
        };
        
        console.log(`[SUCCESS] ${dateFmt} -> $${output.prediction.predict_target_price} (Attempt ${attempt + 1})`);
        return output;
      } catch (e: any) {
        attempt++;
        console.error(`[WARN] ${dateFmt} attempt ${attempt} failed: ${e.message}`);
        if (attempt >= MAX_RETRIES) {
          console.error(`[ERROR] ${dateFmt} completely failed after ${MAX_RETRIES} attempts.`);
          return null;
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    return null;
  }

  // Chunk processing
  const chunks = [];
  for (let i = 0; i < datesToProcess.length; i += CONCURRENCY) {
    chunks.push(datesToProcess.slice(i, i + CONCURRENCY));
  }

  const results: DailyPredictionOutput[] = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing batch ${i + 1} of ${chunks.length}`);
    const chunkDates = chunks[i];

    const promises = chunkDates.map(date => processDate(date));
    const chunkResults = await Promise.all(promises);

    for (const res of chunkResults) {
      if (res) results.push(res);
    }
  }

  // Append to existing file
  const dirPath = path.dirname(predictionsPath);
  await fs.mkdir(dirPath, { recursive: true });

  let allPredictions: DailyPredictionOutput[] = [];
  try {
    const existingData = await fs.readFile(predictionsPath, 'utf8');
    allPredictions = JSON.parse(existingData);
  } catch(e) {}

  allPredictions.push(...results);
  allPredictions.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

  await fs.writeFile(predictionsPath, JSON.stringify(allPredictions, null, 2));
  console.log(`\n============================`);
  console.log(`Successfully batch-saved ${results.length} predictions for ${model}!`);
  console.log(`============================`);
}

run().catch(console.error);
