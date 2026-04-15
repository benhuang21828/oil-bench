# OilBench: AI Crude Price Prediction Benchmark

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Deploy](https://github.com/benhuang21828/oil-bench/actions/workflows/nextjs.yml/badge.svg)](https://github.com/benhuang21828/oil-bench/actions/workflows/nextjs.yml)

**Live Dashboard:** [benhuang21828.github.io/oil-bench](https://benhuang21828.github.io/oil-bench/)

OilBench is an automated framework to test and benchmark Large Language Models (LLMs) on their ability to predict crude oil prices based on quantitative macroeconomic data and qualitative geopolitical news.

---

## Methodology

OilBench forces the LLM to act as a Commodities Analyst. For a given day `N`, it is fed the exact historical data available on that day (Prices, EIA Fundamentals, and Serper News). The LLM then allocates an algorithmic $10,000 portfolio towards Oil for Day `N+1`. The Leaderboard tracks absolute dollar variance (MAE/RMSE) and simulated algorithmic compounding returns over an extended multi-month backtest.

---

## Key Metrics & Trading Tracking

### Avg Daily Miss
**Mean Absolute Error (MAE):** The average dollar amount the model's prediction missed the actual closing price on any given day.
- *Why it matters:* This represents the base accuracy of the model's price-targeting. A lower number indicates the model is generally closer to the pin.

### Consistency Risk
**Root Mean Square Error (RMSE):** Penalizes larger misses exponentially more heavily than smaller ones.
- *Why it matters:* A model might have a decent average miss, but occasionally make wildly incorrect predictions. A higher Consistency Risk warns that the model is prone to severe, unpredictable errors. Lower is better.

### Simulated P&L
**Algorithmic Tracking:** The ending balance of a $10,000 algorithmic portfolio based entirely on the LLM's daily asset allocation decisions (0-100% Oil) over the benchmark period.
- *Why it matters:* Price prediction alone doesn't equal profit. This metric forces the model to measure its own conviction; it proves whether the LLM can actually compound capital by betting heavily when it's right and holding cash when it's wrong. Higher is better.

---

## Setup

```bash
git clone https://github.com/benhuang21828/oil-bench.git
cd oil-bench
npm install
cp .env.example .env
# Fill in your API keys in .env (OpenRouter, Serper, EIA)
```

You need accounts and API keys for:
- [OpenRouter](https://openrouter.ai) — LLM inference
- [Serper](https://serper.dev) — news search
- [EIA](https://www.eia.gov/opendata/) — energy data (free)

## Architecture & Local Development

The dashboard is a Next.js app compiled to a **static export** (`out/`) for GitHub Pages hosting. The data pipeline (inference, evaluation) runs separately via scripts in `scripts/`.

- `npm run build` — compiles the static dashboard
- `npm run dev` — starts a local dev server for UI development
- `npm run lint` — runs ESLint

Data updates trigger an automatic full rebuild via GitHub Actions (`.github/workflows/nextjs.yml`).

---

## Contributing New Models

OilBench is designed to track multiple LLMs in parallel. To benchmark a new model and submit its score:

**[How to Add and Benchmark a New LLM](./Docs/adding-new-models.md)**

See also [CONTRIBUTING.md](./CONTRIBUTING.md) for general contribution guidelines.
