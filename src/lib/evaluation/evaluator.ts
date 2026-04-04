import fs from 'fs/promises';
import path from 'path';
import { DailyPredictionOutput } from '../types';
import { MetricsSummary, MetricStatistics } from './types';

function computeStats(values: number[]): MetricStatistics {
  if (values.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return {
    mean: Number(mean.toFixed(4)),
    stdDev: Number(Math.sqrt(variance).toFixed(4)),
    min: Number(Math.min(...values).toFixed(4)),
    max: Number(Math.max(...values).toFixed(4))
  };
}

export async function evaluatePredictions(modelName: string): Promise<MetricsSummary> {
  const dirModelName = modelName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const basePredictionDir = path.join(process.cwd(), 'data', 'prediction', dirModelName);
  const pricesDir = path.join(process.cwd(), 'data', 'raw', 'prices');

  // Read all available price files
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

  // Function to evaluate single file
  async function evaluateSingleFile(filePath: string): Promise<MetricsSummary> {
    const data = await fs.readFile(filePath, 'utf-8');
    const predictions: DailyPredictionOutput[] = JSON.parse(data);
    
    let totalPredictions = 0;
    let sumAbsoluteError = 0;
    let sumSquaredError = 0;
    let sumDelta = 0;
    let parseFailures = 0;
    let skippedGaps = 0;
    
    let simulatedPnL = 10000;

    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i];
      
      if (pred.prediction.parse_status === 'failed') {
        parseFailures++;
        continue;
      }
      
      const targetDateFmt = pred.targetDate; // Day N
      const currentIndex = sortedDates.indexOf(targetDateFmt);
      if (currentIndex === -1 || currentIndex >= sortedDates.length - 1) {
        continue;
      }

      const nextDateFmt = sortedDates[currentIndex + 1];
      
      // Gap calculation
      const gapDays = (new Date(nextDateFmt).getTime() - new Date(targetDateFmt).getTime()) / (1000 * 60 * 60 * 24);
      if (gapDays > 4) {
        skippedGaps++;
        continue;
      }

      const nextPricePath = path.join(pricesDir, `${nextDateFmt}.json`);
      const currPricePath = path.join(pricesDir, `${targetDateFmt}.json`);
      
      const nextPriceData = JSON.parse(await fs.readFile(nextPricePath, 'utf-8'));
      const currPriceData = JSON.parse(await fs.readFile(currPricePath, 'utf-8'));

      const currClose = currPriceData.cl.price;
      const actualClose = nextPriceData.cl.price;
      const predictedTarget = pred.prediction.predict_target_price;

      const delta = predictedTarget - actualClose;
      const absoluteError = Math.abs(delta);
      
      pred.actual_close = actualClose;
      pred.delta = delta;
      
      const allocPercent = pred.prediction.portfolio_allocation ?? 50;
      const oilPortion = simulatedPnL * (allocPercent / 100);
      const cashPortion = simulatedPnL - oilPortion;
      
      const trueAssetReturn = (actualClose - currClose) / currClose;
      const newOilPortion = oilPortion * (1 + trueAssetReturn);
      simulatedPnL = newOilPortion + cashPortion;

      sumAbsoluteError += absoluteError;
      sumSquaredError += (absoluteError * absoluteError);
      sumDelta += delta;
      totalPredictions++;
    }

    await fs.writeFile(filePath, JSON.stringify(predictions, null, 2));

    let mae = 0;
    let rmse = 0;
    let averageDeltaVal = 0;

    if (totalPredictions > 0) {
       mae = sumAbsoluteError / totalPredictions;
       rmse = Math.sqrt(sumSquaredError / totalPredictions);
       averageDeltaVal = sumDelta / totalPredictions;
    }

    return {
      model: modelName,
      totalPredictions,
      mae,
      rmse,
      averageDeltaVal,
      simulatedPnL: parseFloat(simulatedPnL.toFixed(2)),
      parseFailures,
      skippedGaps
    };
  }

  const runsDir = path.join(basePredictionDir, 'runs');
  let runFiles: string[] = [];
  try {
    const files = await fs.readdir(runsDir);
    runFiles = files.filter(f => f.endsWith('.json')).map(f => path.join(runsDir, f));
  } catch(e) {}

  let finalMetrics: MetricsSummary;

  if (runFiles.length > 0) {
    const allMetrics: MetricsSummary[] = [];
    
    // Group all run predictions to calculate daily target spread
    const dateTargets = new Map<string, number[]>();

    for (const runFile of runFiles) {
      allMetrics.push(await evaluateSingleFile(runFile));
      
      const runData = JSON.parse(await fs.readFile(runFile, 'utf8')) as DailyPredictionOutput[];
      for (const pred of runData) {
         if (pred.prediction.parse_status === 'failed') continue;
         if (!dateTargets.has(pred.targetDate)) dateTargets.set(pred.targetDate, []);
         dateTargets.get(pred.targetDate)!.push(pred.prediction.predict_target_price);
      }
    }
    
    let sumSpreads = 0;
    let daysWithMultipleRuns = 0;
    for (const targets of dateTargets.values()) {
       if (targets.length > 1) {
          const spread = Math.max(...targets) - Math.min(...targets);
          sumSpreads += spread;
          daysWithMultipleRuns++;
       }
    }
    const averageDailyTargetSpread = daysWithMultipleRuns > 0 ? (sumSpreads / daysWithMultipleRuns) : 0;
    
    // Aggregate over runs
    finalMetrics = {
      model: modelName,
      totalPredictions: Math.round(computeStats(allMetrics.map(m => m.totalPredictions)).mean),
      mae: computeStats(allMetrics.map(m => m.mae)).mean,
      rmse: computeStats(allMetrics.map(m => m.rmse)).mean,
      averageDeltaVal: computeStats(allMetrics.map(m => m.averageDeltaVal)).mean,
      simulatedPnL: computeStats(allMetrics.map(m => m.simulatedPnL)).mean,
      parseFailures: Math.round(computeStats(allMetrics.map(m => m.parseFailures)).mean),
      skippedGaps: Math.round(computeStats(allMetrics.map(m => m.skippedGaps)).mean),
      runsCount: runFiles.length,
      averageDailyTargetSpread: Number(averageDailyTargetSpread.toFixed(4)),
      aggregateMetrics: {
        mae: computeStats(allMetrics.map(m => m.mae)),
        rmse: computeStats(allMetrics.map(m => m.rmse)),
        simulatedPnL: computeStats(allMetrics.map(m => m.simulatedPnL))
      },
      perRunMetrics: allMetrics
    };
  } else {
    // Single file logic
    const singlePath = path.join(basePredictionDir, 'predictions.json');
    try {
      finalMetrics = await evaluateSingleFile(singlePath);
    } catch(e) {
      throw new Error(`No predictions found for model ${modelName} in ${singlePath}`);
    }
  }

  // Save metrics summary globally
  const metricsDir = path.join(process.cwd(), 'data', 'benchmarks');
  await fs.mkdir(metricsDir, { recursive: true });
  const summaryPath = path.join(metricsDir, 'metrics_summary.json');
  
  let existingSummaries: MetricsSummary[] = [];
  try {
    const currentSummaries = await fs.readFile(summaryPath, 'utf-8');
    existingSummaries = JSON.parse(currentSummaries);
  } catch (e) {}

  const existingIdx = existingSummaries.findIndex(m => m.model === modelName);
  if (existingIdx > -1) {
    existingSummaries[existingIdx] = finalMetrics;
  } else {
    existingSummaries.push(finalMetrics);
  }

  await fs.writeFile(summaryPath, JSON.stringify(existingSummaries, null, 2));

  return finalMetrics;
}
