"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { saveFinancialProfile } from "@/lib/profile/data";
import type { FinancialProfileDraft, ProfileActionState } from "@/lib/profile/types";
import {
  financialProfileFormSchema,
  formDataToCandidate,
  percentageToBasisPoints,
  rupeesToPaise,
} from "@/lib/profile/validation";

export async function saveProfileAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireUser("/profile");
  const parsed = financialProfileFormSchema.safeParse(formDataToCandidate(formData));

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: "Review the highlighted fields before saving.",
      status: "error",
    };
  }

  const values = parsed.data;
  const profile: FinancialProfileDraft = {
    age: values.age,
    cashSavingsPaise: rupeesToPaise(values.cashSavings),
    city: values.city,
    employmentStatus: values.employmentStatus,
    equityInvestmentsPaise: rupeesToPaise(values.equityInvestments),
    fixedDepositsPaise: rupeesToPaise(values.fixedDeposits),
    goalHorizonYears: values.goalHorizonYears,
    goalTargetPaise: rupeesToPaise(values.goalTarget),
    homeValuePaise: rupeesToPaise(values.homeValue),
    householdSize: values.householdSize,
    housingStatus: values.housingStatus,
    monthlyDiscretionaryExpensesPaise: rupeesToPaise(values.monthlyDiscretionaryExpenses),
    monthlyEmiPaise: rupeesToPaise(values.monthlyEmi),
    monthlyEssentialExpensesPaise: rupeesToPaise(values.monthlyEssentialExpenses),
    monthlyOtherIncomePaise: rupeesToPaise(values.monthlyOtherIncome),
    monthlyRentPaise: rupeesToPaise(values.monthlyRent),
    monthlyTakeHomePaise: rupeesToPaise(values.monthlyTakeHome),
    otherInvestmentsPaise: rupeesToPaise(values.otherInvestments),
    outstandingHomeLoanPaise: rupeesToPaise(values.outstandingHomeLoan),
    outstandingOtherLoansPaise: rupeesToPaise(values.outstandingOtherLoans),
    primaryGoal: values.primaryGoal,
    weightedLoanRateBps: percentageToBasisPoints(values.weightedLoanRate),
  };

  try {
    await saveFinancialProfile(user.id, profile);
  } catch {
    return {
      message: "Your profile could not be saved. Nothing was changed; please try again.",
      status: "error",
    };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { message: "Financial profile saved securely.", status: "success" };
}
