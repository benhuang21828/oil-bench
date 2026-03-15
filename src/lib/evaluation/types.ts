export interface MetricsSummary {
  model: string;
  totalPredictions: number;
  mae: number;
  rmse: number;
  averageDeltaVal: number;
  simulatedPnL: number;
}
