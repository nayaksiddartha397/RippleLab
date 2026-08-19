import type { SimulationRequest } from "@ripplelab/contracts/simulation";

import type { FinancialProfile } from "@/lib/profile/types";

export type IncomeTaxFormValues = {
  annualSalaryPaise: number;
  cessRatePercent: number;
  horizonMonths: number;
  otherTaxableIncomePaise: number;
  rateChangePercentagePoints: number;
  rebateMaximumPaise: number;
  rebateThresholdPaise: number;
  residentEligibleForRebate: boolean;
  standardDeductionPaise: number;
};

export function profileIncomeTaxInputs(profile: FinancialProfile) {
  return {
    annualSalaryPaise: profile.monthlyTakeHomePaise * 12,
    otherTaxableIncomePaise: profile.monthlyOtherIncomePaise * 12,
  };
}

export function buildIncomeTaxRequest({
  profile,
  profileId,
  requestId,
  values,
}: {
  profile: FinancialProfile;
  profileId: string;
  requestId: string;
  values: IncomeTaxFormValues;
}): SimulationRequest {
  const ratesCitationId = "income-tax-ay2026-27-rates";
  const reliefCitationId = "income-tax-section87a";
  const validationCitationId = "income-tax-itr-validation";
  const numericAssumption = (
    id: string,
    label: string,
    value: number,
    unit: "basis_points" | "paise",
    rationale: string,
    citationIds: string[] = [],
  ) => ({ id, label, value, unit, rationale, editable: true, citationIds });

  return {
    schemaVersion: "1.0.0",
    requestId,
    country: "IN",
    currency: "INR",
    scenario: {
      type: "income_tax_change",
      effectiveRateChange: {
        value: values.rateChangePercentagePoints,
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
      numericAssumption(
        "annualSalaryPaise",
        "Annual salary",
        values.annualSalaryPaise,
        "paise",
        "Editable salary input; the profile preset uses saved monthly take-home multiplied by 12 as a transparent proxy.",
      ),
      numericAssumption(
        "otherTaxableIncomePaise",
        "Other taxable income",
        values.otherTaxableIncomePaise,
        "paise",
        "Editable ordinary-rate income outside salary; special-rate income is outside this model.",
      ),
      numericAssumption(
        "standardDeductionPaise",
        "Standard deduction",
        values.standardDeductionPaise,
        "paise",
        "AY 2026-27 new-regime employee standard deduction, editable for scenario testing.",
        [validationCitationId],
      ),
      numericAssumption(
        "cessRateBps",
        "Health and Education Cess",
        Math.round(values.cessRatePercent * 100),
        "basis_points",
        "Cess applied after Section 87A rebate or marginal relief.",
        [ratesCitationId],
      ),
      numericAssumption(
        "rebateThresholdPaise",
        "Section 87A income threshold",
        values.rebateThresholdPaise,
        "paise",
        "AY 2026-27 new-regime threshold for the rebate and marginal-relief calculation.",
        [reliefCitationId],
      ),
      numericAssumption(
        "rebateMaximumPaise",
        "Maximum Section 87A rebate",
        values.rebateMaximumPaise,
        "paise",
        "AY 2026-27 maximum rebate for an eligible resident individual.",
        [reliefCitationId],
      ),
      {
        id: "residentEligibleForRebate",
        label: "Resident individual eligible for Section 87A",
        value: values.residentEligibleForRebate,
        unit: "boolean",
        rationale: "Toggle off when the modeled person is not eligible for the resident-individual rebate.",
        editable: true,
        citationIds: [reliefCitationId],
      },
    ],
    evidence: [
      {
        id: ratesCitationId,
        title: "Salaried Individuals for AY 2026-27",
        publisher: "Income Tax Department",
        sourceType: "regulation",
        url: "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1",
        accessedAt: new Date().toISOString(),
        locator: "New-regime slabs and Health and Education Cess",
      },
      {
        id: reliefCitationId,
        title: "Special Regimes for Taxation of Individuals",
        publisher: "Income Tax Department",
        sourceType: "regulation",
        url: "https://www.incometaxindia.gov.in/w/special-regimes-for-taxation-of-individuals-huf-aop-boi-ajp-companies-and-co-operative-societies",
        accessedAt: new Date().toISOString(),
        locator: "Section 87A rebate and marginal relief",
      },
      {
        id: validationCitationId,
        title: "ITR-1 Validation Rules AY 2026-27",
        publisher: "Income Tax Department",
        sourceType: "methodology",
        url: "https://www.incometax.gov.in/iec/foportal/sites/default/files/2026-05/CBDT_e-Filing_ITR%201_Validation%20Rules_AY%202026-27.pdf",
        accessedAt: new Date().toISOString(),
        locator: "₹75,000 new-regime employee standard deduction",
      },
    ],
  };
}
