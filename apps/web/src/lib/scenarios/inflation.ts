import type { SimulationRequest } from "@ripplelab/contracts/simulation";

import type { FinancialProfile } from "@/lib/profile/types";

export type InflationBasket = {
  foodSpendPaise: number;
  housingSpendPaise: number;
  otherSpendPaise: number;
  transportSpendPaise: number;
  utilitiesSpendPaise: number;
};

export type InflationFormValues = InflationBasket & {
  currentInflationPercent: number;
  foodPassThroughPercent: number;
  horizonMonths: number;
  housingPassThroughPercent: number;
  inflationChangePercentagePoints: number;
  otherPassThroughPercent: number;
  portfolioReturnBps: number;
  salaryGrowthBps: number;
  transportPassThroughPercent: number;
  utilitiesPassThroughPercent: number;
};

export function deriveInflationBasket(profile: FinancialProfile): InflationBasket {
  const foodSpendPaise = Math.round(profile.monthlyEssentialExpensesPaise * 0.4);
  const transportSpendPaise = Math.round(profile.monthlyEssentialExpensesPaise * 0.2);
  const utilitiesSpendPaise = Math.round(profile.monthlyEssentialExpensesPaise * 0.2);
  const otherSpendPaise =
    profile.monthlyEssentialExpensesPaise -
    foodSpendPaise -
    transportSpendPaise -
    utilitiesSpendPaise +
    profile.monthlyDiscretionaryExpensesPaise;

  return {
    foodSpendPaise,
    housingSpendPaise: profile.monthlyRentPaise,
    otherSpendPaise,
    transportSpendPaise,
    utilitiesSpendPaise,
  };
}

export function buildInflationRequest({
  profile,
  profileId,
  requestId,
  values,
}: {
  profile: FinancialProfile;
  profileId: string;
  requestId: string;
  values: InflationFormValues;
}): SimulationRequest {
  const methodologyCitationId = "mospi-cpi-methodology";
  const targetCitationId = "rbi-inflation-target-framework";
  const assumption = (
    id: string,
    label: string,
    value: number,
    unit: "basis_points" | "paise" | "ratio",
    rationale: string,
    citationIds: string[] = [],
  ) => ({ id, label, value, unit, rationale, editable: true, citationIds });

  return {
    schemaVersion: "1.0.0",
    requestId,
    country: "IN",
    currency: "INR",
    scenario: {
      type: "inflation_change",
      currentInflationPercent: values.currentInflationPercent,
      change: {
        value: values.inflationChangePercentagePoints,
        unit: "percentage_points",
      },
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
      assumption("foodSpendPaise", "Food and groceries spend", values.foodSpendPaise, "paise", "Editable monthly amount allocated from the saved expense profile."),
      assumption("foodPassThrough", "Food price pass-through", values.foodPassThroughPercent / 100, "ratio", "Selected share of headline inflation applied to this category.", [methodologyCitationId]),
      assumption("housingSpendPaise", "Housing spend", values.housingSpendPaise, "paise", "Monthly rent from the profile; ownership costs are not inferred."),
      assumption("housingPassThrough", "Housing price pass-through", values.housingPassThroughPercent / 100, "ratio", "Selected share of headline inflation applied to this category.", [methodologyCitationId]),
      assumption("transportSpendPaise", "Transport spend", values.transportSpendPaise, "paise", "Editable monthly amount allocated from the saved expense profile."),
      assumption("transportPassThrough", "Transport price pass-through", values.transportPassThroughPercent / 100, "ratio", "Selected share of headline inflation applied to this category.", [methodologyCitationId]),
      assumption("utilitiesSpendPaise", "Utilities spend", values.utilitiesSpendPaise, "paise", "Editable monthly amount allocated from the saved expense profile."),
      assumption("utilitiesPassThrough", "Utilities price pass-through", values.utilitiesPassThroughPercent / 100, "ratio", "Selected share of headline inflation applied to this category.", [methodologyCitationId]),
      assumption("otherSpendPaise", "Other household spend", values.otherSpendPaise, "paise", "Remaining essential and discretionary expenses from the saved profile."),
      assumption("otherPassThrough", "Other price pass-through", values.otherPassThroughPercent / 100, "ratio", "Selected share of headline inflation applied to this category.", [methodologyCitationId]),
      assumption("salaryGrowthBps", "Expected salary growth", values.salaryGrowthBps, "basis_points", "Editable nominal salary-growth assumption for the selected horizon."),
      assumption("portfolioReturnBps", "Expected nominal portfolio return", values.portfolioReturnBps, "basis_points", "Editable nominal return applied to cash, fixed deposits and equity balances."),
    ],
    evidence: [
      {
        id: methodologyCitationId,
        title: "National Metadata Structure for Consumer Price Index",
        publisher: "Ministry of Statistics and Programme Implementation",
        sourceType: "methodology",
        url: "https://www.mospi.gov.in/sites/default/files/CPI/National_Metadata_Structure_for_CPI.pdf",
        accessedAt: new Date().toISOString(),
        locator: "CPI basket and expenditure-weight methodology",
      },
      {
        id: targetCitationId,
        title: "Monetary Policy Framework",
        publisher: "Reserve Bank of India",
        sourceType: "central_bank",
        url: "https://www.rbi.org.in/commonperson/English/Scripts/speeches.aspx?Id=3161",
        accessedAt: new Date().toISOString(),
        locator: "Headline CPI inflation target and tolerance-band context",
      },
    ],
  };
}
