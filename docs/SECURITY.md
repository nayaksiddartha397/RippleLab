# Security and Privacy Baseline

## Data classification

Financial profile data is sensitive user data. Authentication tokens, service-role keys and LLM API keys are secrets. Public source metadata and formula documentation are non-sensitive.

## Day 1 controls

- `.env*` files are ignored except the blank `.env.example` contract.
- Client-exposed variables must use `NEXT_PUBLIC_` only when intentionally public.
- Service-role and LLM credentials remain server-side.
- A repository check detects common committed-secret patterns.
- CI receives read-only repository contents permission.
- Sample data must be synthetic and must not contain a contributor's finances.

## Planned controls

- Supabase row-level security and ownership tests
- Minimal LLM payloads with unnecessary profile fields removed
- Redacted structured logs
- Rate limits and request-size limits
- Revocable, expiring share tokens
- Account export and deletion
- Dependency, secret and code scanning in CI

## Reporting a vulnerability

Do not open a public issue containing secrets or personal data. Until a private security contact is configured, stop deployment and notify the repository owner directly.
