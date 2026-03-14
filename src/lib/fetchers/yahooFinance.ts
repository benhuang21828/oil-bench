import YahooFinance from 'yahoo-finance2';
import fs from 'fs/promises';
import path from 'path';
import { DailyMarketData } from '../types';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

export async function fetchPrices(targetDateStr?: string): Promise<DailyMarketData> {
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
  const targetDateFmt = targetDate.toISOString().split('T')[0];

  // Fetch from 7 days ago to targetDate + 1 day to ensure we get the target date and previous close
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date(targetDate);
  endDate.setDate(endDate.getDate() + 2); // Chart API is exclusive on period2 typically

  async function getSymbolData(symbol: string) {
    const data = await yahooFinance.chart(symbol, {
      period1: startDate.toISOString().split('T')[0],
      period2: endDate.toISOString().split('T')[0],
    });
    
    // Sort quotes by date ascending
    const quotes = data.quotes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Find the latest quote <= targetDate
    let targetIndex = -1;
    for (let i = quotes.length - 1; i >= 0; i--) {
      const qDate = new Date(quotes[i].date).toISOString().split('T')[0];
      if (qDate <= targetDateFmt && quotes[i].close !== null) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === -1) {
      throw new Error(`No historical data found for ${symbol} on or before ${targetDateFmt}`);
    }

    const currentQuote = quotes[targetIndex];
    const prevQuote = targetIndex > 0 ? quotes[targetIndex - 1] : currentQuote;

    const price = currentQuote.close ?? 0;
    const previousClose = prevQuote.close ?? 0;
    const percentChange = previousClose !== 0 ? ((price - previousClose) / previousClose) * 100 : 0;

    return {
      symbol,
      price,
      previousClose,
      percentChange
    };
  }

  const clData = await getSymbolData('CL=F');
  const dxyData = await getSymbolData('DX-Y.NYB');

  const payload: DailyMarketData = {
    date: targetDate.toISOString(),
    cl: clData,
    dxy: dxyData
  };

  const dirPath = path.join(process.cwd(), 'data', 'raw', 'prices');
  await fs.mkdir(dirPath, { recursive: true });
  const filePath = path.join(dirPath, `${targetDateFmt}.json`);
  
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
  return payload;
}
