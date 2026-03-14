export interface PriceData {
  symbol: string;
  price: number;
  previousClose: number;
  percentChange: number;
}

export interface DailyMarketData {
  date: string;
  cl: PriceData;
  dxy: PriceData;
}

export interface NewsArticle {
  title: string;
  link: string;
  snippet: string;
  date: string;
  source: string;
  imageUrl?: string;
}

export interface DailyNewsData {
  date: string;
  query: string;
  news: NewsArticle[];
}

export interface FundamentalData {
  date: string;
  eiaSummary: string;
  rigCountSummary: string;
}

export interface PredictionResult {
  date: string;
  model: string;
  predict_target_price: number;
  reasoning: string;
}

export interface DailyPredictionOutput {
  targetDate: string;
  actual_close?: number;
  delta?: number;
  prediction: PredictionResult;
}
