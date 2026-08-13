# Financial profile data model

## Purpose

RippleLab stores one private economic digital-twin profile per authenticated account. The profile is the stable input to future deterministic scenarios; it is not an investment recommendation, credit assessment or authoritative record of wealth.

## Profile sections

| Section | Fields |
| --- | --- |
| About the household | Age, city, household size, employment status |
| Monthly cash flow | Take-home income, other income, essential expenses, discretionary expenses |
| Savings and investments | Cash, fixed deposits, equities/mutual funds, other investments |
| Housing and debt | Housing status, rent, home value, home loan, other loans, EMI, weighted loan rate |
| Goal | Primary goal, target amount, horizon, usage consent |

The interface accepts Indian rupees and annual percentages. Server-side validation is authoritative even when browser validation has already run.

## Numeric storage contract

- Money is converted to integer paise before persistence. For example, `₹1,234.56` is stored as `123456`.
- Annual percentage rates are converted to integer basis points. For example, `8.65%` is stored as `865`.
- No profile money value may be negative or exceed ₹1 billion in the Day 4 model.
- Loan rates range from 0 to 100%, ages from 18 to 100, household size from 1 to 20 and goal horizon from 1 to 60 years.
- Integer units avoid binary floating-point rounding inside later scenario calculations.

## Ownership and access

`financial_profiles.user_id` is both the primary key and a foreign key to `auth.users.id`. Deleting an auth user cascades to the profile.

PostgreSQL row-level security is enabled and forced. Four explicit policies limit select, insert, update and delete operations to rows where `auth.uid() = user_id`. The anonymous role has no table privileges; authenticated users receive only CRUD privileges. Server Actions authenticate the user again before saving and never accept a user ID from the browser.

The profile page and dashboard are dynamic protected routes so private values are not statically rendered or shared between accounts.

## Consent and product boundary

The user must confirm that the values will personalize educational simulations and that results are estimates, not financial advice. Consent is stored as a required true value. This records product acknowledgement only; it is not a substitute for a future privacy-policy acceptance record.

Shareable scenarios and reports must remain private by default and must not expose raw profile fields without explicit inclusion. Those controls are scheduled later in the MVP plan.

## Validation and verification

`pnpm check:profile-schema` inspects the migration for ownership, all four RLS operations, authenticated ownership predicates, numeric units and consent. The browser suite verifies protected access, invalid negative rupee and above-limit percentage handling, creation, reload persistence, editing, dashboard projection, mobile navigation and automated WCAG checks.

The test-only persistence adapter uses an isolated HTTP-only local cookie for Playwright execution and is hard-disabled when `NODE_ENV=production`. It contains fixture data only; hosted profile data remains in Supabase.
