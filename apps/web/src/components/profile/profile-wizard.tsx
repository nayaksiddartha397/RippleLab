"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveProfileAction } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import {
  basisPointsToPercent,
  labelFromValue,
  paiseToRupees,
} from "@/lib/profile/format";
import {
  employmentStatuses,
  housingStatuses,
  initialProfileActionState,
  primaryGoals,
  type FinancialProfile,
  type ProfileActionState,
} from "@/lib/profile/types";

const steps = [
  { eyebrow: "Step 1", title: "About you" },
  { eyebrow: "Step 2", title: "Monthly cash flow" },
  { eyebrow: "Step 3", title: "Savings & investments" },
  { eyebrow: "Step 4", title: "Home & loans" },
  { eyebrow: "Step 5", title: "Goal & consent" },
];

const fieldStep: Record<string, number> = {
  age: 0,
  city: 0,
  employmentStatus: 0,
  householdSize: 0,
  monthlyDiscretionaryExpenses: 1,
  monthlyEssentialExpenses: 1,
  monthlyOtherIncome: 1,
  monthlyTakeHome: 1,
  cashSavings: 2,
  equityInvestments: 2,
  fixedDeposits: 2,
  otherInvestments: 2,
  homeValue: 3,
  housingStatus: 3,
  monthlyEmi: 3,
  monthlyRent: 3,
  outstandingHomeLoan: 3,
  outstandingOtherLoans: 3,
  weightedLoanRate: 3,
  consentConfirmed: 4,
  goalHorizonYears: 4,
  goalTarget: 4,
  primaryGoal: 4,
};

const labels = (values: readonly string[]) =>
  values.map((value) => ({ label: labelFromValue(value), value }));

function SaveButton({ isExisting }: { isExisting: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? "Saving securely…" : isExisting ? "Update financial profile" : "Save financial profile"}
      {!pending ? <Icon name="arrow" /> : null}
    </Button>
  );
}

export function ProfileWizard({ initialProfile }: { initialProfile: FinancialProfile | null }) {
  const [activeStep, setActiveStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(async (previousState: ProfileActionState, formData: FormData) => {
    const nextState = await saveProfileAction(previousState, formData);
    if (nextState.status === "error" && nextState.fieldErrors) {
      const firstInvalid = Object.keys(nextState.fieldErrors)[0];
      setActiveStep(fieldStep[firstInvalid] ?? 0);
    }
    return nextState;
  }, initialProfileActionState);

  const errorFor = (name: string) => state.fieldErrors?.[name]?.[0];
  const moneyDefault = (key: keyof FinancialProfile) =>
    initialProfile ? paiseToRupees(initialProfile[key] as number) : "0";

  function goForward() {
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-step-panel="${activeStep}"]`);
    const controls = Array.from(
      panel?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select") ?? [],
    );
    const firstInvalid = controls.find((control) => !control.checkValidity());
    if (firstInvalid) {
      firstInvalid.reportValidity();
      return;
    }
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <form action={formAction} className="profile-wizard" ref={formRef}>
      <nav aria-label="Profile progress" className="profile-steps">
        {steps.map((step, index) => (
          <button
            aria-current={activeStep === index ? "step" : undefined}
            className={activeStep === index ? "profile-step profile-step--active" : "profile-step"}
            disabled={!initialProfile && index > activeStep}
            key={step.title}
            onClick={() => setActiveStep(index)}
            type="button"
          >
            <span>{index + 1}</span>
            <strong>{step.title}</strong>
          </button>
        ))}
      </nav>

      <div aria-live="polite" className="profile-status">
        {state.message ? (
          <p className={`profile-status__message profile-status__message--${state.status}`} role={state.status === "error" ? "alert" : "status"}>
            {state.message}
          </p>
        ) : null}
      </div>

      <fieldset data-step-panel="0" hidden={activeStep !== 0}>
        <legend>
          <span className="eyebrow">{steps[0].eyebrow}</span>
          {steps[0].title}
        </legend>
        <p className="profile-section-copy">Start with the details that shape household-level assumptions.</p>
        <div className="profile-field-grid">
          <TextField defaultValue={initialProfile?.age ?? ""} error={errorFor("age")} inputMode="numeric" label="Age" max={100} min={18} name="age" required type="number" />
          <TextField defaultValue={initialProfile?.city ?? ""} error={errorFor("city")} label="City" maxLength={80} name="city" placeholder="Bengaluru" required />
          <TextField defaultValue={initialProfile?.householdSize ?? 1} error={errorFor("householdSize")} inputMode="numeric" label="Household size" max={20} min={1} name="householdSize" required type="number" />
          <SelectField defaultValue={initialProfile?.employmentStatus ?? "salaried"} error={errorFor("employmentStatus")} label="Employment status" name="employmentStatus" options={labels(employmentStatuses)} required />
        </div>
      </fieldset>

      <fieldset data-step-panel="1" hidden={activeStep !== 1}>
        <legend>
          <span className="eyebrow">{steps[1].eyebrow}</span>
          {steps[1].title}
        </legend>
        <p className="profile-section-copy">Enter typical monthly amounts after tax. Use zero when an item does not apply.</p>
        <div className="profile-field-grid">
          <MoneyField defaultValue={moneyDefault("monthlyTakeHomePaise")} error={errorFor("monthlyTakeHome")} label="Take-home income" name="monthlyTakeHome" />
          <MoneyField defaultValue={moneyDefault("monthlyOtherIncomePaise")} error={errorFor("monthlyOtherIncome")} label="Other income" name="monthlyOtherIncome" />
          <MoneyField defaultValue={moneyDefault("monthlyEssentialExpensesPaise")} error={errorFor("monthlyEssentialExpenses")} label="Essential expenses" name="monthlyEssentialExpenses" />
          <MoneyField defaultValue={moneyDefault("monthlyDiscretionaryExpensesPaise")} error={errorFor("monthlyDiscretionaryExpenses")} label="Discretionary expenses" name="monthlyDiscretionaryExpenses" />
        </div>
      </fieldset>

      <fieldset data-step-panel="2" hidden={activeStep !== 2}>
        <legend>
          <span className="eyebrow">{steps[2].eyebrow}</span>
          {steps[2].title}
        </legend>
        <p className="profile-section-copy">Use current balances, not monthly contributions. Approximate values are enough for simulations.</p>
        <div className="profile-field-grid">
          <MoneyField defaultValue={moneyDefault("cashSavingsPaise")} error={errorFor("cashSavings")} label="Cash & savings accounts" name="cashSavings" />
          <MoneyField defaultValue={moneyDefault("fixedDepositsPaise")} error={errorFor("fixedDeposits")} label="Fixed deposits" name="fixedDeposits" />
          <MoneyField defaultValue={moneyDefault("equityInvestmentsPaise")} error={errorFor("equityInvestments")} label="Equity & mutual funds" name="equityInvestments" />
          <MoneyField defaultValue={moneyDefault("otherInvestmentsPaise")} error={errorFor("otherInvestments")} label="Other investments" name="otherInvestments" />
        </div>
      </fieldset>

      <fieldset data-step-panel="3" hidden={activeStep !== 3}>
        <legend>
          <span className="eyebrow">{steps[3].eyebrow}</span>
          {steps[3].title}
        </legend>
        <p className="profile-section-copy">These inputs let rate and housing scenarios respond to your actual exposure.</p>
        <div className="profile-field-grid">
          <SelectField defaultValue={initialProfile?.housingStatus ?? "renter"} error={errorFor("housingStatus")} label="Housing status" name="housingStatus" options={labels(housingStatuses)} required />
          <MoneyField defaultValue={moneyDefault("monthlyRentPaise")} error={errorFor("monthlyRent")} label="Monthly rent" name="monthlyRent" />
          <MoneyField defaultValue={moneyDefault("homeValuePaise")} error={errorFor("homeValue")} label="Estimated home value" name="homeValue" />
          <MoneyField defaultValue={moneyDefault("outstandingHomeLoanPaise")} error={errorFor("outstandingHomeLoan")} label="Outstanding home loan" name="outstandingHomeLoan" />
          <MoneyField defaultValue={moneyDefault("outstandingOtherLoansPaise")} error={errorFor("outstandingOtherLoans")} label="Outstanding other loans" name="outstandingOtherLoans" />
          <MoneyField defaultValue={moneyDefault("monthlyEmiPaise")} error={errorFor("monthlyEmi")} label="Total monthly EMI" name="monthlyEmi" />
          <TextField defaultValue={initialProfile ? basisPointsToPercent(initialProfile.weightedLoanRateBps) : "0"} error={errorFor("weightedLoanRate")} hint="Weighted average annual rate across your loans." inputMode="decimal" label="Average loan interest (%)" max={100} min={0} name="weightedLoanRate" required step="0.01" type="number" />
        </div>
      </fieldset>

      <fieldset data-step-panel="4" hidden={activeStep !== 4}>
        <legend>
          <span className="eyebrow">{steps[4].eyebrow}</span>
          {steps[4].title}
        </legend>
        <p className="profile-section-copy">Your goal helps RippleLab rank trade-offs without turning the result into financial advice.</p>
        <div className="profile-field-grid">
          <SelectField defaultValue={initialProfile?.primaryGoal ?? "emergency_fund"} error={errorFor("primaryGoal")} label="Primary financial goal" name="primaryGoal" options={labels(primaryGoals)} required />
          <MoneyField defaultValue={moneyDefault("goalTargetPaise")} error={errorFor("goalTarget")} label="Goal target" name="goalTarget" />
          <TextField defaultValue={initialProfile?.goalHorizonYears ?? 3} error={errorFor("goalHorizonYears")} label="Goal horizon (years)" max={60} min={1} name="goalHorizonYears" required type="number" />
        </div>
        <div className={errorFor("consentConfirmed") ? "profile-consent profile-consent--error" : "profile-consent"}>
          <input defaultChecked={Boolean(initialProfile)} id="consentConfirmed" name="consentConfirmed" required type="checkbox" />
          <label htmlFor="consentConfirmed">
            <strong>I understand how this profile will be used.</strong>
            <span>RippleLab will use these values only to personalize educational simulations. Results are estimates, not financial advice.</span>
          </label>
          {errorFor("consentConfirmed") ? <p>{errorFor("consentConfirmed")}</p> : null}
        </div>
      </fieldset>

      <footer className="profile-wizard__actions">
        <Button disabled={activeStep === 0} onClick={() => setActiveStep((current) => Math.max(0, current - 1))} tone="secondary">
          Back
        </Button>
        <span className="profile-wizard__position">{activeStep + 1} of {steps.length}</span>
        {activeStep < steps.length - 1 ? (
          <Button onClick={goForward}>Continue <Icon name="arrow" /></Button>
        ) : (
          <SaveButton isExisting={Boolean(initialProfile)} />
        )}
      </footer>
    </form>
  );
}

function MoneyField({ defaultValue, error, label, name }: { defaultValue: string; error?: string; label: string; name: string }) {
  return (
    <TextField
      defaultValue={defaultValue}
      error={error}
      hint="Indian rupees"
      inputMode="decimal"
      label={`${label} (₹)`}
      max={1_000_000_000}
      min={0}
      name={name}
      required
      step="0.01"
      type="number"
    />
  );
}
