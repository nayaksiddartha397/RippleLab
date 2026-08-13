import { z } from "zod";

import { employmentStatuses, housingStatuses, primaryGoals } from "@/lib/profile/types";

const requiredNumber = (label: string) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
    z.number({ error: `${label} is required.` }).finite(`${label} must be a number.`),
  );

const integerWithin = (label: string, min: number, max: number) =>
  requiredNumber(label).pipe(
    z.number().int(`${label} must be a whole number.`).min(min, `${label} must be at least ${min}.`).max(max, `${label} must be ${max} or less.`),
  );

const rupees = (label: string) =>
  requiredNumber(label).pipe(
    z.number().min(0, `${label} cannot be negative.`).max(1_000_000_000, `${label} exceeds the supported limit.`),
  );

const percentage = requiredNumber("Interest rate").pipe(
  z.number().min(0, "Interest rate cannot be negative.").max(100, "Interest rate cannot exceed 100%."),
);

const checkbox = z.preprocess((value) => value === "on" || value === true, z.literal(true, { error: "Confirm before saving your profile." }));

export const financialProfileFormSchema = z.object({
  age: integerWithin("Age", 18, 100),
  cashSavings: rupees("Cash savings"),
  city: z.string().trim().min(2, "Enter a city.").max(80, "City must be 80 characters or less."),
  consentConfirmed: checkbox,
  employmentStatus: z.enum(employmentStatuses, { error: "Select an employment status." }),
  equityInvestments: rupees("Equity investments"),
  fixedDeposits: rupees("Fixed deposits"),
  goalHorizonYears: integerWithin("Goal horizon", 1, 60),
  goalTarget: rupees("Goal target"),
  homeValue: rupees("Home value"),
  householdSize: integerWithin("Household size", 1, 20),
  housingStatus: z.enum(housingStatuses, { error: "Select a housing status." }),
  monthlyDiscretionaryExpenses: rupees("Monthly discretionary expenses"),
  monthlyEmi: rupees("Monthly EMI"),
  monthlyEssentialExpenses: rupees("Monthly essential expenses"),
  monthlyOtherIncome: rupees("Monthly other income"),
  monthlyRent: rupees("Monthly rent"),
  monthlyTakeHome: rupees("Monthly take-home income"),
  otherInvestments: rupees("Other investments"),
  outstandingHomeLoan: rupees("Outstanding home loan"),
  outstandingOtherLoans: rupees("Outstanding other loans"),
  primaryGoal: z.enum(primaryGoals, { error: "Select a primary goal." }),
  weightedLoanRate: percentage,
});

export function formDataToCandidate(formData: FormData) {
  return {
    age: formData.get("age"),
    cashSavings: formData.get("cashSavings"),
    city: formData.get("city"),
    consentConfirmed: formData.get("consentConfirmed"),
    employmentStatus: formData.get("employmentStatus"),
    equityInvestments: formData.get("equityInvestments"),
    fixedDeposits: formData.get("fixedDeposits"),
    goalHorizonYears: formData.get("goalHorizonYears"),
    goalTarget: formData.get("goalTarget"),
    homeValue: formData.get("homeValue"),
    householdSize: formData.get("householdSize"),
    housingStatus: formData.get("housingStatus"),
    monthlyDiscretionaryExpenses: formData.get("monthlyDiscretionaryExpenses"),
    monthlyEmi: formData.get("monthlyEmi"),
    monthlyEssentialExpenses: formData.get("monthlyEssentialExpenses"),
    monthlyOtherIncome: formData.get("monthlyOtherIncome"),
    monthlyRent: formData.get("monthlyRent"),
    monthlyTakeHome: formData.get("monthlyTakeHome"),
    otherInvestments: formData.get("otherInvestments"),
    outstandingHomeLoan: formData.get("outstandingHomeLoan"),
    outstandingOtherLoans: formData.get("outstandingOtherLoans"),
    primaryGoal: formData.get("primaryGoal"),
    weightedLoanRate: formData.get("weightedLoanRate"),
  };
}

export function rupeesToPaise(value: number) {
  return Math.round(value * 100);
}

export function percentageToBasisPoints(value: number) {
  return Math.round(value * 100);
}
