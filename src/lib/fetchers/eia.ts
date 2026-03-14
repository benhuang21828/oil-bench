import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { FundamentalData } from '../types';

export async function fetchFundamentals(targetDateStr?: string): Promise<FundamentalData> {
  const eiaKey = process.env.EIA_API_KEY;
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
  const targetDateFmt = targetDate.toISOString().split('T')[0];
  
  // EIA API requires dates in YYYY-MM-DD
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - 14); // Look back 14 days to find the latest weekly report
  const startFmt = startDate.toISOString().split('T')[0];

  let eiaSummary = 'EIA Data: Unknown';
  let rigCountSummary = 'US Rig Count: Unknown';

  if (eiaKey) {
    try {
      const url = `https://api.eia.gov/v2/petroleum/stoc/wstk/data/?api_key=${eiaKey}&frequency=weekly&data[0]=value&facets[series][]=WCESTUS1&start=${startFmt}&end=${targetDateFmt}`;
      const res = await axios.get(url);
      const records = res.data?.response?.data || [];
      
      // Sort descending by period (latest first)
      records.sort((a: any, b: any) => new Date(b.period).getTime() - new Date(a.period).getTime());
      
      if (records.length > 0) {
        const latest = records[0];
        eiaSummary = `U.S. Ending Stocks of Crude Oil: ${latest.value} Thousand Barrels (as of ${latest.period})`;
      } else {
        eiaSummary = 'No EIA data found for this period.';
      }
    } catch (e) {
      console.error('Error fetching EIA data:', e);
      eiaSummary = 'Error fetching EIA Data';
    }
  } else {
    eiaSummary = 'EIA_API_KEY missing - using placeholder data. Expected draw of 1.2M barrels.';
  }

  rigCountSummary = 'Baker Hughes Rig Count: 479 Active Rigs (Mock implementation active)';

  const payload: FundamentalData = {
    date: targetDate.toISOString(),
    eiaSummary,
    rigCountSummary
  };

  const dirPath = path.join(process.cwd(), 'data', 'raw', 'fundamentals');
  await fs.mkdir(dirPath, { recursive: true });
  const filePath = path.join(dirPath, `${targetDateFmt}.json`);
  
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
  return payload;
}
