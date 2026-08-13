# Simulation and evidence contract v1

## Purpose

The version 1 contract is the shared boundary between RippleLab's Next.js application and deterministic FastAPI economic engine. It fixes the supported scenario vocabulary, numeric units, personal profile snapshot, assumptions, evidence, causal graph, impacts, uncertainty and confidence fields before calculations are implemented.

The canonical artifact is `packages/contracts/schemas/simulation-contract.schema.json`. Generated TypeScript and the Python API mirror must agree with it.

## Versioning

`schemaVersion` is `1.0.0`. A breaking shape or semantic change increments the major version. A backwards-compatible field addition increments the minor version. Clarifications that do not alter accepted data increment the patch version.

Every result also carries `modelVersion`. This lets two results share a transport schema while using different formula releases.

## Supported scenarios and units

| Scenario | Contract value | Shock unit |
| --- | --- | --- |
| Inflation | `inflation_change` | Percentage points |
| RBI repo rate | `repo_rate_change` | Basis points |
| Crude oil price | `oil_price_change` | US dollars per barrel |
| Effective income tax | `income_tax_change` | Percentage points |
| Job loss or salary change | `job_income_change` | Percent of income |

Units are part of each scenario shape, not free-form labels. A repo-rate shock supplied in percentage points fails validation even when its numeric value could be converted. Callers must perform explicit conversion before crossing the boundary.

All monetary profile and result fields ending in `Paise` are integers. Rates ending in `Bps` are integer basis points.

## Request contract

A `SimulationRequest` contains:

- immutable request ID, schema version, India country code and INR currency;
- exactly one discriminated supported scenario;
- a timestamped profile snapshot so reruns remain reproducible after the live profile changes;
- explicit editable/non-editable assumptions with values, units and rationale;
- evidence metadata referenced by stable IDs.

The profile snapshot contains only values needed by the initial five scenario families. Goals and direct identifiers such as email are intentionally excluded.

## Result contract

A `SimulationResult` contains:

- request, schema and formula/model versions;
- annual net impact in paise;
- p10, p50 and p90 uncertainty values with a declared method;
- individual benefit, cost, neutral or uncertain impacts;
- an inspectable causal graph;
- the exact assumptions and citations used;
- a confidence rubric and user-visible warnings.

Every impact points to a causal node. Every causal edge points to existing source and target nodes and may point to assumptions and citations. Validation rejects missing references in the golden contract tests.

## Confidence rubric

Five dimensions are scored from 0 to 4:

1. Evidence quality - authority and methodological quality of supporting sources.
2. Causal directness - number and ambiguity of links between the event and impact.
3. Model stability - sensitivity to formulas and uncertain parameters.
4. Personalization coverage - amount of the causal path grounded in the user's profile.
5. Data recency - freshness of evidence and economic inputs.

The overall score is the sum of the dimensions multiplied by five. Scores 0-39 are Low, 40-79 Medium and 80-100 High. The contract requires a plain-language rationale because the label alone is insufficient evidence.

Confidence is not a forecast probability. It describes how well supported the modeled estimate is under its stated assumptions.

## Citation metadata

Each citation includes a stable ID, title, publisher, source type, HTTPS URL, access timestamp and optional publication date/locator. Allowed source types are official statistic, regulation, central bank, research and methodology.

The contract stores source identity and location. Day 12 adds retrieval, review and freshness workflows; it must not silently replace the citation that a saved result references.

## Golden repo-rate example

The versioned files `repo-rate-request.v1.json` and `repo-rate-result.v1.json` demonstrate a 100 basis-point repo-rate cut for a homeowner with a floating loan and fixed deposits.

The result is an illustrative contract fixture, not a validated Day 6 calculation. It models a positive home-loan payment effect and negative deposit-income effect, shows an INR 18,000 annual net benefit, includes deterministic uncertainty bounds and links every graph edge to assumptions and RBI source metadata.

## Validation

Run `pnpm check:contracts` to verify:

- JSON Schema Draft 2020-12 structure;
- golden request and result shapes;
- scenario enums and exact units;
- rejection of unsupported scenario types and schema versions;
- confidence score/label agreement;
- uncertainty ordering;
- causal-node, assumption and citation references.

The FastAPI test suite posts the same golden request to `/v1/contracts/simulation/validate`. It confirms that the Python mirror accepts the canonical request and rejects unsupported scenarios, wrong units and extra fields.

Run `pnpm generate:contracts` after schema changes. CI checks that the committed TypeScript output is current.
