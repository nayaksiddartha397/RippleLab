"use client";

import type { SimulationResult } from "@ripplelab/contracts/simulation";
import dynamic from "next/dynamic";
import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfidenceBadge } from "@/components/ui/confidence-badge";
import { TextField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import {
  formatRupeesAndPaise,
  formatRupeesFromPaise,
  paiseToRupees,
} from "@/lib/profile/format";
import type { FinancialProfile } from "@/lib/profile/types";
import { buildIncomeTaxRequest, profileIncomeTaxInputs } from "@/lib/scenarios/income-tax";

const CausalGraphExplorer = dynamic(
  () =>
    import("@/components/scenarios/causal-graph-explorer").then(
      (module) => module.CausalGraphExplorer,
    ),
  {
    loading: () => (
      <Card aria-live="polite" className="repo-causal-card repo-causal-loading">
        <p className="eyebrow">Interactive causal graph</p>
        <h2>Preparing your income-to-take-home path…</h2>
      </Card>
    ),
    ssr: false,
  },
);

type IncomePreset = "early-career" | "higher-income" | "mid-income" | "profile";

const incomePresetCopy: Record<IncomePreset, { label: string; note: string }> = {
  profile: {
    label: "Profile proxy",
    note: "Saved monthly take-home × 12; edit this annual salary before relying on it.",
  },
  "early-career": {
    label: "₹8 lakh salary",
    note: "Shows how the same policy interacts with the lower new-regime bands.",
  },
  "mid-income": {
    label: "₹18 lakh salary",
    note: "Spreads taxable income across several progressive marginal bands.",
  },
  "higher-income": {
    label: "₹30 lakh salary",
    note: "Includes the top 30% marginal band; surcharge remains outside scope.",
  },
};

const policyPresets = [
  { label: "2pp cut", note: "Reduce each non-zero marginal rate by 2 percentage points.", value: -2 },
  { label: "No change", note: "Use the AY 2026-27 rates on both sides of the comparison.", value: 0 },
  { label: "2pp increase", note: "Raise each non-zero marginal rate by 2 percentage points.", value: 2 },
] as const;

const slabDefinitions = [
  { id: "five", label: "₹4-8 lakh", rate: 5 },
  { id: "ten", label: "₹8-12 lakh", rate: 10 },
  { id: "fifteen", label: "₹12-16 lakh", rate: 15 },
  { id: "twenty", label: "₹16-20 lakh", rate: 20 },
  { id: "twenty-five", label: "₹20-24 lakh", rate: 25 },
  { id: "thirty", label: "Above ₹24 lakh", rate: 30 },
] as const;

const subscribeToHydration = () => () => undefined;

function useIsHydrated() {
  return useSyncExternalStore(subscribeToHydration, () => true, () => false);
}

function numberFrom(formData: FormData, name: string) {
  return Number(formData.get(name));
}

function confidenceLabel(level: SimulationResult["confidence"]["level"]) {
  return `${level.charAt(0).toUpperCase()}${level.slice(1)}` as "Low" | "Medium" | "High";
}

function resultError(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }
  return "RippleLab could not run this income-tax scenario. Check the assumptions and try again.";
}

function proposedRate(current: number, shift: number) {
  return Math.min(100, Math.max(0, current + shift));
}

function incomeForPreset(preset: IncomePreset, profileAnnualSalaryPaise: number) {
  if (preset === "early-career") return 80_000_000;
  if (preset === "mid-income") return 180_000_000;
  if (preset === "higher-income") return 300_000_000;
  return profileAnnualSalaryPaise;
}

export function IncomeTaxSimulator({
  profile,
  profileId,
}: {
  profile: FinancialProfile;
  profileId: string;
}) {
  const profileInputs = useMemo(() => profileIncomeTaxInputs(profile), [profile]);
  const [incomePreset, setIncomePreset] = useState<IncomePreset>("profile");
  const [annualSalaryRupees, setAnnualSalaryRupees] = useState(
    Number(paiseToRupees(profileInputs.annualSalaryPaise)),
  );
  const [otherIncomeRupees, setOtherIncomeRupees] = useState(
    Number(paiseToRupees(profileInputs.otherTaxableIncomePaise)),
  );
  const [rateShift, setRateShift] = useState(-2);
  const [submittedRateShift, setSubmittedRateShift] = useState(-2);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const isHydrated = useIsHydrated();

  function selectIncomePreset(preset: IncomePreset) {
    setIncomePreset(preset);
    setAnnualSalaryRupees(incomeForPreset(preset, profileInputs.annualSalaryPaise) / 100);
    setOtherIncomeRupees(
      preset === "profile" ? profileInputs.otherTaxableIncomePaise / 100 : 0,
    );
    setResult(null);
  }

  async function submitScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    const formData = new FormData(event.currentTarget);
    const selectedRateShift = numberFrom(formData, "rateChangePercentagePoints");
    const request = buildIncomeTaxRequest({
      profile,
      profileId,
      requestId: crypto.randomUUID(),
      values: {
        annualSalaryPaise: Math.round(numberFrom(formData, "annualSalary") * 100),
        cessRatePercent: numberFrom(formData, "cessRatePercent"),
        horizonMonths: numberFrom(formData, "horizonMonths"),
        otherTaxableIncomePaise: Math.round(numberFrom(formData, "otherTaxableIncome") * 100),
        rateChangePercentagePoints: selectedRateShift,
        rebateMaximumPaise: Math.round(numberFrom(formData, "rebateMaximum") * 100),
        rebateThresholdPaise: Math.round(numberFrom(formData, "rebateThreshold") * 100),
        residentEligibleForRebate: formData.has("residentEligibleForRebate"),
        standardDeductionPaise: Math.round(numberFrom(formData, "standardDeduction") * 100),
      },
    });

    try {
      const response = await fetch("/api/simulations/income-tax", {
        body: JSON.stringify(request),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        setResult(null);
        setError(resultError(payload));
        return;
      }
      setSubmittedRateShift(selectedRateShift);
      setResult(payload as SimulationResult);
    } catch {
      setResult(null);
      setError("The income-tax engine is temporarily unavailable. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  const nodeValue = (id: string) =>
    Number(result?.causalGraph.nodes.find((node) => node.id === id)?.value ?? 0);
  const impactValue = (id: string) =>
    result?.impacts.find((impact) => impact.id === id)?.annualImpactPaise ?? 0;
  const resultDirection = (result?.annualNetImpactPaise ?? 0) >= 0 ? "more" : "less";

  return (
    <div className="repo-scenario-layout tax-layout">
      <Card className="repo-scenario-form tax-form" elevated>
        <CardHeader eyebrow="Inputs and assumptions" title="Build your income-tax policy scenario" />
        <div className="repo-profile-strip tax-profile-strip">
          <span>
            <small>Monthly take-home</small>
            <strong>{formatRupeesFromPaise(profile.monthlyTakeHomePaise)}</strong>
          </span>
          <span>
            <small>Employment</small>
            <strong>{profile.employmentStatus.replaceAll("_", " ")}</strong>
          </span>
          <span>
            <small>City</small>
            <strong>{profile.city}</strong>
          </span>
        </div>

        <form onSubmit={submitScenario}>
          <fieldset>
            <legend>Income starting point</legend>
            <p>These presets change visible inputs only; your saved profile is never overwritten.</p>
            <div className="tax-income-presets">
              {(Object.keys(incomePresetCopy) as IncomePreset[]).map((preset) => (
                <button
                  aria-pressed={incomePreset === preset}
                  className={
                    incomePreset === preset ? "oil-preset oil-preset--active" : "oil-preset"
                  }
                  key={preset}
                  onClick={() => selectIncomePreset(preset)}
                  type="button"
                >
                  <strong>{incomePresetCopy[preset].label}</strong>
                  <span>{incomePresetCopy[preset].note}</span>
                </button>
              ))}
            </div>
            <div className="repo-field-grid">
              <TextField
                label="Annual salary (₹)"
                max={10_000_000_000}
                min={0}
                name="annualSalary"
                onChange={(event) => setAnnualSalaryRupees(Number(event.currentTarget.value))}
                required
                step="0.01"
                type="number"
                value={annualSalaryRupees}
              />
              <TextField
                label="Other ordinary-rate income (₹)"
                max={10_000_000_000}
                min={0}
                name="otherTaxableIncome"
                onChange={(event) => setOtherIncomeRupees(Number(event.currentTarget.value))}
                required
                step="0.01"
                type="number"
                value={otherIncomeRupees}
              />
              <TextField
                defaultValue="75000"
                hint="Official employee default; edit for a hypothetical scenario."
                label="Standard deduction (₹)"
                max={annualSalaryRupees}
                min={0}
                name="standardDeduction"
                required
                step="1"
                type="number"
              />
            </div>
          </fieldset>

          <fieldset>
            <legend>Marginal-rate policy</legend>
            <p>The selected change is applied to each non-zero marginal slab; the 0% band stays 0%.</p>
            <div className="oil-preset-grid tax-policy-presets">
              {policyPresets.map((preset) => (
                <button
                  aria-pressed={rateShift === preset.value}
                  className={
                    rateShift === preset.value ? "oil-preset oil-preset--active" : "oil-preset"
                  }
                  key={preset.label}
                  onClick={() => {
                    setRateShift(preset.value);
                    setResult(null);
                  }}
                  type="button"
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.note}</span>
                </button>
              ))}
            </div>
            <div className="repo-field-grid tax-policy-fields">
              <TextField
                hint="For example, -2 means every paid slab rate falls by 2 percentage points."
                label="Rate change (percentage points)"
                max={70}
                min={-30}
                name="rateChangePercentagePoints"
                onChange={(event) => setRateShift(Number(event.currentTarget.value))}
                required
                step="0.1"
                type="number"
                value={rateShift}
              />
              <TextField defaultValue="12" label="Impact horizon (months)" max={120} min={1} name="horizonMonths" required step="1" type="number" />
            </div>
          </fieldset>

          <fieldset>
            <legend>AY 2026-27 relief assumptions</legend>
            <p>Defaults come from official Income Tax Department guidance and remain editable.</p>
            <div className="repo-field-grid">
              <TextField defaultValue="1200000" label="Section 87A threshold (₹)" max={10_000_000_000} min={0} name="rebateThreshold" required step="1" type="number" />
              <TextField defaultValue="60000" label="Maximum Section 87A rebate (₹)" max={10_000_000_000} min={0} name="rebateMaximum" required step="1" type="number" />
              <TextField defaultValue="4" label="Health and Education Cess (%)" max={100} min={0} name="cessRatePercent" required step="0.01" type="number" />
            </div>
            <label className="tax-toggle">
              <input defaultChecked name="residentEligibleForRebate" type="checkbox" />
              <span>
                <strong>Apply resident-individual Section 87A relief</strong>
                <small>Includes the entered rebate cap and marginal relief just above the threshold.</small>
              </span>
            </label>
          </fieldset>

          {error ? <p className="repo-scenario-error" role="alert">{error}</p> : null}
          <div className="repo-form-actions">
            <Button disabled={!isHydrated || isPending} type="submit">
              {isPending
                ? "Calculating tax paths…"
                : isHydrated
                  ? "Calculate income-tax impact"
                  : "Preparing secure calculator…"}
              {isHydrated && !isPending ? <Icon name="arrow" /> : null}
            </Button>
            <span>Positive results mean more take-home pay; negative results mean less.</span>
          </div>
        </form>
      </Card>

      <div aria-live="polite" className="repo-result-column">
        {result ? (
          <>
            <Card className="repo-net-result" elevated>
              <div>
                <p className="eyebrow">Estimated annual take-home effect</p>
                <strong>{formatRupeesAndPaise(result.annualNetImpactPaise)}</strong>
                <span>The selected policy produces {resultDirection} modeled take-home pay.</span>
              </div>
              <ConfidenceBadge detail={result.confidence.rationale} level={confidenceLabel(result.confidence.level)} />
            </Card>

            <section aria-label="Income-tax outputs" className="repo-output-grid tax-output-grid">
              <Card><p>Modeled taxable income</p><strong>{formatRupeesAndPaise(nodeValue("taxable-income"))}</strong><span>Salary - deduction + other income</span></Card>
              <Card><p>Current total tax</p><strong>{formatRupeesAndPaise(nodeValue("current-tax"))}</strong><span>AY 2026-27 baseline</span></Card>
              <Card><p>Proposed total tax</p><strong>{formatRupeesAndPaise(nodeValue("proposed-tax"))}</strong><span>{submittedRateShift > 0 ? "+" : ""}{submittedRateShift}pp rate shift</span></Card>
              <Card><p>Monthly take-home effect</p><strong>{formatRupeesAndPaise(nodeValue("monthly-take-home-impact"))}</strong><span>Annual effect divided by 12</span></Card>
            </section>

            <Card className="tax-slab-card">
              <CardHeader eyebrow="Slab-by-slab comparison" title="See exactly where the policy changes tax" />
              <div
                aria-label="Income-tax slab comparison"
                className="tax-slab-table"
                role="table"
                tabIndex={0}
              >
                <div className="tax-slab-row tax-slab-row--header" role="row">
                  <span role="columnheader">Taxable band</span><span role="columnheader">Current rate</span><span role="columnheader">Proposed rate</span><span role="columnheader">Annual effect</span>
                </div>
                {slabDefinitions.map((slab) => (
                  <div className="tax-slab-row" key={slab.id} role="row">
                    <strong role="cell">{slab.label}</strong>
                    <span role="cell">{slab.rate}%</span>
                    <span role="cell">{proposedRate(slab.rate, submittedRateShift).toFixed(1)}%</span>
                    <strong role="cell">{formatRupeesAndPaise(impactValue(`tax-slab-${slab.id}-impact`))}</strong>
                  </div>
                ))}
                <div className="tax-slab-row tax-slab-row--relief" role="row">
                  <strong role="cell">Section 87A relief</strong><span role="cell">Same rules</span><span role="cell">Same rules</span><strong role="cell">{formatRupeesAndPaise(impactValue("rebate-relief-impact"))}</strong>
                </div>
                <div className="tax-slab-row tax-slab-row--relief" role="row">
                  <strong role="cell">4% cess effect</strong><span role="cell">After relief</span><span role="cell">After relief</span><strong role="cell">{formatRupeesAndPaise(impactValue("cess-impact"))}</strong>
                </div>
              </div>
            </Card>

            <Card className="repo-uncertainty-card">
              <CardHeader eyebrow="Policy sensitivity" title="One point either side of your selected rate shift" />
              <div className="repo-range">
                <span><small>Lower take-home effect</small><strong>{formatRupeesAndPaise(result.uncertainty.p10AnnualImpactPaise)}</strong></span>
                <i aria-hidden="true" />
                <span><small>Selected policy</small><strong>{formatRupeesAndPaise(result.uncertainty.p50AnnualImpactPaise)}</strong></span>
                <i aria-hidden="true" />
                <span><small>Higher take-home effect</small><strong>{formatRupeesAndPaise(result.uncertainty.p90AnnualImpactPaise)}</strong></span>
              </div>
              <p>{result.warnings[2]}</p>
            </Card>

            <Card className="repo-method-card">
              <CardHeader eyebrow="Calculation boundary" title="Official rates, explicit income assumptions" />
              <div>
                <section><h3>Deterministic</h3><ul><li>AY 2026-27 progressive marginal slabs.</li><li>Section 87A rebate and marginal relief.</li><li>Cess, annual tax difference and monthly equivalent.</li></ul></section>
                <section><h3>Outside this model</h3><ul><li>Surcharge and special-rate capital gains.</li><li>Deductions beyond the entered standard deduction.</li><li>Filing eligibility, payroll timing and tax advice.</li></ul></section>
              </div>
              <p className="repo-model-version">Model {result.modelVersion} · {result.warnings[0]}</p>
            </Card>
          </>
        ) : (
          <Card className="repo-result-empty tax-result-empty">
            <p className="eyebrow">Ready to calculate</p>
            <h2>Your income-tax ripple will appear here.</h2>
            <p>Choose an income band, change the paid marginal rates, then inspect current tax, proposed tax and monthly take-home.</p>
            <div aria-label="Income-tax calculation path" className="repo-empty-path">
              <span>Income</span><i>→</i><span>Slabs + relief + cess</span><i>→</i><span>Take-home pay</span>
            </div>
          </Card>
        )}
      </div>

      {result ? <CausalGraphExplorer key={result.requestId} result={result} /> : null}
    </div>
  );
}
