# AI Oil Price Prediction Benchmark - Technical Spec

## 1. Architecture Overview
This project benchmarks Large Language Models (LLMs) on their ability to ingest daily market news, prior day's price data, and critical macroeconomic indicators to predict the directional movement of Crude Oil (`CL=F`) for the upcoming trading session. 

The application is built entirely as a **Full-Stack Next.js (App Router)** application to keep all logic (data ingestion, prompt building, LLM inference, and dashboard rendering) in a unified JavaScript/TypeScript ecosystem.

**The Workflow:**
1. **Raw Data Collection:** A set of internal Next.js API routes or server actions fetch historical financial prices (Oil, DXY), fundamental reports (EIA, Rig Count), and relevant daily news via `serper.dev`.
2. **Prompt Assembly:** Combine the day's fundamental context with the news into a strictly formatted prompt.
3. **Inference (OpenRouter):** Pass the prompt to the target LLM (starting with `google/gemini-2.5-flash` via the OpenRouter SDK) to predict the probability that the price will close higher, along with a short reasoning.
4. **Evaluation:** Compare prediction against the actual closing price, calculate metrics, and save data.
5. **Presentation:** The Next.js React frontend displays the accuracy leaderboard, the price chart, and the daily reasoning contextual panel.

## 2. Directory Structure (Next.js App Router)

```text
oil-bench/
├── spec/
│   └── benchmark_architecture.md     # This document
├── data/                             # Local JSON storage for benchmark runs
│   ├── raw/
│   │   ├── prices/                   # yfinance API JSON (CL=F, DX-Y.NYB)
│   │   ├── fundamentals/             # EIA status, US rig count
│   │   └── news/                     # Serper.dev JSON
│   ├── prediction/
│   │   └── google_gemini-2.5-flash/
│   │       └── predictions.json      # Consolidated array of daily outputs
│   └── benchmarks/
│       └── metrics_summary.json      # Final aggregated metrics (Accuracy, F1)
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Main Dashboard UI
│   │   ├── layout.tsx
│   │   ├── api/                      # Backend Endpoints
│   │   │   ├── fetch-data/           # Triggers collection of Yahoo/Serper/EIA data
│   │   │   ├── run-inference/        # Triggers OpenRouter calls
│   │   │   └── evaluate/             # Triggers scoring
│   ├── components/                   # React UI Components (Chart, Leaderboard)
│   ├── lib/
│   │   ├── fetchers/                 # JS modules for pulling data
│   │   │   ├── yahooFinance.ts       # Fetches CL=F, DXY
│   │   │   ├── eia.ts                # Fetches EIA inventory, rig count
│   │   │   └── serper.ts             # Fetches news
│   │   ├── inference/                # LLM execution
│   │   │   ├── promptBuilder.ts      # Assembles the prompt string
│   │   │   └── openRouter.ts         # Wrapper for OpenRouter SDK
│   │   └── evaluation/               # Grading logic
│   │       └── evaluator.ts
```

## 3. Data Sources Required

The benchmark relies on a precise set of daily context variables to give the LLM the same quantitative and qualitative baseline as a human trader.

1. **Price Data Base:** Yahoo Finance (`yahoo-finance2` npm package)
   - WTI Crude Oil (`CL=F`)
   - US Dollar Index (`DX-Y.NYB`)
2. **News Sentiment Data:** `serper.dev` API
   - Targeted daily queries (e.g., "OPEC", "Middle East oil", "China economy")
3. **Fundamental Data:**
   - **EIA Weekly Petroleum Status Report**: Weekly changes in crude inventories (e.g., build vs draw).
   - **US Rig Count (Baker Hughes)**: Weekly count of active drilling rigs.

## 4. Prompt Engineering System

The core of the inference pipeline relies on providing highly structured market context to the LLM. 

**Proposed Standard Prompt Payload:**
```text
System Prompt: You are an expert quantitative commodities analyst. Your task is to predict the directional movement of WTI Crude Oil (CL=F) for the upcoming trading session.

Market Context (Yesterday's Close):
* WTI Crude closed at: $[PREVIOUS_CLOSE_PRICE] ([PERCENT_CHANGE]% from previous day)
* US Dollar Index (DXY) trend: [DXY_TREND] ([DXY_PERCENT_CHANGE]%)

Fundamental Data (Last 24h/Recent):
* EIA Report: [EIA_DATA_SUMMARY]
* US Rig Count: [RIG_COUNT_DATA_SUMMARY]

Geopolitical & Market News (via Serper):
1. "[NEWS_HEADLINE_1]" - "[NEWS_SNIPPET_1]"
2. "[NEWS_HEADLINE_2]" - "[NEWS_SNIPPET_2]"
3. "[NEWS_HEADLINE_3]" - "[NEWS_SNIPPET_3]"

Task: Based on this information, predict the probability (0% to 100%) that WTI Crude will close HIGHER today than yesterday's close of $[PREVIOUS_CLOSE_PRICE]. Provide a 3-sentence reasoning in JSON format returning {"predict_higher_probability": number, "reasoning": "string"}.
```

## 5. Execution Plan (JavaScript / Next.js)

- **Phase 1 (Data Layer):** Implement Next.js API routes to fetch CL=F, DXY, EIA stats, Rig Counts, and Serper news, saving everything to the local `data/raw` folder.
- **Phase 2 (Inference Layer):** Build the `promptBuilder.ts` to construct the daily prompt template, feed it into the OpenRouter SDK targeting `google/gemini-2.5-flash`, and save JSON predictions locally.
- **Phase 4 (Frontend UI):** Build out the React functional components (Line chart for price history + predictions, leaderboard table, daily analysis side-panel).

## 6. Environment & Configuration

To run this application, a `.env` file is required in the root directory.

```bash
# LLM Inference (Provider agnostic via OpenRouter)
OPENROUTER_KEY=your_openrouter_api_key

# News Aggregation API
SERPER_KEY=your_serper_dev_api_key
```

*Note: Yahoo Finance (`yahoo-finance2`), EIA, and Rig Count data are fetched via free, public endpoints or scraping scripts and do not require API keys.*

## 7. Developer Guide: Extending the Benchmark

This architecture is designed to be modular so future developers can easily add new evaluation dimensions.

### 7.1 Adding a New LLM Model
1. Open `src/lib/inference/openRouter.ts`.
2. Add the new model's OpenRouter ID (e.g., `anthropic/claude-3-opus`) to the `SUPPORTED_MODELS` array.
3. The inference engine will automatically iterate through the array and append outputs as new objects into the array in `data/prediction/[provider_model_name]/predictions.json`.

### 7.2 Adding New Data Sources (e.g., Weather, Shipping Data)
1. Create a new fetcher in `src/lib/fetchers/newSource.ts`.
2. Ensure the fetcher saves daily JSON data into `data/raw/new_source/`.
3. Update `src/lib/inference/promptBuilder.ts` to read this new localized JSON file and append its context string to the `Prompt Payload` template.

### 7.3 Modifying the Evaluation Criteria
If you want to evaluate regression (exact price target) instead of classification (Up/Down probability):
1. Alter the Prompt Payload in `promptBuilder.ts` to request an absolute dollar value.
2. Update `src/lib/evaluation/evaluator.ts` to track Root Mean Square Error (RMSE) against the actual `CL=F` settlement price, rather than calculating Win Rate and F1 Score.
