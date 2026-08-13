# RippleLab Day 04 Progress Report

**Day:** 04 of 30  
**Date:** 2026-08-13  
**Status:** Complete  
**Branch:** `codex/day-04-profile`  
**Implementation commit:** `938c2e4`  
**Quality gate:** Full local suite passed

## 1. Objective

Build the first usable economic digital twin: a private, validated and editable personal financial profile that future deterministic scenarios can consume without asking an LLM to calculate money.

## 2. Acceptance Criteria

- [x] A signed-in user can create a profile across demographics, income, expenses, savings, investments, housing, loans and goals.
- [x] The same user can reload and edit the saved profile.
- [x] Rupee values reject negatives and enforce the supported upper bound.
- [x] Percentage rates reject values outside 0 to 100%.
- [x] Profile persistence stores exact integer paise and basis points.
- [x] Every profile mutation authenticates the user on the server.
- [x] PostgreSQL row-level security isolates rows by authenticated user ID for select, insert, update and delete.
- [x] Profile routes, mobile navigation and editor accessibility are browser-tested.
- [x] Saved values produce transparent dashboard cash-flow, debt and savings-buffer snapshots.

## 3. Completed Work

RippleLab now includes a five-step financial-profile editor. It captures household context, monthly cash flow, savings and investments, housing and debt exposure, plus a primary goal and explicit educational-use acknowledgement.

The profile route is protected at the request boundary and verifies the user again during server rendering and every save. A returning user receives saved defaults, a last-updated timestamp and a compact profile summary. The dashboard reads the same server-side profile and displays three transparent derived indicators.

The responsive stepper prevents a new user from jumping past unfinished steps while allowing a returning user to move directly to any section for editing. Browser-native validation provides immediate feedback, and the Server Action repeats validation as the authoritative boundary.

## 4. Technical Implementation

- Added a dynamic `/profile` route with a React 19 `useActionState` Server Action workflow.
- Added shared Zod validation for age, city, household size, enums, rupee inputs, annual rate, goal horizon and consent.
- Added a server-only data-access layer mapping camel-case application values to PostgreSQL columns.
- Added a Supabase migration for one profile per auth user, timestamp maintenance and constrained value domains.
- Added forced row-level security and four explicit ownership policies.
- Added a test-only HTTP-only cookie persistence adapter for deterministic local browser tests; it is disabled in production.
- Added profile navigation, responsive styling, loading state, privacy guidance and dashboard integration.
- Added a migration-policy assertion to the root quality command.

## 5. Data and Calculations

| Value | Browser unit | Stored unit | Example |
| --- | --- | --- | --- |
| Money | Indian rupees | Integer paise | INR 1,234.56 becomes 123456 |
| Annual interest | Percent | Integer basis points | 8.65% becomes 865 |
| Age | Whole years | Small integer | 29 becomes 29 |
| Goal horizon | Whole years | Small integer | 8 becomes 8 |

The Day 4 dashboard uses three deterministic summaries only:

- Monthly cash flow = take-home income + other income - essential expenses - discretionary expenses - rent - EMI.
- Outstanding debt = home-loan balance + other-loan balance.
- Savings buffer = cash savings / monthly essential expenses, when essential expenses are greater than zero.

No market return, inflation, policy transmission or forecasting assumption is introduced on Day 4.

## 6. Security and Privacy Model

`financial_profiles.user_id` is the primary key and references `auth.users.id` with cascade deletion. RLS is enabled and forced. Each CRUD policy checks `(select auth.uid()) = user_id`, the anonymous role has no table privileges, and the client never supplies the owning user ID.

The Server Action calls the trusted session helper for each save, validates the complete payload and writes only the authenticated user's row. Protected pages are request-time rendered. Provider/database errors return a generic message so internal details are not exposed.

Consent copy states that the profile personalizes educational estimates and does not create financial advice. Future sharing features must continue to omit raw profile data by default.

## 7. Verification Evidence

| Check | Method | Result |
| --- | --- | --- |
| Shared schema | Contract validator | Passed |
| Profile migration | Ownership, forced RLS, four policies, units and consent assertions | Passed |
| Web quality | ESLint and TypeScript | Passed |
| Production build | Next.js 16.3 webpack build | Passed; dynamic profile and dashboard emitted |
| Browser suite | Desktop and mobile Chromium | 17 passed; 3 intentional duplicate-device skips |
| Profile lifecycle | Protected redirect, create, reload, edit, reload and dashboard projection | Passed |
| Numeric validation | Negative rupee value and 101% rate rejected before progression | Passed |
| Accessibility | axe-core WCAG A/AA checks on profile editor, desktop and mobile | No serious or critical violations |
| Responsive navigation | Mobile profile navigation | Passed |
| API quality | Ruff format/lint and pytest | Passed; 2 tests |
| Secret scan | Repository scan | Passed |
| Git whitespace | `git diff --check` | Passed |
| Full quality gate | `pnpm check` | Passed |
| Visual review | Authenticated desktop profile page in in-app browser | Passed |

## 8. Important Files

- `supabase/migrations/202608130001_create_financial_profiles.sql` - schema, constraints, trigger, grants and RLS policies.
- `apps/web/src/app/profile` - protected page, loading state and save action.
- `apps/web/src/components/profile/profile-wizard.tsx` - responsive five-step editor.
- `apps/web/src/lib/profile` - types, conversion helpers, validation and server-only persistence.
- `apps/web/src/components/dashboard-preview.tsx` - saved profile summaries.
- `apps/web/tests/profile.spec.ts` - authentication, lifecycle, validation, accessibility and mobile coverage.
- `scripts/check-profile-migration.mjs` - deterministic schema security assertion.
- `docs/PROFILE_DATA_MODEL.md` - field, precision, ownership and consent contract.

## 9. Visual Review

The authenticated profile page was inspected in the in-app browser. The desktop layout presents a primary editor beside a sticky privacy and profile-status rail. Step controls, inputs, helper text and actions are readable, aligned and consistent with the established Day 2 visual system. The automated mobile project additionally verified navigation access and found no serious or critical accessibility issues.

## 10. Decisions

- Store financial values in paise and rates in basis points to avoid binary floating-point persistence errors.
- Keep one active profile per account for the MVP; the primary key makes overwrite semantics explicit.
- Use Server Actions for mutations and a server-only data layer for database access.
- Enforce ownership in PostgreSQL even though route and Server Action authentication also exist.
- Allow zero for non-applicable financial fields so renters, students and debt-free users can all use the same schema.
- Keep derived dashboard values simple and fully explainable until scenario engines arrive.

## 11. Risks and Blockers

A hosted Supabase project has not been supplied. The migration and all policies are implemented and statically asserted, but live database application and multi-account RLS integration require a configured project. Run `supabase db push` after linking the intended project.

The local persistence adapter is fixture-only and deliberately not a substitute for database testing. Day 24 includes deeper row-level security and privacy tests against the hosted environment.

No code blocker remains for Day 4.

## 12. GitHub Publication

- Implementation commit: `938c2e4 feat(profile): build personal financial profile`
- Report commit: included in the Day 4 branch after PDF verification
- Remote branch: `codex/day-04-profile`
- Pull request: Not requested
- Remote workflow: Status to be evaluated after push

## 13. Next Day

Day 5 will define versioned scenario, causal-link, evidence and simulation-result contracts so the Next.js application and FastAPI engine share exact inputs, units, assumptions, confidence fields and source metadata.

## Sign-off

**Prepared by:** Codex  
**Evidence reviewed:** Yes  
**Ready to continue:** Yes, with a linked Supabase project required for live migration/RLS verification
