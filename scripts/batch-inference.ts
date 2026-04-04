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
  const metadataPath = path.join(process.cwd(), 'data', 'models-metadata.json');
  
  // 1. Argument parsing
  const args = process.argv.slice(2);
  const runsArg = args.find(a => a.startsWith('--runs='));
  const numRuns = runsArg ? parseInt(runsArg.split('=')[1], 10) : 1;
  
  // 2. Load model metadata
  let metadata: Record<string, any> = {};
  try {
    metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
  } catch (e) {
    console.warn("Could not read models-metadata.json, defaulting cutoffs to null.");
  }
  const cutoffDate = metadata[model]?.trainingCutoff || "1970-01-01";

  // 3. Load prices to determine dates
  let files: string[] = [];
  try {
    files = await fs.readdir(pricesDir);
  } catch (e) {
    console.error(`Could not read ${pricesDir}`);
    return;
  }

  const allDates = files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .filter(d => d >= cutoffDate) // apply model cutoff filtering
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const dirModelName = model.replace(/[^a-zA-Z0-9_-]/g, '_');
  const apiKey = process.env.OPENROUTER_KEY;
  const baseTemperature = parseFloat(process.env.LLM_TEMPERATURE || "0");
  const baseSeed = parseInt(process.env.LLM_SEED || "42", 10);

  // We loop exactly numRuns times
  for (let runIdx = 1; runIdx <= numRuns; runIdx++) {
    console.log(`\n=== Starting Run ${runIdx} / ${numRuns} for model ${model} ===`);

    const isMultiRun = numRuns > 1;
    let predictionsPath = path.join(process.cwd(), 'data', 'prediction', dirModelName, 'predictions.json');
    if (isMultiRun || runsArg) {
      const runsDir = path.join(process.cwd(), 'data', 'prediction', dirModelName, 'runs');
      await fs.mkdir(runsDir, { recursive: true });
      predictionsPath = path.join(runsDir, `run_${runIdx.toString().padStart(2, '0')}.json`);
    }

    let existingDates = new Set<string>();
    try {
      const data = await fs.readFile(predictionsPath, 'utf8');
      const parsed = JSON.parse(data);
      for (const p of parsed) {
        if (p.prediction && p.prediction.parse_status === "success") {
          existingDates.add(p.targetDate);
        }
      }
    } catch(e) {}

    const datesToProcess = allDates.filter(d => !existingDates.has(d));
    if (datesToProcess.length === 0) {
      console.log(`No new dates to process for Run ${runIdx}.`);
      continue;
    }

    console.log(`Found ${datesToProcess.length} historical dates to process concurrently for ${model} (Run ${runIdx}).`);

    async function processDate(dateFmt: string) {
      let attempt = 0;
      while (attempt < MAX_RETRIES) {
        try {
          const prompt = await buildPromptForDate(dateFmt);
          
          // Seed adjustment for multi-run so each run is slightly different
          const currentSeed = baseSeed + runIdx;

          const payload: any = {
            model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: "json_object" },
            temperature: isMultiRun ? Math.max(baseTemperature, 0.5) : baseTemperature, // Increase variation across runs
            top_p: 0.95, // Prevent absurd long tail hallucinations during variance testing
            seed: currentSeed
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

          const predict_target_price = parsed?.predict_target_price;
          const isSuccess = typeof predict_target_price === 'number' && predict_target_price > 0;

          const output: DailyPredictionOutput = {
            targetDate: dateFmt,
            prediction: {
              date: new Date(dateFmt).toISOString(),
              model,
              predict_target_price: isSuccess ? predict_target_price : 0,
              portfolio_allocation: typeof parsed?.portfolio_allocation === 'number' ? parsed.portfolio_allocation : 50,
              reasoning: parsed?.reasoning || "Failed to parse reasoning.",
              parse_status: isSuccess ? "success" : "failed"
            }
          };
          
          console.log(`[SUCCESS] ${dateFmt} -> $${output.prediction.predict_target_price} (Attempt ${attempt + 1}) [Run ${runIdx}]`);
          return output;
        } catch (e: any) {
          attempt++;
          console.error(`[WARN] ${dateFmt} attempt ${attempt} failed: ${e.message}`);
          if (attempt >= MAX_RETRIES) {
            console.error(`[ERROR] ${dateFmt} completely failed after ${MAX_RETRIES} attempts.`);
            // Return failure object instead of null to record parse_status='failed'
            const output: DailyPredictionOutput = {
               targetDate: dateFmt,
               prediction: {
                 date: new Date(dateFmt).toISOString(),
                 model,
                 predict_target_price: 0,
                 portfolio_allocation: 50,
                 reasoning: e.message || "Completely failed.",
                 parse_status: "failed"
               }
            };
            return output;
          }
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      return null;
    }

    const chunks = [];
    for (let i = 0; i < datesToProcess.length; i += CONCURRENCY) {
      chunks.push(datesToProcess.slice(i, i + CONCURRENCY));
    }

    const results: DailyPredictionOutput[] = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Processing batch ${i + 1} of ${chunks.length}`);
      const chunkDates = chunks[i];
      const chunkResults = await Promise.all(chunkDates.map(date => processDate(date)));

      for (const res of chunkResults) {
        if (res) results.push(res);
      }
    }

    const dirPath = path.dirname(predictionsPath);
    await fs.mkdir(dirPath, { recursive: true });

    let allPredictions: DailyPredictionOutput[] = [];
    try {
      const existingData = await fs.readFile(predictionsPath, 'utf8');
      allPredictions = JSON.parse(existingData);
    } catch(e) {}

    allPredictions = allPredictions.filter(p => !results.find(r => r.targetDate === p.targetDate));
    allPredictions.push(...results);
    allPredictions.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

    await fs.writeFile(predictionsPath, JSON.stringify(allPredictions, null, 2));
    console.log(`Successfully batch-saved ${results.length} predictions for ${model}! (Run ${runIdx})`);
  }
}

run().catch(console.error);
