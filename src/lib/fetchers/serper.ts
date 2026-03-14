import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { DailyNewsData, NewsArticle } from '../types';

export async function fetchNews(targetDateStr?: string): Promise<DailyNewsData> {
  const apiKey = process.env.SERPER_KEY;
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
  const targetDateFmt = targetDate.toISOString().split('T')[0];

  if (!apiKey) {
    console.warn('SERPER_KEY is not defined. Returning empty news.');
    return { date: targetDate.toISOString(), query: '', news: [] };
  }

  const query = 'OPEC OR "Middle East" oil OR "China economy" oil demand';
  
  // Format MM/DD/YYYY
  const parts = targetDateFmt.split('-');
  const mm = parts[1];
  const dd = parts[2];
  const yyyy = parts[0];
  const tbsDate = `${mm}/${dd}/${yyyy}`;
  const tbs = `cdr:1,cd_min:${tbsDate},cd_max:${tbsDate}`;

  try {
    const response = await axios.post(
      'https://google.serper.dev/news',
      { q: query, num: 5, tbs },
      { headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' } }
    );

    const articles: NewsArticle[] = response.data.news?.map((n: any) => ({
      title: n.title,
      link: n.link,
      snippet: n.snippet,
      date: n.date,
      source: n.source,
      imageUrl: n.imageUrl
    })) || [];

    const payload: DailyNewsData = {
      date: targetDate.toISOString(),
      query,
      news: articles
    };

    const dirPath = path.join(process.cwd(), 'data', 'raw', 'news');
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, `${targetDateFmt}.json`);
    
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
    return payload;
  } catch (error) {
    console.error(`Error fetching Serper news for ${targetDateFmt}:`, error);
    throw error;
  }
}
