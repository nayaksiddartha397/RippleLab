import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationUrl = new URL(
  "../supabase/migrations/202608130001_create_financial_profiles.sql",
  import.meta.url,
);
const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

for (const required of [
  "create table public.financial_profiles",
  "user_id uuid primary key references auth.users(id) on delete cascade",
  "enable row level security",
  "force row level security",
  "revoke all on table public.financial_profiles from anon",
  "for select",
  "for insert",
  "for update",
  "for delete",
  "auth.uid()) = user_id",
  "monthly_take_home_paise bigint",
  "weighted_loan_rate_bps integer",
  "check (consent_confirmed)",
]) {
  assert.ok(sql.includes(required), `profile migration is missing: ${required}`);
}

console.log("profile migration: ownership, RLS, money and consent checks are present");
