# OilBench: AI Crude Price Prediction Benchmark
**Live Dashboard Website:** [https://benhuang21828.github.io/oil-bench/](https://benhuang21828.github.io/oil-bench/)

OilBench is an automated framework to test and benchmark Large Language Models (LLMs) on their ability to predict crude oil prices based on quantitative macroeconomic data and qualitative geopolitical news. 

## Methodology
OilBench forces the LLM to act as a Commodities Analyst. For a given day `N`, it is fed the exact historical data available on that day (Prices, EIA Fundamentals, and Serper News). The LLM then allocates an algorithmic $10,000 portfolio towards Oil for Day `N+1`. The Leaderboard tracks absolute dollar variance (MAE/RMSE) and simulated algorithmic compounding returns over an extended multi-month backtest.

---

## Getting Started Locally

### 1. Installation & Environment
First, clone the repository and install dependencies:
\`\`\`bash
npm install
\`\`\`

Create an `.env` file containing your API keys for the data providers:
\`\`\`bash
OPENROUTER_KEY=your_key        # Target LLM via OpenRouter
SERPER_KEY=your_key            # News Search
LLM_MODEL_NAME=google/gemini-2.5-flash # Evaluated LLM String
\`\`\`

### 2. Run the Benchmark CLI Pipeline
\`\`\`bash
# 1. Scrape real-world historical data
npx tsx scripts/backfill-historical.ts

# 2. Query target LLM to predict closing prices
npx tsx scripts/backfill-inference.ts 

# 3. Grade the LLM's absolute variance
npx tsx scripts/run-evaluator.ts
\`\`\`

### 3. Start the Next.js Dashboard
To run the React benchmarking interface locally:
\`\`\`bash
npm run dev
# Open http://localhost:3000
\`\`\`

---

## Contributing New Models
OilBench is designed to track multiple LLMs in parallel. If you'd like to benchmark an entirely new model (e.g. `claude-3-opus`, `gpt-4o`) and submit its score to the Leaderboard:

📚 **Read the [How to Add and Benchmark a New LLM Guide](./Docs/adding-new-models.md) for step-by-step instructions.**
