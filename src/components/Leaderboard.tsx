import fs from 'fs/promises';
import path from 'path';
import { MetricsSummary } from '@/lib/evaluation/types';
import LeaderboardClient from './LeaderboardClient';

export default async function Leaderboard() {
  const summaryPath = path.join(process.cwd(), 'data', 'benchmarks', 'metrics_summary.json');
  const pricesDir = path.join(process.cwd(), 'data', 'raw', 'prices');
  
  let metrics: MetricsSummary[] = [];
  try {
    const data = await fs.readFile(summaryPath, 'utf8');
    metrics = JSON.parse(data);
  } catch (e) {
    // If no evaluation has happened yet
    metrics = [];
  }

  let baselinePnL = 10000;
  let startDate = "";
  let endDate = "";

  try {
    const priceFiles = await fs.readdir(pricesDir);
    const sortedDates = priceFiles
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    if (sortedDates.length >= 2) {
      startDate = sortedDates[0];
      endDate = sortedDates[sortedDates.length - 1];
      const firstData = JSON.parse(await fs.readFile(path.join(pricesDir, `${startDate}.json`), 'utf8'));
      const lastData = JSON.parse(await fs.readFile(path.join(pricesDir, `${endDate}.json`), 'utf8'));
      baselinePnL = 10000 * (lastData.cl.price / firstData.cl.price);
    }
  } catch (e) {}

  return <LeaderboardClient metrics={metrics} baselinePnL={baselinePnL} startDate={startDate} endDate={endDate} />;
}
