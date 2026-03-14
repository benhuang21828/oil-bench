import fs from 'fs/promises';
import path from 'path';
import { DailyPredictionOutput } from '../types';
import { MetricsSummary } from './types';

export async function evaluatePredictions(modelName: string): Promise<MetricsSummary> {
  const dirModelName = modelName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const predictionsPath = path.join(process.cwd(), 'data', 'prediction', dirModelName, 'predictions.json');
  const pricesDir = path.join(process.cwd(), 'data', 'raw', 'prices');

  let predictions: DailyPredictionOutput[] = [];
  try {
    const data = await fs.readFile(predictionsPath, 'utf-8');
    predictions = JSON.parse(data);
  } catch (e) {
    throw new Error(`Could not read predictions for model: ${modelName}`);
  }

  // Read all available price files to understand the timeline
  let priceFiles: string[] = [];
  try {
    priceFiles = await fs.readdir(pricesDir);
  } catch (e) {
    throw new Error('Could not read raw prices directory');
  }

  const sortedDates = priceFiles
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  let totalPredictions = 0;
  let sumAbsoluteError = 0;
  let sumSquaredError = 0;
  let sumDelta = 0; // track raw delta just to see overall bias

  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i];
    const targetDateFmt = pred.targetDate; // Day N
    
    // Find Day N+1
    const currentIndex = sortedDates.indexOf(targetDateFmt);
    if (currentIndex === -1 || currentIndex >= sortedDates.length - 1) {
      // We don't have the "tomorrow" ground truth yet
      continue;
    }

    const nextDateFmt = sortedDates[currentIndex + 1];
    
    // Read the N+1 price file to get the actual settle
    const nextPricePath = path.join(pricesDir, `${nextDateFmt}.json`);
    const nextPriceData = JSON.parse(await fs.readFile(nextPricePath, 'utf-8'));
    
    const actualClose = nextPriceData.cl.price;
    const predictedTarget = pred.prediction.predict_target_price;

    // Delta = Predicted - Actual
    const delta = predictedTarget - actualClose;
    const absoluteError = Math.abs(delta);
    
    // Mutate the object to include the graded truth
    pred.actual_close = actualClose;
    pred.delta = delta;

    sumAbsoluteError += absoluteError;
    sumSquaredError += (absoluteError * absoluteError);
    sumDelta += delta;
    totalPredictions++;
  }

  // Overwrite predictions with graded data
  await fs.writeFile(predictionsPath, JSON.stringify(predictions, null, 2));

  if (totalPredictions === 0) {
    throw new Error('No valid consecutive days found to evaluate against.');
  }

  const mae = sumAbsoluteError / totalPredictions;
  const rmse = Math.sqrt(sumSquaredError / totalPredictions);
  const averageDeltaVal = sumDelta / totalPredictions;

  const metrics: MetricsSummary = {
    model: modelName,
    totalPredictions,
    mae,
    rmse,
    averageDeltaVal
  };

  // Save metrics summary globally
  const metricsDir = path.join(process.cwd(), 'data', 'benchmarks');
  await fs.mkdir(metricsDir, { recursive: true });
  const summaryPath = path.join(metricsDir, 'metrics_summary.json');
  
  let existingSummaries: MetricsSummary[] = [];
  try {
    const currentSummaries = await fs.readFile(summaryPath, 'utf-8');
    existingSummaries = JSON.parse(currentSummaries);
  } catch (e) {
    // Doesn't exist yet
  }

  const existingIdx = existingSummaries.findIndex(m => m.model === modelName);
  if (existingIdx > -1) {
    existingSummaries[existingIdx] = metrics;
  } else {
    existingSummaries.push(metrics);
  }

  await fs.writeFile(summaryPath, JSON.stringify(existingSummaries, null, 2));

  return metrics;
}
