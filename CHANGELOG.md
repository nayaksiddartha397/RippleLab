# Changelog

All notable RippleLab changes are recorded here. The project follows a daily MVP build cadence and will adopt semantic versioning at the first public release.

## Unreleased

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
