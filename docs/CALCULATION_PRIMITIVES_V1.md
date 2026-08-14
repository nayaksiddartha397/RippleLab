# Calculation Primitives v1

## Purpose

Day 6 establishes the deterministic money and rate functions used by later RippleLab scenarios. These functions calculate; they do not forecast. Scenario-specific assumptions, causal evidence and uncertainty are assembled in later layers.

All money inputs and outputs use integer paise. Annual rates use integer basis points, where 100 basis points equal one percentage point. Pass-through ratios also use basis points, where 10,000 represents 100% transmission.

## Numeric policy

- Every formula uses Python `Decimal` with precision 50.
- Public money outputs are rounded once to the nearest paise with `ROUND_HALF_UP`.
- Amortization calculations retain unrounded intermediate values.
- Applied rate changes retain four decimal places of one basis point.
- Binary floating-point arithmetic is not used.
- Negative principal, negative annual rates and non-positive loan terms are rejected.
- The supported annual-rate boundary is 0 to 10,000 basis points and the supported loan term is 1 to 1,200 months.

## Formula registry

| Primitive | Formula version | Primary output |
| --- | --- | --- |
| Equal monthly instalment | `loan.emi.v1` | Monthly payment in paise |
| Scheduled outstanding balance | `loan.outstanding_balance.v1` | Remaining principal in paise |
| Linear rate transmission | `rates.linear_pass_through.v1` | Applied change in basis points |
| Floating-rate reset | `loan.floating_rate_reset.v1` | Before/after EMI and rate |
| Simple deposit interest | `deposit.simple_interest.v1` | Gross interest and maturity value |

Every result is an immutable value object containing its formula version and plain-language assumptions. Money results also expose the rounding policy.

## EMI

Let:

- `P` be principal in paise;
- `a` be the nominal annual rate in basis points;
- `r = a / 120000` be the monthly decimal rate;
- `n` be the number of monthly payments.

For a non-zero rate:

```text
growth = (1 + r) ^ n
EMI = P * r * growth / (growth - 1)
```

For a zero rate, `EMI = P / n`. The model assumes a fully amortizing loan, end-of-month payments, a fixed term and no fees, insurance, taxes or prepayments.

Known example: INR 50,00,000 at 8.50% for 240 months produces an EMI of INR 43,391.16.

## Outstanding balance

After `k` scheduled payments:

```text
B(k) = P * (1 + r) ^ k - EMI * (((1 + r) ^ k - 1) / r)
```

The same unrounded EMI value is used inside the balance formula. At zero interest, the balance is principal minus `k` equal principal payments. At payment zero it equals principal; at contractual maturity it is explicitly zero.

Known example: the INR 50,00,000, 8.50%, 240-month loan has INR 44,06,359.16 outstanding after 60 scheduled payments.

## Rate pass-through

```text
applied change (bps) = reference change (bps) * pass-through ratio / 10000
```

The primitive supports positive, zero and negative shocks. It assumes linear, contemporaneous transmission and intentionally excludes product-specific lags, floors and caps. Those constraints belong to the scenario/product layer.

Example: a -100 basis-point reference-rate change with 70% pass-through applies -70.0000 basis points.

## Floating-rate reset

The floating-rate reset adds the transmitted change to the current annual rate and recalculates EMI over the unchanged remaining term. It returns the applied rate change, resulting rate, original EMI, reset EMI and signed monthly payment change.

Known example: applying 70% of a 100 basis-point cut to the INR 50,00,000 example changes the rate from 8.50% to 7.80%, reducing EMI from INR 43,391.16 to INR 41,201.80. The signed monthly change is -INR 2,189.36.

The primitive rejects a reset that would make the supported annual rate negative or exceed 100%.

## Deposit interest

```text
gross interest = principal * annual rate / 10000 * term days / day-count basis
maturity value = principal + rounded gross interest
```

Supported day-count bases are 360, 365 and 366. Interest is simple, gross and paid at maturity. Compounding, tax, early-withdrawal penalties and reinvestment are excluded.

Known example: INR 10,00,000 at 7.25% for 365/365 days earns INR 72,500.00 gross interest.

## Validation and tests

Day 6 unit tests cover:

- independently checkable loan and deposit examples;
- zero principal, zero interest and zero deposit term;
- payment zero and contractual maturity;
- full, partial and zero pass-through;
- positive and negative reference-rate shocks;
- invalid negative values, terms, payment counts, ratios, rate bounds and day-count bases;
- formula versions, assumptions and money-rounding metadata.

Run `pnpm check:api` for formatting, linting and the complete FastAPI/engine test suite.
