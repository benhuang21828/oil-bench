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
  const prompt = `System Prompt: You are an expert quantitative commodities analyst and portfolio manager. Your task is to predict the official daily settlement price (the Close) of WTI Crude Oil (CL=F) for the upcoming trading session and decide how to allocate your $10,000 portfolio.

Market Context (Yesterday's Close):
* WTI Crude closed at: $${prices.cl.price.toFixed(2)} (${clPctChange}% from previous day)
* US Dollar Index (DXY) trend: ${dxyTrend} (${dxyPctChange}%)

Fundamental Data (Last 24h/Recent):
* EIA Report: ${fundamentals.eiaSummary}
* US Rig Count: ${fundamentals.rigCountSummary}

Geopolitical & Market News (via Serper):
${formattedNews.length > 0 ? formattedNews : "No significant news returned."}

Task: Based on this information:
1. Predict the EXACT DOLLAR VALUE of the official daily settlement price (the Close) on the NYMEX for WTI Crude today.
2. Decide your \`portfolio_allocation\` as an integer from 0 to 100. This represents what percentage of your $10,000 portfolio you want to allocate into Oil for the next day (0 = all cash, 100 = all oil, 50 = half oil / half cash).

IMPORTANT INSTRUCTION: YOU MUST OUTPUT ONLY VALID JSON. NO CONVERSATIONAL TEXT, NO MARKDOWN TAGS. ONLY RAW JSON.
Provide a 3-sentence reasoning in JSON format returning exactly: {"predict_target_price": number, "portfolio_allocation": number, "reasoning": "string"}`;

  return prompt;
}
