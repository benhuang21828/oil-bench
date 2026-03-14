import 'dotenv/config';
import { fetchPrices } from '../src/lib/fetchers/yahooFinance';
import { fetchNews } from '../src/lib/fetchers/serper';
import { fetchFundamentals } from '../src/lib/fetchers/eia';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const startDate = new Date('2026-01-01T00:00:00Z');
  const endDate = new Date('2026-03-13T00:00:00Z');

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    // Skip weekends
    const day = d.getDay();
    if (day === 0 || day === 6) continue;

    const targetDateStr = d.toISOString().split('T')[0];
    console.log(`\n============================`);
    console.log(`Backfilling for: ${targetDateStr}`);
    console.log(`============================`);
    
    try {
      await Promise.all([
        fetchPrices(targetDateStr),
        fetchNews(targetDateStr),
        fetchFundamentals(targetDateStr)
      ]);
      console.log(`[SUCCESS] Data saved for ${targetDateStr}`);
    } catch (e: any) {
      console.error(`[ERROR] Failed to backfill ${targetDateStr}: ${e.message}`);
    }

    // Rate limiting pause
    await delay(1000);
  }
}

run().catch(console.error);
