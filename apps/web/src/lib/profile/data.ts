import "server-only";

import type { FinancialProfile, FinancialProfileDraft } from "@/lib/profile/types";
import { getTestProfile, saveTestProfile } from "@/lib/profile/test-profile";
import { isAuthTestMode } from "@/lib/auth/test-mode";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  age: number;
  cash_savings_paise: number;
  city: string;
  employment_status: FinancialProfile["employmentStatus"];
  equity_investments_paise: number;
  fixed_deposits_paise: number;
  goal_horizon_years: number;
  goal_target_paise: number;
  home_value_paise: number;
  household_size: number;
  housing_status: FinancialProfile["housingStatus"];
  monthly_discretionary_expenses_paise: number;
  monthly_emi_paise: number;
  monthly_essential_expenses_paise: number;
  monthly_other_income_paise: number;
  monthly_rent_paise: number;
  monthly_take_home_paise: number;
  other_investments_paise: number;
  outstanding_home_loan_paise: number;
  outstanding_other_loans_paise: number;
  primary_goal: FinancialProfile["primaryGoal"];
  updated_at: string;
  weighted_loan_rate_bps: number;
};

function toProfile(row: ProfileRow): FinancialProfile {
  return {
    age: row.age,
    cashSavingsPaise: row.cash_savings_paise,
    city: row.city,
    employmentStatus: row.employment_status,
    equityInvestmentsPaise: row.equity_investments_paise,
    fixedDepositsPaise: row.fixed_deposits_paise,
    goalHorizonYears: row.goal_horizon_years,
    goalTargetPaise: row.goal_target_paise,
    homeValuePaise: row.home_value_paise,
    householdSize: row.household_size,
    housingStatus: row.housing_status,
    monthlyDiscretionaryExpensesPaise: row.monthly_discretionary_expenses_paise,
    monthlyEmiPaise: row.monthly_emi_paise,
    monthlyEssentialExpensesPaise: row.monthly_essential_expenses_paise,
    monthlyOtherIncomePaise: row.monthly_other_income_paise,
    monthlyRentPaise: row.monthly_rent_paise,
    monthlyTakeHomePaise: row.monthly_take_home_paise,
    otherInvestmentsPaise: row.other_investments_paise,
    outstandingHomeLoanPaise: row.outstanding_home_loan_paise,
    outstandingOtherLoansPaise: row.outstanding_other_loans_paise,
    primaryGoal: row.primary_goal,
    updatedAt: row.updated_at,
    weightedLoanRateBps: row.weighted_loan_rate_bps,
  };
}

function toRow(userId: string, profile: FinancialProfileDraft) {
  return {
    age: profile.age,
    cash_savings_paise: profile.cashSavingsPaise,
    city: profile.city,
    consent_confirmed: true,
    employment_status: profile.employmentStatus,
    equity_investments_paise: profile.equityInvestmentsPaise,
    fixed_deposits_paise: profile.fixedDepositsPaise,
    goal_horizon_years: profile.goalHorizonYears,
    goal_target_paise: profile.goalTargetPaise,
    home_value_paise: profile.homeValuePaise,
    household_size: profile.householdSize,
    housing_status: profile.housingStatus,
    monthly_discretionary_expenses_paise: profile.monthlyDiscretionaryExpensesPaise,
    monthly_emi_paise: profile.monthlyEmiPaise,
    monthly_essential_expenses_paise: profile.monthlyEssentialExpensesPaise,
    monthly_other_income_paise: profile.monthlyOtherIncomePaise,
    monthly_rent_paise: profile.monthlyRentPaise,
    monthly_take_home_paise: profile.monthlyTakeHomePaise,
    other_investments_paise: profile.otherInvestmentsPaise,
    outstanding_home_loan_paise: profile.outstandingHomeLoanPaise,
    outstanding_other_loans_paise: profile.outstandingOtherLoansPaise,
    primary_goal: profile.primaryGoal,
    user_id: userId,
    weighted_loan_rate_bps: profile.weightedLoanRateBps,
  };
}

export async function getFinancialProfile(userId: string): Promise<FinancialProfile | null> {
  if (isAuthTestMode()) return getTestProfile();
  if (!getSupabasePublicConfig()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  if (error) throw new Error("Financial profile could not be loaded.");
  return data ? toProfile(data) : null;
}

export async function saveFinancialProfile(userId: string, profile: FinancialProfileDraft) {
  if (isAuthTestMode()) return saveTestProfile(profile);
  if (!getSupabasePublicConfig()) throw new Error("Supabase is not configured.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_profiles")
    .upsert(toRow(userId, profile), { onConflict: "user_id" })
    .select("*")
    .single<ProfileRow>();

  if (error) throw new Error("Financial profile could not be saved.");
  return toProfile(data);
}
