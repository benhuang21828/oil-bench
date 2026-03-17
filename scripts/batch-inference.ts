import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { buildPromptForDate } from '../src/lib/inference/promptBuilder';
import { DailyPredictionOutput } from '../src/lib/types';

const CONCURRENCY = 15;
const MAX_RETRIES = 3;

async function run() {
  const model = process.env.LLM_MODEL_NAME || "google/gemini-2.5-flash";
  const dirModelName = model.replace(/[^a-zA-Z0-9_-]/g, '_');
  const predictionsPath = path.join(process.cwd(), 'data', 'prediction', dirModelName, 'predictions.json');
  const pricesDir = path.join(process.cwd(), 'data', 'raw', 'prices');
  
  // Create dir
  await fs.mkdir(path.dirname(predictionsPath), { recursive: true });

  let existingDates = new Set<string>();
  let existingPredictions: DailyPredictionOutput[] = [];
  try {
     const data = await fs.readFile(predictionsPath, 'utf8');
     existingPredictions = JSON.parse(data);
     for (const p of existingPredictions) {
         if (p.prediction && p.prediction.predict_target_price > 0) {
             existingDates.add(p.targetDate);
         }
     }
  } catch(e) {}

  let files: string[] = [];
  try {
    files = await fs.readdir(pricesDir);
  } catch (e) {
    console.error('No price data found');
    return;
  }

  const dates = files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .filter(d => !existingDates.has(d));

  console.log(`Found ${dates.length} historical dates to process concurrently for ${model}.`);

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
  let results: DailyPredictionOutput[] = [];
  for (let i = 0; i < dates.length; i += CONCURRENCY) {
    const chunk = dates.slice(i, i + CONCURRENCY);
    console.log(`Processing batch ${i/CONCURRENCY + 1} of ${Math.ceil(dates.length/CONCURRENCY)}`);
    const chunkResults = await Promise.all(chunk.map(d => processDate(d)));
    results.push(...chunkResults.filter(Boolean) as DailyPredictionOutput[]);
  }

  // Merge and save
  for (const newPred of results) {
    const existingIndex = existingPredictions.findIndex(p => p.targetDate === newPred.targetDate);
    if (existingIndex > -1) {
      existingPredictions[existingIndex] = newPred;
    } else {
      existingPredictions.push(newPred);
    }
  }

  existingPredictions.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  await fs.writeFile(predictionsPath, JSON.stringify(existingPredictions, null, 2));
  console.log("Saved all predictions.");
}

run().catch(console.error);
