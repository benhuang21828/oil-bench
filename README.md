# OilBench: AI Crude Price Prediction Benchmark
**Live Dashboard Website:** [https://benhuang21828.github.io/oil-bench/](https://benhuang21828.github.io/oil-bench/)

OilBench is an automated framework to test and benchmark Large Language Models (LLMs) on their ability to predict crude oil prices based on quantitative macroeconomic data and qualitative geopolitical news. 

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
**Algorithmic Algorithmic Tracking:** The ending balance of a $10,000 algorithmic portfolio based entirely on the LLM's daily asset allocation decisions (0-100% Oil) over the benchmark period. 
- *Why it matters:* Price prediction alone doesn't equal profit. This metric forces the model to measure its own conviction; it proves whether the LLM can actually compound capital by betting heavily when it's right and holding cash when it's wrong. Higher is better.

---

## Local Development Note
The Next.js dashboard uses a static `out` export for GitHub Pages native deployment. Running `npm run dev` locally is no longer supported for this architectured pipeline. Data updates trigger a full site rebuild via GitHub Actions automatically.

## Contributing New Models
OilBench is designed to track multiple LLMs in parallel. If you'd like to benchmark an entirely new model (e.g. `claude-3-opus`, `gpt-4o`) and submit its score to the Leaderboard:

📚 **Read the [How to Add and Benchmark a New LLM Guide](./Docs/adding-new-models.md) for step-by-step instructions.**
