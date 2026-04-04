import 'dotenv/config';
import fs from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import axios from 'axios';
import { buildPromptForDate } from '../src/lib/inference/promptBuilder';
import { DailyPredictionOutput } from '../src/lib/types';
import { evaluatePredictions } from '../src/lib/evaluation/evaluator';

const MAX_RETRIES = 3;
const apiKey = process.env.OPENROUTER_KEY;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const baseDir = path.join(process.cwd(), 'data', 'prediction');
  const metadataPath = path.join(process.cwd(), 'data', 'models-metadata.json');
  
  let validModels: string[] = [];
  try {
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      validModels = Object.keys(metadata);
  } catch (e) {
      console.error("Could not read models-metadata.json");
      return;
  }

  let patchedCount = 0;
  let modelsToReEvaluate = new Set<string>();

  for (const originalModelName of validModels) {
    const dirModelName = originalModelName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const runsDir = path.join(baseDir, dirModelName, 'runs');
    
    if (!existsSync(runsDir)) continue;
    
    const runFiles = await fs.readdir(runsDir);
    
    for (const runFile of runFiles) {
      if (!runFile.endsWith('.json')) continue;
      
      const filePath = path.join(runsDir, runFile);
      const content = JSON.parse(await fs.readFile(filePath, 'utf8'));
      const runIdx = parseInt(runFile.replace('run_', '').replace('.json', ''), 10);
      
      let fileNeedsSaving = false;

      // Find any failed dates in this specific run
      for (let i = 0; i < content.length; i++) {
        const record = content[i];
        
        if (record.prediction && record.prediction.parse_status === 'failed') {
          const dateFmt = record.targetDate;
          console.log(`\n============================`);
          console.log(`Patching ${originalModelName} -> ${runFile} -> Date: ${dateFmt}`);
          console.log(`============================`);
          
          let attempt = 0;
          let success = false;
          
          while (attempt < MAX_RETRIES && !success) {
            try {
              const prompt = await buildPromptForDate(dateFmt);
              const baseTemperature = parseFloat(process.env.LLM_TEMPERATURE || "0");
              const baseSeed = parseInt(process.env.LLM_SEED || "42", 10);
              
              const payload: any = {
                model: originalModelName, // Need exact model like 'minimax/minimax-m2.5'
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: "json_object" },
                temperature: Math.max(baseTemperature, 0.5), // ensure some variation
                top_p: 0.95,
                seed: baseSeed + runIdx
              };

              const controller = new AbortController();
              const timeoutId = setTimeout(() => {
                console.log(`[HANG DETECTED] Force-killing socket after 120s...`);
                controller.abort();
              }, 120000);

              let response: any;
              try {
                response = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, {
                  headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                  signal: controller.signal,
                  timeout: 120000 // Keep axios timeout as fallback
                });
              } finally {
                clearTimeout(timeoutId);
              }

              const completion = response.data?.choices?.[0]?.message?.content;
              
              if (!completion) {
                 console.log("[DEBUG] OpenRouter Response Body: ", JSON.stringify(response.data, null, 2));
                 throw new Error("Empty response or provider error.");
              }

              let parsed: any;
              try {
                parsed = JSON.parse(completion);
              } catch(e) {
                const firstBrace = completion.indexOf('{');
                const lastBrace = completion.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    parsed = JSON.parse(completion.substring(firstBrace, lastBrace + 1));
                } else throw new Error(`Failed to find JSON block.`);
              }

              const predict_target_price = parsed?.predict_target_price;
              const isSuccess = typeof predict_target_price === 'number' && predict_target_price > 0;

              if (isSuccess) {
                 // MUTATE the Array in memory
                 content[i].prediction = {
                   date: new Date(dateFmt).toISOString(),
                   model: originalModelName,
                   predict_target_price: predict_target_price,
                   portfolio_allocation: typeof parsed?.portfolio_allocation === 'number' ? parsed.portfolio_allocation : 50,
                   reasoning: parsed?.reasoning || "Failed to parse reasoning.",
                   parse_status: "success"
                 };
                 
                 console.log(`[SUCCESS] Patched $${predict_target_price} (Attempt ${attempt + 1})`);
                 success = true;
                 fileNeedsSaving = true;
                 patchedCount++;
                 modelsToReEvaluate.add(originalModelName);
              } else {
                 throw new Error("JSON parsed but value was invalid.");
              }
            } catch (e: any) {
              attempt++;
              if (axios.isCancel(e)) {
                  console.error(`[WARN] Attempt ${attempt} failed: Request hung and was force-aborted.`);
              } else if (e.response) {
                  console.error(`[WARN] Attempt ${attempt} failed with Status ${e.response.status}:`);
                  console.error(JSON.stringify(e.response.data, null, 2));
              } else {
                  console.error(`[WARN] Attempt ${attempt} failed: ${e.message}`);
              }
              await delay(2000);
            }
          }
          if (!success) console.error(`[ERROR] Completely failed to patch ${dateFmt} after ${MAX_RETRIES} attempts.`);
        }
      }
      
      // Save file back to disk if we patched anything
      if (fileNeedsSaving) {
        await fs.writeFile(filePath, JSON.stringify(content, null, 2));
        console.log(`Saved patched file: ${runFile}`);
      }
    }
  }

  console.log(`\n============================`);
  console.log(`Finished patching ${patchedCount} records.`);
  
  if (patchedCount > 0) {
    console.log(`Running Evaluator updates on modified models...`);
    for (const model of modelsToReEvaluate) {
        console.log(`Re-scoring ${model}...`);
        await evaluatePredictions(model);
    }
    console.log(`Leaderboards fully updated!`);
  }
}

run().catch(console.error);
