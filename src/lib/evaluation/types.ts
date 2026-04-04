export interface MetricStatistics {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
}

export interface MetricsSummary {
  model: string;
  totalPredictions: number;
  mae: number;
  rmse: number;
  averageDeltaVal: number;
  simulatedPnL: number;
  parseFailures: number;
  skippedGaps: number;
  // Multi-run fields (populated when runs/ directory exists)
  runsCount?: number;
  averageDailyTargetSpread?: number;
  aggregateMetrics?: {
    mae: MetricStatistics;
    rmse: MetricStatistics;
    simulatedPnL: MetricStatistics;
  };
  perRunMetrics?: MetricsSummary[];
}
