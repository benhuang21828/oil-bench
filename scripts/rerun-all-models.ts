import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

const METADATA_PATH = path.join(process.cwd(), 'data', 'models-metadata.json');
const PREDICTION_DIR = path.join(process.cwd(), 'data', 'prediction');
const BENCHMARKS_DIR = path.join(process.cwd(), 'data', 'benchmarks');

async function runCommand(command: string, args: string[], env: any) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      env: { ...process.env, ...env }
    });

    proc.on('close', (code) => {
      if (code === 0) resolve(true);
      else reject(new Error(`Command ${command} ${args.join(' ')} failed with code ${code}`));
    });
  });
}

async function run() {
  console.log("==========================================");
  console.log("Starting Full Re-run for All Models");
  console.log("==========================================");

  // 1. Explicit list of models to evaluate
  const models: string[] = [
    "anthropic/claude-opus-4.6",
    "anthropic/claude-sonnet-4.6",
    "google/gemini-2.5-flash",
    "google/gemini-3-flash-preview",
    "minimax/minimax-m2.5",
    "moonshotai/kimi-k2.5",
    "openai/gpt-5.4",
    "x-ai/grok-4.1-fast",
    "x-ai/grok-4.20-beta"
  ];

  console.log(`Found ${models.length} models to test:`);
  models.forEach(m => console.log(` - ${m}`));

  // 2. Clear old predictions & benchmarks to start fresh
  console.log("\n[Clean] Deleting old predictions & benchmarks...");
  try {
    await fs.rm(PREDICTION_DIR, { recursive: true, force: true });
    await fs.rm(BENCHMARKS_DIR, { recursive: true, force: true });
    console.log("Cleaned.");
  } catch (e) {
    console.warn("Could not clean directories, maybe they don't exist.");
  }

  // 3. Loop and run inference + evaluator
  for (const model of models) {
    console.log(`\n\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
    console.log(`Processing Model: ${model}`);
    console.log(`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n`);

    const env = { LLM_MODEL_NAME: model };

    try {
      console.log(`[1/2] Running Batch Inference (10 runs) for ${model}...`);
      await runCommand('npx', ['tsx', 'scripts/batch-inference.ts', '--runs=10'], env);

      console.log(`\n[2/2] Running Evaluator for ${model}...`);
      await runCommand('npx', ['tsx', 'scripts/run-evaluator.ts'], env);

      console.log(`\n[SUCCESS] Completed full workflow for ${model}`);
    } catch (e: any) {
      console.error(`\n[ERROR] Pipeline failed for ${model}: ${e.message}`);
      console.log("Continuing to next model...");
    }
  }

  console.log("\n==========================================");
  console.log("All Models Processed Successfully!");
  console.log("Check data/benchmarks/metrics_summary.json for the new leaderboard.");
  console.log("==========================================");
}

run().catch(console.error);
