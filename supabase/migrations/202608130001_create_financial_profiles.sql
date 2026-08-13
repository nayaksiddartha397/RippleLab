create table public.financial_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age smallint not null check (age between 18 and 100),
  city text not null check (char_length(city) between 2 and 80),
  household_size smallint not null check (household_size between 1 and 20),
  employment_status text not null check (
    employment_status in ('student', 'salaried', 'self_employed', 'business_owner', 'retired', 'not_employed')
  ),
  monthly_take_home_paise bigint not null default 0 check (monthly_take_home_paise between 0 and 100000000000),
  monthly_other_income_paise bigint not null default 0 check (monthly_other_income_paise between 0 and 100000000000),
  monthly_essential_expenses_paise bigint not null default 0 check (monthly_essential_expenses_paise between 0 and 100000000000),
  monthly_discretionary_expenses_paise bigint not null default 0 check (monthly_discretionary_expenses_paise between 0 and 100000000000),
  cash_savings_paise bigint not null default 0 check (cash_savings_paise between 0 and 100000000000),
  fixed_deposits_paise bigint not null default 0 check (fixed_deposits_paise between 0 and 100000000000),
  equity_investments_paise bigint not null default 0 check (equity_investments_paise between 0 and 100000000000),
  other_investments_paise bigint not null default 0 check (other_investments_paise between 0 and 100000000000),
  housing_status text not null check (
    housing_status in ('renter', 'homeowner_with_mortgage', 'homeowner_outright', 'family_home')
  ),
  monthly_rent_paise bigint not null default 0 check (monthly_rent_paise between 0 and 100000000000),
  home_value_paise bigint not null default 0 check (home_value_paise between 0 and 100000000000),
  outstanding_home_loan_paise bigint not null default 0 check (outstanding_home_loan_paise between 0 and 100000000000),
  outstanding_other_loans_paise bigint not null default 0 check (outstanding_other_loans_paise between 0 and 100000000000),
  monthly_emi_paise bigint not null default 0 check (monthly_emi_paise between 0 and 100000000000),
  weighted_loan_rate_bps integer not null default 0 check (weighted_loan_rate_bps between 0 and 10000),
  primary_goal text not null check (
    primary_goal in ('emergency_fund', 'home_purchase', 'education', 'retirement', 'debt_repayment', 'wealth_building')
  ),
  goal_target_paise bigint not null default 0 check (goal_target_paise between 0 and 100000000000),
  goal_horizon_years smallint not null check (goal_horizon_years between 1 and 60),
  consent_confirmed boolean not null default false check (consent_confirmed),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.financial_profiles is
  'One private economic digital-twin profile per authenticated RippleLab user.';
comment on column public.financial_profiles.monthly_take_home_paise is
  'Money is stored as integer paise to avoid floating-point rounding.';
comment on column public.financial_profiles.weighted_loan_rate_bps is
  'Annual percentage rate stored in basis points; 850 means 8.50 percent.';

alter table public.financial_profiles enable row level security;
alter table public.financial_profiles force row level security;

revoke all on table public.financial_profiles from anon;
grant select, insert, update, delete on table public.financial_profiles to authenticated;

create policy "Users can read their own financial profile"
  on public.financial_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own financial profile"
  on public.financial_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own financial profile"
  on public.financial_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own financial profile"
  on public.financial_profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create function public.set_financial_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger financial_profiles_set_updated_at
before update on public.financial_profiles
for each row execute function public.set_financial_profile_updated_at();
