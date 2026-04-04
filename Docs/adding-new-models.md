# How to Add and Benchmark a New LLM

OilBench was designed from the ground up to concurrently track and rank multiple models against the same historical dataset. Any contributor can run their own inferences using **OpenRouter** and submit a Pull Request to get their model on the global Leaderboard.

## The multi-model Architecture
Inside `data/prediction/`, the benchmark isolates each model's predictions into a dedicated subdirectory. The global evaluator script then loops through every folder in this directory, scores them, and writes the ranked results to `metrics_summary.json`. The Next.js dashboard reads this file and dynamically populates the UI.

In short, getting a new model on the board is as simple as generating its JSON file.

## Step-by-Step Instructions

**Step 1. Prepare your Environment**
If you haven't already, clone the repository and run:
`npm install`

Create an `.env` file from the example:
`cp .env.example .env`

**Step 2. Assign the Target Model**
Open your `.env` file. You will need an API key from [OpenRouter](https://openrouter.ai/). 
Find the specific string name of the model you wish to benchmark on OpenRouter (e.g., `meta-llama/llama-3-70b-instruct` or `anthropic/claude-3-opus`).

Assign it to the `LLM_MODEL_NAME` variable:
Assign it to the `LLM_MODEL_NAME` variable:
```bash
OPENROUTER_KEY=yr_key_here
LLM_MODEL_NAME=anthropic/claude-3-opus
LLM_TEMPERATURE=0
LLM_SEED=42
```

**Step 2b. Add Training Cutoff Date**
To prevent data leakage, you must define the model's training data cutoff date in `data/models-metadata.json`. The pipeline will automatically skip benchmark dates that fall before this date. Provide a YYYY-MM-DD date or use a conservative proxy (like public release date) if exact details aren't known.

**Step 3. Run the Inference Engine**
With your environment variable set, execute the batch inference pipeline. We strongly recommend using the `--runs` flag to perform multiple repeated runs (usually 10) to accurately measure intra-model consistency (variance):
```bash
npx tsx scripts/batch-inference.ts --runs=10
```
*(This script will read the historical context data in `data/raw`, automatically skip dates before your model's cutoff, query your model via OpenRouter factoring in the temperature and seed, and save the result sets into a new folder `data/prediction/anthropic_claude-3-opus/runs/`.)*

**Step 4. Run the Evaluator**
Once the inferences finish, run the grading script:
```bash
npx tsx scripts/run-evaluator.ts
```
The evaluator will automatically detect your new model folder, cross-reference its targets against the actual NYMEX settlement prices, calculate its `MAE` and `RMSE`, and officially add it to `data/benchmarks/metrics_summary.json`.

**Step 5. Test and Submit**
*(Note: Because the Next.js dashboard uses a static `out` export for GitHub Pages, `npm run dev` is no longer supported for local viewing.)*

To get your model on the live site, just commit the new prediction folder and the updated `metrics_summary.json` to a branch and open a Pull Request!
```bash
git add data/prediction/
git add data/benchmarks/
git commit -m "add benchmark run for claude 3 opus"
```
