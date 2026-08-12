# ADR 0001: Monorepo with a deterministic Python engine

- **Status:** Accepted
- **Date:** 2026-08-12

## Context

RippleLab needs a responsive TypeScript product surface, deterministic financial calculations, simulation libraries and shared versioned contracts. Numeric trust and traceability are more important than generating unrestricted prose.

## Decision

Use a pnpm monorepo with a Next.js web application, a separately packaged FastAPI economic engine and canonical JSON schemas in `packages/contracts`. The LLM boundary may create or explain structured data but cannot own authoritative calculations.

## Consequences

- Web and engine can be deployed and scaled independently.
- Contract generation/testing is required to prevent language-boundary drift.
- Local development runs two processes.
- Formula tests and versioning remain in Python, while UI types are generated from canonical schemas.
