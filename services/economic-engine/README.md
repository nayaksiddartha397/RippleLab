# RippleLab economic engine

FastAPI service that owns deterministic calculations, validation, simulations, formula versions and evidence-linked result assembly.

```bash
uv sync --project services/economic-engine --dev
pnpm dev:api
```

The service exposes `/`, `/health` and the Day 5 contract-validation endpoint. Day 6 adds Decimal-safe EMI, outstanding-balance, rate-pass-through, floating-rate-reset and deposit-interest primitives under `ripplelab_engine.calculations`.

Every calculation result includes a formula version and assumptions; money outputs also expose the shared half-up paise-rounding policy. See [Calculation Primitives v1](../../docs/CALCULATION_PRIMITIVES_V1.md) for formulas, units, examples and boundaries.
