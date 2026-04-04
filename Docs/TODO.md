# OilBench — Feedback TODOs

Tracking implementation status for each item in [FEEDBACKS.md](./FEEDBACKS.md).
Items #2–#6 are prioritized first; #7 (repeated runs) will follow.

---

## Feedback #2 — Backfill is not truly prospective
> Models may have been trained on the very prices they're being asked to predict.

- [x] Create a `models-metadata.json` mapping each model ID → training data cutoff date
- [x] Add cutoff-aware filtering to `batch-inference.ts` — skip dates that fall within a model's known training window
- [x] Add cutoff-aware filtering to `backfill-inference.ts` (same logic)
- [x] Document the cutoff policy in `Docs/adding-new-models.md`

**Status:** 🟢 Complete

---

## Feedback #3 — No temperature / sampling control
> Default temperature varies across providers; this is an uncontrolled variable.

- [x] Add `temperature: 0` and `seed: 42` to the API payload in `openRouter.ts`
- [x] Add `temperature` and `seed` to the API payload in `batch-inference.ts`
- [x] Make temperature and seed configurable via `.env` (`LLM_TEMPERATURE`, `LLM_SEED`)
- [x] Document the new env vars in `.env.example`

**Status:** 🟢 Complete

---

## Feedback #4 — The prompt leaks the evaluation setup
> "Predict the EXACT DOLLAR VALUE" and the portfolio allocation framing biases model behavior.

- [x] Rewrite the prompt in `promptBuilder.ts` to use neutral phrasing (remove "EXACT DOLLAR VALUE")
- [x] Separate the price prediction and portfolio allocation into distinct asks so they don't anchor each other

**Status:** 🟢 Complete

---

## Feedback #5 — Silent fallback to zero / default 50 obscures failures
> A $0 prediction or default-50 allocation is scored as if the model genuinely produced them.

- [x] Add a `parse_status: "success" | "failed"` field to `PredictionResult` in `types.ts`
- [x] Update `openRouter.ts` to set `parse_status` based on whether JSON parsing succeeded and values are valid
- [x] Update `batch-inference.ts` to set `parse_status` the same way
- [x] Update `evaluator.ts` to **skip** entries where `parse_status === "failed"` instead of scoring them
- [x] Remove or deprecate `retry-zeros.ts` (since failures are now properly tracked, not silently scored)
- [x] Log/report the number of parse failures per model in the metrics summary

**Status:** 🟢 Complete

---

## Feedback #6 — Day N → Day N+1 mapping assumes contiguous trading days
> If a date is missing, the "next" date could be 2+ days away, silently skewing evaluation.

- [x] Add a gap check in `evaluator.ts` before using `sortedDates[currentIndex + 1]`
- [x] Skip or flag evaluation pairs where the calendar gap exceeds 4 days (accounts for weekends + 1 holiday)
- [x] Log a warning when a gap is detected so it's visible in evaluator output
- [x] Add `skippedGaps` count to `MetricsSummary` so the dashboard can surface data quality issues

**Status:** 🟢 Complete

---

## Feedback #7 — No repeated runs / intra-model consistency unmeasured
> Each model is only run once per date; there's no way to measure variance.

- [x] Add `--runs N` parameter to `batch-inference.ts`
- [x] Store inference results per run (e.g. `data/prediction/model/runs/row_*.json`)
- [x] Aggregate across runs in `evaluator.ts` (mean, stdDev, min, max)

**Status:** 🟢 Complete
