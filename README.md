# OilBench: AI Crude Price Prediction Benchmark
**Live Dashboard Website:** [https://benhuang21828.github.io/oil-bench/](https://benhuang21828.github.io/oil-bench/)

OilBench is an automated framework built securely in a Next.js (App Router) environment designed to test and benchmark Large Language Models (LLMs) on their ability to predict crude oil prices based on quantitative macroeconomic data and qualitative geopolitical news. 

## Methodology & Benchmark Architecture
The core concept of OilBench is **historical pipeline replication**. We feed an LLM the exact information that was available to human traders precisely 24 hours prior to a daily settlement event, and we force the LLM to commit to an exact dollar price target.

### 1. Daily Contextual Data Assembly
For a given historical Day `N`, the framework programmatically aggregates the actual data payload:
- **Price Action**: The exact daily settlement close of WTI Crude (`CL=F`) and the Dollar Index (`DX-Y.NYB`).
- **Energy Fundamentals**: The EIA Weekly Petroleum Status Report (U.S. crude inventory builds vs draws) and the U.S. Baker Hughes Active Rig Count.
- **Geopolitical News**: Scraped top headlines and snippets for that specific calendar day via the Serper.dev API.

### 2. LLM Target Inference
This data is stitched into an expansive prompt payload. The LLM acts as the Commodities Analyst, takes the context of Day `N`, and makes an exact dollar prediction for the official NYMEX daily settlement price the following session: Day `N+1`. It must also output its chain-of-thought economic reasoning.

### 3. Absolute Target Evaluation
The system evaluates the exact error (Absolute Delta) between the LLM's Day `N+1` target price against the reality of `CL=F`'s finalized settlement close for Day `N+1`. Performance is ranked against other state-of-the-art models via calculating the Mean Absolute Error (MAE) and Root Mean Square Error (RMSE) across a multi-month backtesting array. 

---

## Instructions for Local Developers

### Setup
First, install the dependencies:
\`\`\`bash
npm install
\`\`\`

You will need the following API Keys in `.env`:
\`\`\`bash
OPENROUTER_KEY=your_key        # Target LLM via OpenRouter
SERPER_KEY=your_key            # News Search
EIA_API_KEY=your_key           # U.S. Fundamentals
LLM_MODEL_NAME=google/gemini-2.5-flash # Evaluated LLM String
\`\`\`

### Run the Benchmark CLI Pipeline
1. Ingest Data: \`npx tsx scripts/backfill-historical.ts\`
2. Query LLM Targets: \`npx tsx scripts/backfill-inference.ts\` 
3. Evaluate Tracking Error: \`npx tsx scripts/run-evaluator.ts\`

### Local Next.js UI Dashboard
To run the React benchmarking interface locally:
\`\`\`bash
npm run dev
# Open http://localhost:3000
\`\`\`
