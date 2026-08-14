# RippleLab

RippleLab is an India-focused economic what-if simulator. It will connect a user's financial profile to deterministic scenario models, an inspectable causal graph, uncertainty ranges and source-backed explanations.

This repository contains the first seven checkpoints of a 30-day MVP build: the runnable monorepo foundation, responsive application shell, Supabase-ready authentication, a private personal financial profile, a versioned simulation/evidence contract, Decimal-safe loan/deposit primitives and the first profile-to-repo-rate vertical slice.

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
- pnpm 11.19.0
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

The web server forwards personal scenario requests to `RIPPLELAB_ENGINE_URL`. The safe local default in `.env.example` is `http://127.0.0.1:8000`; keep this server-side so browsers do not bypass the authenticated web boundary.

### Supabase authentication setup

Create a Supabase project, then add these values to the repository-root `.env.local` file or the web process environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

In Supabase Auth URL Configuration, set the local Site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/confirm`. Hosted email/password sign-up uses PKCE confirmation; password recovery returns through the same confirmation route before opening `/auth/update-password`.

Apply the Day 4 profile migration before using the hosted profile editor:

```bash
supabase db push
```

The migration at `supabase/migrations/202608130001_create_financial_profiles.sql` creates one profile per authenticated user and enables forced row-level security for every CRUD operation. Money is stored as integer paise; percentage rates are stored as integer basis points. See [the profile data model](docs/PROFILE_DATA_MODEL.md) for the field and privacy contract.

`SUPABASE_SERVICE_ROLE_KEY` is not needed by the web authentication flow and must never be exposed with a `NEXT_PUBLIC_` prefix. `RIPPLELAB_AUTH_TEST_MODE` is reserved for Playwright and is hard-disabled in production.

## Quality checks

Run every core project check with one command:

```bash
pnpm check
```

This validates shared contracts and generated TypeScript, checks web/API agreement on the golden simulation request, verifies the profile migration, lints/type-checks/builds the web app, exercises accessibility plus authentication/profile lifecycles in Chromium, lints/formats/tests the API and scans repository files for common committed-secret patterns.

## Environment variables

All documented variables live in `.env.example`; values there are blank or safe local defaults. Never commit `.env.local`, service-role keys, LLM keys or personal financial test data.

## Documentation

- [Product contract](docs/PRODUCT_CONTRACT.md)
- [User journeys](docs/USER_JOURNEYS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security baseline](docs/SECURITY.md)
- [Financial profile data model](docs/PROFILE_DATA_MODEL.md)
- [Simulation and evidence contract v1](docs/SIMULATION_CONTRACT_V1.md)
- [Calculation primitives v1](docs/CALCULATION_PRIMITIVES_V1.md)
- [Repo-rate vertical slice v1](docs/REPO_RATE_VERTICAL_SLICE_V1.md)
- [30-day build plan](docs/RIPPLELAB_30_DAY_PLAN.md)

## Git workflow

Keep `main` deployable. Daily work should use a short-lived branch named `codex/day-XX-topic`, pass `pnpm check`, and merge through a reviewed pull request.
