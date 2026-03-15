import fs from 'fs/promises';
import path from 'path';
import { DailyMarketData, DailyNewsData, FundamentalData } from '../types';

export async function buildPromptForDate(targetDateFmt: string): Promise<string> {
  // Read local JSON files
  const baseDir = path.join(process.cwd(), 'data', 'raw');
  
  const pricesPath = path.join(baseDir, 'prices', `${targetDateFmt}.json`);
  const newsPath = path.join(baseDir, 'news', `${targetDateFmt}.json`);
  const fundamentalsPath = path.join(baseDir, 'fundamentals', `${targetDateFmt}.json`);

  let prices: DailyMarketData;
  let newsData: DailyNewsData;
  let fundamentals: FundamentalData;

  try {
    const pricesFile = await fs.readFile(pricesPath, 'utf8');
    prices = JSON.parse(pricesFile);
  } catch (e) {
    throw new Error(`Missing price data for ${targetDateFmt}`);
  }

  try {
    const fundamentalsFile = await fs.readFile(fundamentalsPath, 'utf8');
    fundamentals = JSON.parse(fundamentalsFile);
  } catch (e) {
    throw new Error(`Missing fundamentals data for ${targetDateFmt}`);
  }

  try {
    const newsFile = await fs.readFile(newsPath, 'utf8');
    newsData = JSON.parse(newsFile);
  } catch (e) {
    throw new Error(`Missing news data for ${targetDateFmt}`);
  }

  // Format News
  const formattedNews = newsData.news.slice(0, 5).map((n, idx) => {
    return `${idx + 1}. "${n.title}" - "${n.snippet}"`;
  }).join('\n');

  // Format Percentages
  const clPctChange = prices.cl.percentChange.toFixed(2);
  const dxyPctChange = prices.dxy.percentChange.toFixed(2);
  const dxyTrend = prices.dxy.percentChange >= 0 ? "Up" : "Down";

  // Build the string
  const prompt = `System Prompt: You are an expert quantitative commodities analyst. Your task is to predict the official daily settlement price (the Close) of WTI Crude Oil (CL=F) for the upcoming trading session.

Market Context (Yesterday's Close):
* WTI Crude closed at: $${prices.cl.price.toFixed(2)} (${clPctChange}% from previous day)
* US Dollar Index (DXY) trend: ${dxyTrend} (${dxyPctChange}%)

Fundamental Data (Last 24h/Recent):
* EIA Report: ${fundamentals.eiaSummary}
* US Rig Count: ${fundamentals.rigCountSummary}

Geopolitical & Market News (via Serper):
${formattedNews.length > 0 ? formattedNews : "No significant news returned."}

Task: Based on this information, predict the EXACT DOLLAR VALUE of the official daily settlement price (the Close) on the NYMEX for WTI Crude today, given yesterday's settlement price of $${prices.cl.price.toFixed(2)}. Provide a 3-sentence reasoning in JSON format returning {"predict_target_price": number, "reasoning": "string"}.`;

  return prompt;
}
