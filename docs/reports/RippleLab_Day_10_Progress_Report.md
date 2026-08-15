# RippleLab Day 10 Progress Report

**Day:** 10 of 30  
**Date:** 2026-08-15  
**Status:** Complete  
**Branch:** `codex/day-10-oil-price`  
**Implementation commit:** `95fa368`  
**Deployed commit:** `95fa368`  
**Production version:** 6  
**Quality gate:** Full local suite passed

## 1. Objective

Build RippleLab's personal oil-price engine. Day 10 must keep a global crude-oil scenario separate from local retail fuel, calculate direct vehicle-fuel exposure and explicit indirect effects on transport, food and utilities, show why different household exposure patterns produce different results, and return the same inspectable `SimulationResult` envelope used by the earlier scenarios.

## 2. Acceptance Criteria

- [x] Add a canonical `oil_price_change` request example.
- [x] Distinguish crude oil in USD per barrel from retail fuel in paise per litre.
- [x] Calculate direct fuel impact from entered monthly litres.
- [x] Calculate indirect transport, food and utility effects.
- [x] Keep all four transmission assumptions visible and editable.
- [x] Seed household expenses from the saved financial profile.
- [x] Add commuter, transit-renter and low-driving exposure presets.
- [x] Return impacts, sensitivity, assumptions, evidence, confidence and warnings.
- [x] Return a seven-node, nine-edge inspectable causal graph.
- [x] Add a protected Next.js proxy and FastAPI simulation endpoint.
- [x] Cover API, rising/falling oil, low-driving, validation, desktop, mobile and accessibility cases.
- [x] Update GitHub, the PDF progress record and the owner-only production deployment.

## 3. Delivered User Experience

A signed-in user opens the Oil-price simulator from the dashboard or navigation. RippleLab starts with the saved expense profile, offers three transparent exposure presets and allows every value to be edited before calculation.

```text
Current and target crude price in USD/barrel
  -> editable crude-to-retail transmission
  -> modeled retail fuel price in INR/litre
  -> direct fuel effect from monthly litres
  -> indirect transport, food and utility effects
  -> annual household total and sensitivity range
```

The output separates the target crude scenario, modeled retail fuel price, direct annual fuel effect and combined indirect effect. A driver table preserves the four household channels, while an inspectable causal graph exposes every mechanism, formula, assumption, source, lag and confidence score.

## 4. Household Exposure Design

The saved profile does not yet contain detailed fuel consumption or category ledgers. Day 10 therefore creates visible starting inputs rather than inferring hidden precision.

| Input | Starting value for seeded profile | Purpose |
| --- | --- | --- |
| Monthly fuel use | 40 litres | Direct vehicle-fuel exposure |
| Transport services | 20% of essential expenses | Non-fuel transport exposure |
| Food and groceries | 40% of essential expenses | Indirect food exposure |
| Utilities | 20% of essential expenses | Indirect household-energy exposure |
| Current retail fuel | INR 100 per litre | Editable local starting point |

The Car commuter preset retains the profile-derived starting point. Transit renter reduces direct fuel to 8 litres and transport spending to 60% of the starting allocation. Low-driving reduces direct fuel to 5 litres and transport spending to 35%. Presets update form inputs only and never overwrite the saved financial profile.

## 5. Deterministic Model

### Crude-price change

```text
crude change = (target crude - current crude) / current crude
```

Scenario formula: `scenario.oil_price_change.v1`

### Crude to retail fuel

```text
target retail price = current retail price x (1 + crude change x retail pass-through)
```

Formula version: `oil.crude_to_retail.v1`

### Direct vehicle fuel

```text
annual effect = -monthly litres x (target retail price - current retail price) x 12
```

Formula version: `oil.direct_fuel_cost.v1`

### Indirect household expense

```text
annual effect = -monthly spend x crude change x category pass-through x 12
```

Formula version: `oil.indirect_expense.v1`

The engine uses Python Decimal arithmetic and rounds money to integer paise with `ROUND_HALF_UP`. Positive values are household benefits and negative values are household costs. An LLM does not calculate money or causal totals.

## 6. Known-value Result

The seeded Bengaluru household uses a current crude scenario of USD 80 per barrel and target of USD 120 per barrel, a 50% increase. With an INR 100 retail starting price and 30% crude-to-retail pass-through, the modeled retail price is INR 115 per litre.

| Output | Verified value |
| --- | --- |
| Modeled retail fuel price | INR 115.00 per litre |
| Direct fuel annual effect | -INR 7,200.00 |
| Transport annual effect | -INR 7,920.00 |
| Food annual effect | -INR 5,280.00 |
| Utilities annual effect | -INR 3,960.00 |
| Total annual household effect | -INR 24,360.00 |

Lowering monthly fuel use from 40 litres to 5 litres, while leaving indirect expenses unchanged, changes the annual result to -INR 18,060.00. A crude decrease from USD 80 to USD 40 produces a symmetric INR 24,360.00 modeled benefit under the same assumptions.

## 7. Exposure Preset Comparison

The three presets make group differences explainable through visible inputs rather than fixed demographic labels.

| Exposure preset | Direct litres | Transport spend | Verified annual effect |
| --- | --- | --- | --- |
| Car commuter | 40 litres | INR 11,000 | -INR 24,360.00 |
| Transit renter | 8 litres | INR 6,600 | -INR 15,432.00 |
| Low-driving | 5 litres | INR 3,850 | -INR 12,912.00 |

Food and utility inputs remain constant in this comparison. The renter preset does not model rent changes; it represents low direct fuel use and public-transport exposure. This boundary is explicit so the product does not imply that housing tenure alone determines oil-price sensitivity.

## 8. Sensitivity and Confidence

The uncertainty range is a deterministic sensitivity check. The engine lowers every pass-through by 20 percentage points, recalculates the total, then raises every pass-through by 20 percentage points and recalculates again. Values are clamped between 0% and 200%.

For the seeded commuter scenario, the selected result is -INR 24,360.00. The lower-transmission result is -INR 2,400.00 and the higher-transmission result is -INR 81,960.00. The shared contract retains `p10`, `p50` and `p90` field names, but the method is `deterministic_bounds`, not a probability distribution.

Overall confidence is medium at 70/100. Household spending and fuel-use inputs are personalized and arithmetic is deterministic, while crude-to-retail and indirect consumer-price transmission remain uncertain scenario choices. Direct fuel confidence is 75/100 and indirect-channel confidence is 65/100.

## 9. Evidence

Day 10 uses primary official Indian sources:

- Petroleum Planning and Analysis Cell, [International Prices of Crude Oil (Indian Basket)](https://ppac.gov.in/prices/international-prices-of-crude-oil) - official crude-price series and unit context.
- Petroleum Planning and Analysis Cell, [Price Build Up of Petrol and Diesel](https://ppac.gov.in/retail-selling-price-rsp-of-petrol-diesel-and-domestic-lpg/price-build-up-of-petrol-and-diesel) - retail selling-price components.
- Ministry of Statistics and Programme Implementation, [Consumer Price Index frequently asked questions](https://mospi.gov.in/faq) - food, fuel and transport consumption-group context.

The sources support the economic categories and price context. They do not validate the selected pass-through values. No current crude or retail price is hard-coded as an observed fact; both are explicit user-editable scenario inputs.

## 10. Causal Graph

The engine returns seven nodes and nine edges:

```text
Indian Basket crude scenario
  -> Modeled retail fuel price -> Direct vehicle fuel effect
  -> Transport services effect
  -> Food and groceries effect
  -> Utilities effect
  -> Annual household impact
```

The crude-to-retail edge references the local retail starting price and selected transmission. The retail-to-direct edge references monthly fuel use. Each indirect edge references category spending and pass-through. Four aggregation edges retain the same source and assumption context as they flow into the annual total.

The reusable React Flow inspector now has an oil-specific layout, unit formatting and formula ledger. Nodes and arrows remain read-only, pointer- and keyboard-selectable, responsive and source-backed.

## 11. API and Contract

`POST /v1/simulations/oil-price` accepts the canonical `SimulationRequest` with `scenario.type = oil_price_change` and returns `SimulationResult` model version `1.0.0`.

The contract adds `paise_per_litre` and `litres_per_month` assumption units so USD per barrel, retail price, monthly volume and household money cannot be confused. The canonical `oil-price-request.v1.json` fixture is validated against the JSON Schema that generates TypeScript types and defines the strict Pydantic mirror.

The protected Next.js route requires a signed-in session and forwards the request to the server-only engine address. FastAPI rejects missing, incorrectly typed or out-of-range inputs with `INVALID_OIL_PRICE_ASSUMPTION`. The browser never receives the private engine address.

## 12. Test and Verification Evidence

| Check | Result |
| --- | --- |
| Economic-engine API and calculation suite | 51 passed |
| Day 10 oil-price engine tests | 6 passed |
| Python lint and formatting | Passed |
| Canonical contracts and oil-price fixture | Passed |
| Profile ownership, RLS, money and consent assertions | Passed |
| Repository secret scan | Passed |
| ESLint, generated routes and TypeScript | Passed |
| Next.js production build | Passed; oil page and API generated |
| Complete desktop and mobile browser suite | 31 passed; 9 intentional device skips |
| Oil result-state accessibility | No serious or critical violations |
| Mobile preset, graph and horizontal-overflow check | Passed |
| Sites Vinext production bundle | Passed |
| Sites production deployment | Version 6 succeeded |

The Python suite reports one dependency deprecation warning from FastAPI's Starlette test client regarding `httpx`. It does not affect the 51 passing tests.

## 13. Production Deployment

The Day 10 progress build is live at [ripplelab-progress.nayaksiddartha397.chatgpt.site](https://ripplelab-progress.nayaksiddartha397.chatgpt.site). Sites version 6 was built, saved and deployed from exact pushed commit `95fa368`. Access remains owner-only during development.

The landing page, progress page, design system and other read-only surfaces are operational. The authenticated oil-price, inflation and repo-rate simulators are complete and verified locally. Hosted account, profile and simulation execution still requires production Supabase values and a hosted FastAPI endpoint; no placeholder credentials were committed.

## 14. Important Files

- `services/economic-engine/src/ripplelab_engine/oil_price.py` and `test_oil_price.py` - deterministic direct and indirect models plus known-value, direction, exposure, validation and API coverage.
- `apps/web/src/lib/scenarios/oil-price.ts` and `oil-price-simulator.tsx` - profile-derived request, presets, editable form, outputs and channel drivers.
- `apps/web/src/app/api/simulations/oil-price/route.ts` - authenticated server-to-engine boundary.
- `causal-graph-explorer.tsx` and `oil-price.spec.ts` - reusable graph presentation plus desktop, mobile and accessibility checks.
- `oil-price-request.v1.json` and `simulation-contract.schema.json` - canonical fixture and explicit unit vocabulary.
- `apps/web/public/og-day10.png` - verified Day 10 social-preview card.

The social card was generated once with the built-in image tool from an exact-text fintech editorial brief. The inspected 1536 x 1024 PNG contains the requested wording without extra text.

## 15. Decisions and Limitations

- Keep crude oil and retail fuel as separate inputs; do not pretend the latter moves one-for-one.
- Treat pass-through as editable sensitivity, not an economic forecast.
- Annualize the entered monthly exposure without predicting household behavior changes.
- Exclude exchange-rate, tax, dealer-margin and product-mix calculations in v1.
- Exclude rent changes from the transit-renter preset.
- Do not model fuel substitution, reduced driving or public-policy responses.
- Keep sensitivity deterministic; Monte Carlo remains a later checkpoint.
- Continue treating results as educational simulations rather than financial advice.

No code blocker remains for Day 10.

## 16. Day 11 Handoff

Day 11 should add the income-tax engine. It should model deterministic changes to annual tax and monthly take-home pay under explicit effective-rate or slab assumptions, preserve India-specific units and evidence, compare several income bands, and return the shared result and causal-graph envelope.

**Sign-off:** Prepared by Codex | Evidence reviewed: Yes | Ready to continue: Yes
