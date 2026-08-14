# Changelog

All notable RippleLab changes are recorded here. The project follows a daily MVP build cadence and will adopt semantic versioning at the first public release.

## Unreleased

### Day 7 - 2026-08-14

- Added the first complete profile-to-repo-rate simulation through the signed-in Next.js experience and FastAPI economic engine.
- Added configurable loan/deposit pass-through, remaining-term and deposit-rate assumptions with human-readable API errors.
- Replaced the illustrative repo-rate result with an engine-generated golden result and deterministic sensitivity bounds.
- Added a personal before/after impact summary that explicitly separates calculated money from assumption-driven uncertainty.
- Added full browser coverage for authentication, saved-profile loading, FastAPI calculation, accessibility and assumption changes.
- Updated the dashboard and deployed progress page to the 7-of-30 vertical-slice checkpoint.

### Day 6 - 2026-08-14

- Added Decimal-safe EMI, scheduled outstanding-balance, linear rate-pass-through, floating-rate-reset and simple deposit-interest primitives.
- Added immutable outputs carrying formula versions, assumptions and an explicit half-up paise-rounding policy.
- Added coverage for known examples, zeros, bounds, negative validation, maturity and partial transmission.
- Documented every formula, unit, rounding rule, supported boundary and excluded product assumption.
- Updated the deployed progress page with a verified Day 6 formula ledger and the 6-of-30 checkpoint.

### Day 5 - 2026-08-13

- Added the canonical JSON Schema v1 contract for five scenario families, profile snapshots, assumptions, citations, causal graphs, impacts, uncertainty and confidence.
- Added deterministic TypeScript generation and a stale-generated-code check.
- Added a strict FastAPI Pydantic mirror and validation endpoint exercised with the same golden repo-rate request.
- Added cross-language rejection tests for unsupported scenario types, invalid units and unknown fields.
- Documented the confidence rubric, contract versioning and a complete source-linked repo-rate request/result example.
- Added a public build-progress page suitable for deployment without exposing private profile data.

### Day 4 - 2026-08-13

- Added a protected five-step financial-profile editor covering demographics, household cash flow, assets, housing, loans and goals.
- Added shared Zod validation for rupee values, percentages, enums, consent and practical input limits.
- Added Supabase persistence with integer-paise money fields, basis-point rates and one profile per authenticated user.
- Added forced row-level security policies for user-owned select, insert, update and delete operations.
- Connected saved profile metrics to the dashboard and added create/edit/reload, mobile and accessibility browser coverage.
- Added a deterministic migration-policy check and documented the profile privacy/data contract.

### Day 3 - 2026-08-13

- Added Supabase SSR email/password authentication, PKCE confirmation and password recovery.
- Added protected dashboard routing, server-side authorization checks and authenticated account controls.
- Added a production-disabled browser test adapter and end-to-end account lifecycle coverage.

### Day 2 - 2026-08-12

- Added the responsive application shell, design tokens and reusable interface components.
- Added dashboard, design-system, loading/error and accessibility states.
- Added desktop/mobile Chromium accessibility checks.

### Day 1 - 2026-08-12

- Bootstrapped the pnpm monorepo with a Next.js web app, FastAPI service and shared contract package.
- Added product boundaries, user journeys, architecture, security baseline and ADR 0001.
- Added API health integration tests, web lint/type/build checks, schema validation and secret scanning.
- Added GitHub Actions CI and safe environment-variable examples.
- Added a minimal product-specific landing surface and verified both runtimes over HTTP.
