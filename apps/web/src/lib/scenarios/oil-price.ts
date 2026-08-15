import type { SimulationRequest } from "@ripplelab/contracts/simulation";

import type { FinancialProfile } from "@/lib/profile/types";

export type OilExpenseInputs = {
  foodSpendPaise: number;
  monthlyFuelLitres: number;
  transportSpendPaise: number;
  utilitiesSpendPaise: number;
};

export type OilPriceFormValues = OilExpenseInputs & {
  crudeToRetailPassThroughPercent: number;
  currentCrudePriceUsd: number;
  currentRetailFuelPricePaisePerLitre: number;
  foodPassThroughPercent: number;
  horizonMonths: number;
  targetCrudePriceUsd: number;
  transportPassThroughPercent: number;
  utilitiesPassThroughPercent: number;
};

export function deriveOilExpenseInputs(profile: FinancialProfile): OilExpenseInputs {
  const lowerDrivingExposure = ["student", "retired", "not_employed"].includes(
    profile.employmentStatus,
  );

  return {
    foodSpendPaise: Math.round(profile.monthlyEssentialExpensesPaise * 0.4),
    monthlyFuelLitres: lowerDrivingExposure ? 15 : 40,
    transportSpendPaise: Math.round(profile.monthlyEssentialExpensesPaise * 0.2),
    utilitiesSpendPaise: Math.round(profile.monthlyEssentialExpensesPaise * 0.2),
  };
}

export function buildOilPriceRequest({
  profile,
  profileId,
  requestId,
  values,
}: {
  profile: FinancialProfile;
  profileId: string;
  requestId: string;
  values: OilPriceFormValues;
}): SimulationRequest {
  const crudeCitationId = "ppac-crude-price";
  const retailCitationId = "ppac-retail-price-build-up";
  const cpiCitationId = "mospi-cpi-groups";
  const assumption = (
    id: string,
    label: string,
    value: number,
    unit: "litres_per_month" | "paise" | "paise_per_litre" | "ratio",
    rationale: string,
    citationIds: string[] = [],
  ) => ({ id, label, value, unit, rationale, editable: true, citationIds });

  return {
    schemaVersion: "1.0.0",
    requestId,
    country: "IN",
    currency: "INR",
    scenario: {
      type: "oil_price_change",
      currentPrice: values.currentCrudePriceUsd,
      targetPrice: values.targetCrudePriceUsd,
      unit: "usd_per_barrel",
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
      assumption(
        "currentRetailFuelPricePaisePerLitre",
        "Current retail fuel price",
        values.currentRetailFuelPricePaisePerLitre,
        "paise_per_litre",
        "Editable local retail-price starting point; no live city price is inferred.",
        [retailCitationId],
      ),
      assumption(
        "monthlyFuelLitres",
        "Monthly fuel use",
        values.monthlyFuelLitres,
        "litres_per_month",
        "Editable household driving exposure; zero is valid for a non-driving household.",
      ),
      assumption(
        "crudeToRetailPassThrough",
        "Crude-to-retail pass-through",
        values.crudeToRetailPassThroughPercent / 100,
        "ratio",
        "Selected share of the crude-price percentage change applied to retail fuel.",
        [crudeCitationId, retailCitationId],
      ),
      assumption(
        "transportSpendPaise",
        "Monthly transport spend",
        values.transportSpendPaise,
        "paise",
        "Editable non-fuel transport exposure derived from the saved expense profile.",
      ),
      assumption(
        "transportPassThrough",
        "Transport pass-through",
        values.transportPassThroughPercent / 100,
        "ratio",
        "Selected indirect transport response to the crude-price percentage change.",
        [cpiCitationId],
      ),
      assumption(
        "foodSpendPaise",
        "Monthly food spend",
        values.foodSpendPaise,
        "paise",
        "Editable food exposure derived from the saved expense profile.",
      ),
      assumption(
        "foodPassThrough",
        "Food pass-through",
        values.foodPassThroughPercent / 100,
        "ratio",
        "Selected indirect food response to the crude-price percentage change.",
        [cpiCitationId],
      ),
      assumption(
        "utilitiesSpendPaise",
        "Monthly utilities spend",
        values.utilitiesSpendPaise,
        "paise",
        "Editable utility exposure derived from the saved expense profile.",
      ),
      assumption(
        "utilitiesPassThrough",
        "Utilities pass-through",
        values.utilitiesPassThroughPercent / 100,
        "ratio",
        "Selected indirect utility response to the crude-price percentage change.",
        [cpiCitationId],
      ),
    ],
    evidence: [
      {
        id: crudeCitationId,
        title: "International Prices of Crude Oil (Indian Basket)",
        publisher: "Petroleum Planning and Analysis Cell",
        sourceType: "official_statistic",
        url: "https://ppac.gov.in/prices/international-prices-of-crude-oil",
        accessedAt: new Date().toISOString(),
        locator: "Indian Basket crude-oil series",
      },
      {
        id: retailCitationId,
        title: "Price Build Up of Petrol and Diesel",
        publisher: "Petroleum Planning and Analysis Cell",
        sourceType: "methodology",
        url: "https://ppac.gov.in/retail-selling-price-rsp-of-petrol-diesel-and-domestic-lpg/price-build-up-of-petrol-and-diesel",
        accessedAt: new Date().toISOString(),
        locator: "Retail selling-price components",
      },
      {
        id: cpiCitationId,
        title: "Consumer Price Index frequently asked questions",
        publisher: "Ministry of Statistics and Programme Implementation",
        sourceType: "methodology",
        url: "https://mospi.gov.in/faq",
        accessedAt: new Date().toISOString(),
        locator: "Food, fuel and transport CPI groups",
      },
    ],
  };
}
