# Personal Inflation Engine v1

## Purpose

Day 9 translates a headline CPI path into a personal household expense result. It compares a current inflation rate with a selected target rate, applies explicit category pass-through assumptions to an editable five-part monthly basket and keeps three distinct outputs visible:

1. annualized expense impact versus the current inflation path;
2. salary purchasing-power growth at the target personal inflation rate;
3. real portfolio return at the target personal inflation rate.

The headline result includes only the first item. Salary and portfolio results are diagnostics because adding stock-value and income-purchasing-power measures to an expense delta would create a misleading total.

## Evidence boundary

The model uses the Ministry of Statistics and Programme Implementation's CPI methodology as evidence that consumer inflation is constructed from expenditure-weighted price indices. RippleLab does not copy the national CPI weights into a user's result. It uses the user's own entered monthly amounts as the weights.

- MoSPI, [National Metadata Structure for Consumer Price Index](https://www.mospi.gov.in/sites/default/files/CPI/National_Metadata_Structure_for_CPI.pdf)
- Reserve Bank of India, [Monetary Policy Framework](https://www.rbi.org.in/commonperson/English/Scripts/speeches.aspx?Id=3161)

Headline CPI is context rather than a claim that every household experiences the same price change. Category pass-through values remain visible, editable assumptions.

## Personal basket

The profile contains essential expenses, discretionary expenses and rent, but not a full consumption taxonomy. The frontend creates a transparent starting allocation:

| Category | Initial amount |
| --- | --- |
| Food and groceries | 40% of essential expenses |
| Transport | 20% of essential expenses |
| Utilities | 20% of essential expenses |
| Housing | Saved monthly rent |
| Other spending | Remaining essential expenses plus discretionary expenses |

The user can change every amount before calculation. EMI is excluded because it is a financial payment rather than consumption expenditure and already belongs to the repo-rate model.

## Deterministic formulas

### Category price path

```text
category inflation = headline inflation x category pass-through
projected monthly spend = current monthly spend x (1 + category inflation x months / 12)
```

Formula version: `inflation.category_projection.v1`

Both the current and target inflation rates follow this path. The category's annualized scenario impact is:

```text
annual impact = -(target projected monthly spend - baseline projected monthly spend) x 12
```

A negative value is additional expense pressure; a positive value is relief.

### Personal basket inflation

```text
personal rate = sum(category monthly spend x category inflation) / total monthly spend
```

Formula version: `inflation.personal_basket.v1`

### Real growth

```text
real growth = (1 + nominal growth) / (1 + personal inflation) - 1
```

Formula version: `inflation.real_growth.v1`

The salary diagnostic applies real salary growth to annual take-home and other income. The portfolio diagnostic applies real return to cash savings, fixed deposits and equity investments. Other investments are excluded because the shared v1 profile snapshot does not yet carry them across the simulation boundary.

## Sensitivity range

The displayed range is deterministic. The engine shifts every category pass-through by minus 20 and plus 20 percentage points, clamps each value between 0% and 200%, recalculates the expense result and orders the two bounds numerically.

The labels `p10`, `p50` and `p90` are part of the shared result contract. For Day 9 their method is `deterministic_bounds`; they are not percentiles from a probability distribution.

## Causal graph

The FastAPI result returns ten nodes and thirteen links:

```text
Target headline CPI
  -> five category price rates
  -> personal basket inflation
  -> projected expenses
  -> real salary growth
  -> real portfolio return
```

Every edge references its relevant spend or pass-through assumption, evidence identifiers, mechanism, lag and confidence. React Flow renders this returned graph and does not recalculate the economic result.

## Known-value fixture

The seeded salaried Bengaluru profile has an ₹80,000 monthly basket. With current inflation of 4%, target inflation of 6% and category pass-through of 100% food, 120% transport, 80% utilities and 70% other spending:

- personal target basket inflation is 5.19%;
- target projected monthly basket is ₹84,152;
- annual impact versus the current inflation path is -₹16,608;
- 5% nominal salary growth becomes approximately -0.18% real growth;
- 7% nominal portfolio return becomes approximately 1.72% real return.

All money is calculated as integer paise with `ROUND_HALF_UP`. Rates cross interfaces as explicit percentage points, percentages, ratios or basis points according to the canonical contract.

## Exclusions

The first version does not model substitution between products, city-level observed price indices, taxes, policy reactions, interest-rate changes, portfolio composition changes or behavioral reductions in spending. It is an educational scenario model, not a forecast or financial recommendation.
