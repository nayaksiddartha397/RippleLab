export const employmentStatuses = [
  "student",
  "salaried",
  "self_employed",
  "business_owner",
  "retired",
  "not_employed",
] as const;

export const housingStatuses = [
  "renter",
  "homeowner_with_mortgage",
  "homeowner_outright",
  "family_home",
] as const;

export const primaryGoals = [
  "emergency_fund",
  "home_purchase",
  "education",
  "retirement",
  "debt_repayment",
  "wealth_building",
] as const;

export type EmploymentStatus = (typeof employmentStatuses)[number];
export type HousingStatus = (typeof housingStatuses)[number];
export type PrimaryGoal = (typeof primaryGoals)[number];

export type FinancialProfile = {
  age: number;
  cashSavingsPaise: number;
  city: string;
  employmentStatus: EmploymentStatus;
  equityInvestmentsPaise: number;
  fixedDepositsPaise: number;
  goalHorizonYears: number;
  goalTargetPaise: number;
  homeValuePaise: number;
  householdSize: number;
  housingStatus: HousingStatus;
  monthlyDiscretionaryExpensesPaise: number;
  monthlyEmiPaise: number;
  monthlyEssentialExpensesPaise: number;
  monthlyOtherIncomePaise: number;
  monthlyRentPaise: number;
  monthlyTakeHomePaise: number;
  otherInvestmentsPaise: number;
  outstandingHomeLoanPaise: number;
  outstandingOtherLoansPaise: number;
  primaryGoal: PrimaryGoal;
  updatedAt: string;
  weightedLoanRateBps: number;
};

export type FinancialProfileDraft = Omit<FinancialProfile, "updatedAt">;

export type ProfileActionState = {
  fieldErrors?: Record<string, string[]>;
  message?: string;
  status: "idle" | "error" | "success";
};

export const initialProfileActionState: ProfileActionState = { status: "idle" };
