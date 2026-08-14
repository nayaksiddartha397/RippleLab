# RippleLab economic engine

FastAPI service that owns deterministic calculations, validation, simulations, formula versions and evidence-linked result assembly.

```bash
uv sync --project services/economic-engine --dev
pnpm dev:api
```

The service exposes `/`, `/health`, the Day 5 contract-validation endpoint and `POST /v1/simulations/repo-rate`. Day 6 added Decimal-safe EMI, outstanding-balance, rate-pass-through, floating-rate-reset and deposit-interest primitives under `ripplelab_engine.calculations`; Day 7 assembles those primitives into a source-linked personal result under `ripplelab_engine.repo_rate`.

Every calculation result includes a formula version and assumptions; money outputs also expose the shared half-up paise-rounding policy. See [Calculation Primitives v1](../../docs/CALCULATION_PRIMITIVES_V1.md) for formulas, units, examples and boundaries.

The repo-rate endpoint requires four named assumptions: `loanPassThrough`, `depositPassThrough`, `remainingLoanTermMonths` and `currentDepositRateBps`. It returns deterministic loan and deposit impacts, a net annual amount, sensitivity bounds, confidence, causal references and explicit warnings. See [Repo-rate Vertical Slice v1](../../docs/REPO_RATE_VERTICAL_SLICE_V1.md).
