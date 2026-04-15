# Contributing to OilBench

Thank you for your interest in contributing! There are several ways to help.

---

## Reporting Bugs

Open an issue at [github.com/benhuang21828/oil-bench/issues](https://github.com/benhuang21828/oil-bench/issues) and include:

- A clear description of the problem
- Steps to reproduce it
- What you expected vs. what actually happened
- Your OS and Node.js version

## Suggesting Features

Open an issue with the `enhancement` label. Describe the use case and why it would benefit the benchmark.

## Adding a New LLM to the Benchmark

This is the most common contribution. Follow the detailed step-by-step guide:

**[How to Add and Benchmark a New LLM](./Docs/adding-new-models.md)**

It covers: environment setup, model configuration, running inference, evaluation, and submitting results.

## Pull Requests

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make your changes and verify the build passes: `npm run build`
3. Run the linter: `npm run lint`
4. Open a pull request against `main` with a clear description of what you changed and why

## Local Development Setup

```bash
git clone https://github.com/benhuang21828/oil-bench.git
cd oil-bench
npm install
cp .env.example .env
# Fill in your API keys in .env
npm run build
```

> Note: The dashboard uses a Next.js static export (see `next.config.ts`). `npm run dev` starts a local dev server for the UI, but the data pipeline scripts in `scripts/` are run separately via `npx ts-node` or `tsx`.

## Code Style

- TypeScript throughout
- ESLint config is enforced — run `npm run lint` before pushing
- Keep PRs focused; one logical change per PR
