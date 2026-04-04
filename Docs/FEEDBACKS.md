## 2. Backfill is not truly prospective

The models are called via `backfill-inference.ts` / `batch-inference.ts` after the fact on historical dates. There's no guarantee the models hadn't already been trained on data from this period. A model trained on data through March 2026 could have seen the very WTI prices it's being asked to predict. This is the benchmark's most fundamental threat to validity.

## 3. No temperature / sampling control

The API calls don't set `temperature`, `top_p`, or seed. Default temperature varies across providers/models, so some models may be generating more or less "creative" predictions. This is an uncontrolled variable:

```ts
// openRouter.ts — no temperature set
const payload = {
  model: model,
  messages: [{ role: 'user', content: prompt }],
  response_format: { type: "json_object" }
};
```

## 4. The prompt leaks the evaluation setup

The prompt says "predict the EXACT DOLLAR VALUE" and asks for a portfolio allocation. Models may anchor differently to this framing — some may produce artificially precise numbers while others hedge. The `portfolio_allocation` instruction ("0 = all cash, 100 = all oil") conflates directional conviction with position sizing.

## 5. Silent fallback to zero / default 50 obscures failures

When parsing fails, the code silently records `predict_target_price: 0` and defaults `portfolio_allocation` to 50:

```ts
predict_target_price: parsed.predict_target_price || 0,
portfolio_allocation: typeof parsed.portfolio_allocation === 'number' ? parsed.portfolio_allocation : 50,
```

A $0 prediction or a default-50 allocation are then scored as if the model genuinely produced them. The `retry-zeros.ts` script exists to patch this, but it's a manual step. Models that are worse at producing valid JSON are penalized on price accuracy and silently given a 50% allocation they never chose.

## 6. Day N → Day N+1 mapping assumes contiguous trading days

The evaluator finds the "next" date by index in sorted price files:

```ts
const nextDateFmt = sortedDates[currentIndex + 1];
```

This works if the price files cover every trading day, but if a date is missing (e.g., the data fetcher failed for one day), the "next" date could be 2+ days away, silently comparing a 1-day prediction against a multi-day move.

## 7. No repeated runs — intra-model consistency is unmeasured

Currently, each model is run **once** per date. A single run tells you nothing about whether a model's output is stable or just lucky noise. We need to run the same inference for every single model **at least 10 times** per date so we can measure how consistent each model is between runs. Intra-model consistency (variance across repeated runs with identical inputs) is just as important as inter-model performance comparison. Without this:

- A model could score well on one run but terribly on the next due to sampling randomness.
- There's no way to compute confidence intervals or standard deviations on MAE/RMSE — the leaderboard rankings could be within the noise floor.
- Two models with similar average MAE could have wildly different reliability, but we'd never know.

This would require changes to:
- The inference pipeline (`batch-inference.ts`) to support a `--runs N` parameter and store results per-run (e.g., `predictions_run_01.json` ... `predictions_run_10.json`).
- The evaluator to aggregate across runs — reporting mean, std dev, and min/max for each metric.
- The dashboard to display consistency metrics (e.g., error bars on the leaderboard).
