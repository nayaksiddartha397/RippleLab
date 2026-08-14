# Repo-rate Vertical Slice v1

## Purpose

Day 7 connects RippleLab's saved financial profile, versioned scenario request and Day 6 calculation primitives into the first trustworthy end-to-end simulation. A language model is not present in the money path.

```text
Saved profile + explicit assumptions
  -> authenticated Next.js route
  -> POST /v1/simulations/repo-rate
  -> Decimal loan and deposit formulas
  -> typed impact, sensitivity, confidence and causal result
```

## Endpoint

`POST /v1/simulations/repo-rate` accepts the canonical `SimulationRequest` contract with `scenario.type = repo_rate_change`. The response is the canonical `SimulationResult` contract.

The Next.js handler at `/api/simulations/repo-rate` requires an authenticated user and forwards the typed request to the server-side `RIPPLELAB_ENGINE_URL`. Browser code never receives the economic-engine URL.

## Required assumptions

| ID | Unit | Range | Purpose |
| --- | --- | --- | --- |
| `loanPassThrough` | Ratio | 0-1 | Share of the RBI move transmitted to the floating-loan rate |
| `depositPassThrough` | Ratio | 0-1 | Share transmitted to the modeled renewal deposit rate |
| `remainingLoanTermMonths` | Months | 1-1,200 | Contractual term remaining after the reset |
| `currentDepositRateBps` | Basis points | 0-10,000 | Gross annual deposit rate before repricing |

The first two values are transmission assumptions. The last two are explicit because the Day 4 profile stores loan rate and deposit balance but not remaining term or the deposit's contracted rate.

## Deterministic calculation

The loan path calls `loan.floating_rate_reset.v1` using outstanding home-loan principal, weighted loan rate, remaining term, repo-rate shock and loan pass-through. The annual loan cash-flow impact is the negative monthly payment change multiplied by 12.

The deposit path applies `rates.linear_pass_through.v1`, rounds the modeled deposit rate to the nearest basis point with half-up rounding, and calls `deposit.simple_interest.v1` for the current and reset rates. The difference is the gross annual deposit-income impact.

```text
annual_net_impact = annual_loan_cash_flow_impact + annual_deposit_income_impact
```

All money crosses the API boundary as integer paise. Rates use integer basis points. The underlying formulas retain Decimal intermediates and round final money once.

## Seeded reproducible example

| Input | Value |
| --- | --- |
| Outstanding floating home loan | INR 65,00,000 |
| Current loan rate | 8.50% |
| Remaining term | 180 months |
| Fixed deposits | INR 8,00,000 |
| Current deposit rate | 7.25% |
| Repo-rate change | -100 basis points |
| Loan pass-through | 70% |
| Deposit pass-through | 50% |

| Output | Value |
| --- | --- |
| Modeled EMI before reset | INR 64,008.07 per month |
| Modeled EMI after reset | INR 61,369.23 per month |
| Annual loan cash-flow benefit | INR 31,666.08 |
| Annual deposit-income cost | INR 4,000.00 |
| Annual net impact | INR 27,666.08 |
| Overall confidence | Medium, score 75/100 |

The golden request and result under `packages/contracts/examples` are generated from and regression-tested against this engine behavior.

## Sensitivity is not probability

Day 7 does not run Monte Carlo simulation. The response's `deterministic_bounds` evaluate the four corner combinations created by moving both pass-through ratios down and up by 20 percentage points, clamped to 0-100%.

For the seeded example, the lower bound is INR 17,088.16, the selected-assumption result is INR 27,666.08 and the upper bound is INR 38,187.60. The `p10`, `p50` and `p90` field names come from the cross-scenario contract; with `method = deterministic_bounds`, they must be presented as sensitivity labels rather than statistical percentiles.

## Error boundary

Pydantic request failures return status 422 with a stable error code, a human-readable summary and field-level issues. Missing or inconsistent named assumptions return status 422 with `INVALID_REPO_RATE_ASSUMPTION` and a direct corrective message. The Next.js boundary converts upstream or connectivity failures into short product-facing errors.

## Confidence and limitations

The formulas are stable after rate and term inputs are known. Confidence remains medium overall because actual transmission, lender reset timing, deposit maturity timing and product spreads are not known from the current profile.

The model excludes fees, taxes, prepayments, benchmark floors, repricing delays, compounding, deposit penalties and future policy changes. It is an educational simulation, not financial advice.

## Verification

- Engine tests reproduce the canonical golden result exactly.
- Repeated calls with identical inputs return identical financial outputs.
- Changing loan pass-through changes the output without modifying the profile.
- API tests cover a successful vertical slice and human-readable assumption errors.
- Browser tests cover authentication, seeded profile loading, FastAPI calculation, assumption updates and serious/critical accessibility checks.
