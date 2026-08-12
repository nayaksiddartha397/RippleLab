# RippleLab MVP Product Contract

## Problem

Economic news is usually described at the national or market level. People struggle to translate an event such as a repo-rate change or higher oil price into changes in their own cash flow, purchasing power and financial goals.

## Promise

RippleLab turns one supported economic what-if question and a user-controlled financial profile into a transparent personal impact simulation. It shows the causal chain, calculated ranges, assumptions, evidence and confidence behind the result.

## Primary user

An India-based adult who understands their monthly finances but does not need to understand economic modeling. The MVP must also support demonstrations through transparent sample personas without requiring real personal data.

## Supported scenarios

1. Inflation increase
2. RBI repo-rate change
3. Oil-price increase
4. Income-tax change
5. Job loss or salary change

Questions outside these templates must be explicitly marked unsupported or converted only after the user confirms the structured inputs.

## MVP capabilities

- Private financial profile
- Natural-language input with structured confirmation
- Deterministic personal-impact calculations
- Interactive causal graph
- Scenario and persona comparison
- Assumption-driven Monte Carlo ranges
- Evidence and confidence inspection
- Saved scenarios and privacy-safe reporting

## Non-goals

- Financial, tax, lending, legal or investment advice
- Prediction of RBI decisions, security prices or employment events
- Account aggregation, trading or credit decisions
- Complete treatment of every India tax and policy edge case
- Arbitrary economic models or non-India policy regimes

## Trust requirements

- Every user-visible number originates from versioned deterministic code.
- Inputs, units, formulas, assumptions and rounding are inspectable.
- Observed data, user inputs, assumptions and simulated results are visually distinguished.
- Confidence describes evidence/model quality; it is not a probability that the future will occur.
- Sensitive profile data is private and excluded from shared outputs by default.

## Success criteria for v0.1.0

A user can save a profile, run each of the five scenarios, inspect the cause-and-effect path, compare outcomes, understand uncertainty, verify the evidence and export a redacted report. Critical journeys pass CI and production smoke tests.

## Required disclaimer

> RippleLab is an educational simulation tool, not investment, tax, lending or legal advice. Results are estimates based on the inputs, assumptions, model version and evidence displayed with each scenario. Actual outcomes may differ materially.
