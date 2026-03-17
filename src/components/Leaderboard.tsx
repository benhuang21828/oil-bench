import fs from 'fs/promises';
import path from 'path';
import { MetricsSummary } from '@/lib/evaluation/types';
import LeaderboardClient from './LeaderboardClient';

export default async function Leaderboard() {
  const summaryPath = path.join(process.cwd(), 'data', 'benchmarks', 'metrics_summary.json');
  
  let metrics: MetricsSummary[] = [];
  try {
    const data = await fs.readFile(summaryPath, 'utf8');
    metrics = JSON.parse(data);
  } catch (e) {
    // If no evaluation has happened yet
    metrics = [];
  }

  return <LeaderboardClient metrics={metrics} />;
}
