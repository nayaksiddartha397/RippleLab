# RippleLab

RippleLab is an India-focused economic what-if simulator. It will connect a user's financial profile to deterministic scenario models, an inspectable causal graph, uncertainty ranges and source-backed explanations.

This repository is the Day 1 foundation for a 30-day MVP build. The current vertical surface includes a runnable Next.js web app, a runnable FastAPI health service, a canonical shared schema, automated checks and CI.

## Product boundary

The first version supports five scenario families only:

- Inflation increase
- RBI repo-rate change
- Oil-price increase
- Income-tax change
- Job loss or salary change

LLMs will be used only to parse constrained scenario inputs and explain deterministic outputs. They will not calculate authoritative financial results.

RippleLab is an educational decision-support tool. It does not provide investment, tax, lending or legal advice. Results will be estimates based on the assumptions and sources displayed with each simulation.

## Repository layout

```text
apps/web                    Next.js App Router application
services/economic-engine    FastAPI calculation service
packages/contracts          Canonical JSON schemas and shared types
data/sources                Versioned evidence metadata
docs                        Product, architecture and delivery documentation
scripts                     Repository checks and document rendering
tests/e2e                   Critical browser journeys introduced later
```

## Prerequisites

- Node.js 24 (Node.js 20.9+ is supported by Next.js 16)
- pnpm 11.16.0
- Python 3.12
- uv 0.11.19 or newer

## Local setup

```bash
cp .env.example .env.local
pnpm install
uv sync --project services/economic-engine --dev
```

Run the apps in separate terminals:

```bash
pnpm dev:web
pnpm dev:api
```

Open the web app at `http://localhost:3000` and the API health endpoint at `http://localhost:8000/health`.

## Quality checks

Run every core Day 1 check with one command:

```bash
pnpm check
```

This validates shared contracts, lints/type-checks/builds the web app, lints/formats/tests the API and scans repository files for common committed-secret patterns.

## Environment variables

All documented variables live in `.env.example`; values there are blank or safe local defaults. Never commit `.env.local`, service-role keys, LLM keys or personal financial test data.

## Documentation

- [Product contract](docs/PRODUCT_CONTRACT.md)
- [User journeys](docs/USER_JOURNEYS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security baseline](docs/SECURITY.md)
- [30-day build plan](docs/RIPPLELAB_30_DAY_PLAN.md)

## Git workflow

Keep `main` deployable. Daily work should use a short-lived branch named `codex/day-XX-topic`, pass `pnpm check`, and merge through a reviewed pull request.
