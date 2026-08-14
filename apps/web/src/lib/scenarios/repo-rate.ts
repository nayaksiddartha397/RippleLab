import type { SimulationRequest } from "@ripplelab/contracts/simulation";

import type { FinancialProfile } from "@/lib/profile/types";

export type RepoRateFormValues = {
  currentDepositRateBps: number;
  currentRepoRateBps: number;
  depositPassThroughPercent: number;
  horizonMonths: number;
  loanPassThroughPercent: number;
  remainingLoanTermMonths: number;
  repoRateChangeBps: number;
};

export function buildRepoRateRequest({
  profile,
  profileId,
  requestId,
  values,
}: {
  profile: FinancialProfile;
  profileId: string;
  requestId: string;
  values: RepoRateFormValues;
}): SimulationRequest {
  const citationId = "rbi-monetary-policy-framework";

  return {
    schemaVersion: "1.0.0",
    requestId,
    country: "IN",
    currency: "INR",
    scenario: {
      type: "repo_rate_change",
      currentRateBps: values.currentRepoRateBps,
      change: { value: values.repoRateChangeBps, unit: "basis_points" },
      horizonMonths: values.horizonMonths,
    },
    profile: {
      profileId,
      capturedAt: profile.updatedAt,
      age: profile.age,
      city: profile.city,
      employmentStatus: profile.employmentStatus,
      housingStatus: profile.housingStatus,
      monthlyTakeHomePaise: profile.monthlyTakeHomePaise,
      monthlyOtherIncomePaise: profile.monthlyOtherIncomePaise,
      monthlyEssentialExpensesPaise: profile.monthlyEssentialExpensesPaise,
      monthlyDiscretionaryExpensesPaise: profile.monthlyDiscretionaryExpensesPaise,
      cashSavingsPaise: profile.cashSavingsPaise,
      fixedDepositsPaise: profile.fixedDepositsPaise,
      equityInvestmentsPaise: profile.equityInvestmentsPaise,
      monthlyRentPaise: profile.monthlyRentPaise,
      homeValuePaise: profile.homeValuePaise,
      outstandingHomeLoanPaise: profile.outstandingHomeLoanPaise,
      outstandingOtherLoansPaise: profile.outstandingOtherLoansPaise,
      monthlyEmiPaise: profile.monthlyEmiPaise,
      weightedLoanRateBps: profile.weightedLoanRateBps,
    },
    assumptions: [
      {
        id: "loanPassThrough",
        label: "Loan-rate pass-through",
        value: values.loanPassThroughPercent / 100,
        unit: "ratio",
        rationale:
          "Selected share of the policy-rate change reaching the floating home-loan rate.",
        editable: true,
        citationIds: [citationId],
      },
      {
        id: "depositPassThrough",
        label: "Deposit-rate pass-through",
        value: values.depositPassThroughPercent / 100,
        unit: "ratio",
        rationale:
          "Selected share of the policy-rate change reaching new or renewing deposit rates.",
        editable: true,
        citationIds: [citationId],
      },
      {
        id: "remainingLoanTermMonths",
        label: "Remaining home-loan term",
        value: values.remainingLoanTermMonths,
        unit: "months",
        rationale: "The saved profile does not yet store the contractual remaining loan term.",
        editable: true,
        citationIds: [],
      },
      {
        id: "currentDepositRateBps",
        label: "Current fixed-deposit rate",
        value: values.currentDepositRateBps,
        unit: "basis_points",
        rationale: "The saved profile stores the deposit balance but not its annual rate.",
        editable: true,
        citationIds: [],
      },
    ],
    evidence: [
      {
        id: citationId,
        title: "Monetary Policy Framework",
        publisher: "Reserve Bank of India",
        sourceType: "central_bank",
        url: "https://www.rbi.org.in/",
        accessedAt: new Date().toISOString(),
        locator: "Policy repo rate and monetary transmission context",
      },
    ],
  };
}
