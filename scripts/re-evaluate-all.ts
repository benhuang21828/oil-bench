import fs from 'fs/promises';
import path from 'path';
import { evaluatePredictions } from '../src/lib/evaluation/evaluator';

async function run() {
  const predictionsDir = path.join(process.cwd(), 'data', 'prediction');
  const dEntries = await fs.readdir(predictionsDir, { withFileTypes: true });
  const models = dEntries.filter(e => e.isDirectory()).map(e => e.name);

  // Clear old metrics summary
  const summaryPath = path.join(process.cwd(), 'data', 'benchmarks', 'metrics_summary.json');
  try {
    await fs.unlink(summaryPath);
  } catch(e) {}

  for (const model of models) {
    const originalName = model.replace('_', '/'); // rough un-mangle for evaluatePredictions which takes the raw model name
    // actually evaluatePredictions expects the model name format used in models-metadata or exactly what you pass
    // we can read one prediction file to get the exact model name, or just use the folder and let evaluator re-mangle it
    console.log(`Evaluating: ${originalName}`);
    try {
       await evaluatePredictions(originalName);
       console.log(`[SUCCESS] ${originalName}`);
    } catch(e: any) {
       console.error(`[ERROR] ${originalName}: ${e.message}`);
    }
  }
}

run().catch(console.error);
