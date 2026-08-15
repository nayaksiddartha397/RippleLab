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
import {
  buildInflationRequest,
  deriveInflationBasket,
  type InflationBasket,
} from "@/lib/scenarios/inflation";

const CausalGraphExplorer = dynamic(
  () =>
    import("@/components/scenarios/causal-graph-explorer").then(
      (module) => module.CausalGraphExplorer,
    ),
  {
    loading: () => (
      <Card aria-live="polite" className="repo-causal-card repo-causal-loading">
        <p className="eyebrow">Interactive causal graph</p>
        <h2>Preparing your category-weighted inflation path…</h2>
      </Card>
    ),
    ssr: false,
  },
);

const categories = [
  { id: "food", label: "Food and groceries", passThrough: 100, spendKey: "foodSpendPaise" },
  { id: "housing", label: "Housing", passThrough: 100, spendKey: "housingSpendPaise" },
  { id: "transport", label: "Transport", passThrough: 120, spendKey: "transportSpendPaise" },
  { id: "utilities", label: "Utilities", passThrough: 80, spendKey: "utilitiesSpendPaise" },
  { id: "other", label: "Other spending", passThrough: 70, spendKey: "otherSpendPaise" },
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
  return "RippleLab could not run this inflation scenario. Check the basket and try again.";
}

function percentFromBasisPoints(value: unknown) {
  return `${(Number(value ?? 0) / 100).toFixed(2)}%`;
}

export function InflationSimulator({
  profile,
  profileId,
}: {
  profile: FinancialProfile;
  profileId: string;
}) {
  const defaultBasket = useMemo(() => deriveInflationBasket(profile), [profile]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const isHydrated = useIsHydrated();

  async function submitScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    const formData = new FormData(event.currentTarget);
    const basket = Object.fromEntries(
      categories.map((category) => [
        category.spendKey,
        Math.round(numberFrom(formData, `${category.id}Spend`) * 100),
      ]),
    ) as InflationBasket;
    const request = buildInflationRequest({
      profile,
      profileId,
      requestId: crypto.randomUUID(),
      values: {
        ...basket,
        currentInflationPercent: numberFrom(formData, "currentInflation"),
        foodPassThroughPercent: numberFrom(formData, "foodPassThrough"),
        horizonMonths: numberFrom(formData, "horizonMonths"),
        housingPassThroughPercent: numberFrom(formData, "housingPassThrough"),
        inflationChangePercentagePoints: numberFrom(formData, "inflationChange"),
        otherPassThroughPercent: numberFrom(formData, "otherPassThrough"),
        portfolioReturnBps: Math.round(numberFrom(formData, "portfolioReturn") * 100),
        salaryGrowthBps: Math.round(numberFrom(formData, "salaryGrowth") * 100),
        transportPassThroughPercent: numberFrom(formData, "transportPassThrough"),
        utilitiesPassThroughPercent: numberFrom(formData, "utilitiesPassThrough"),
      },
    });

    try {
      const response = await fetch("/api/simulations/inflation", {
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
      setResult(payload as SimulationResult);
    } catch {
      setResult(null);
      setError("The inflation engine is temporarily unavailable. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  const personalInflationNode = result?.causalGraph.nodes.find(
    (node) => node.id === "personal-basket-inflation",
  );
  const headlineNode = result?.causalGraph.nodes.find((node) => node.id === "headline-inflation");
  const expenseNode = result?.causalGraph.nodes.find((node) => node.id === "projected-expenses");
  const salaryNode = result?.causalGraph.nodes.find((node) => node.id === "real-salary-growth");
  const portfolioNode = result?.causalGraph.nodes.find(
    (node) => node.id === "real-portfolio-return",
  );
  const salaryImpact = result?.impacts.find((impact) => impact.id === "salary-purchasing-power");
  const portfolioImpact = result?.impacts.find((impact) => impact.id === "portfolio-real-return");

  return (
    <div className="repo-scenario-layout inflation-layout">
      <Card className="repo-scenario-form inflation-form" elevated>
        <CardHeader eyebrow="Inputs and assumptions" title="Build your personal inflation basket" />
        <div className="repo-profile-strip inflation-profile-strip">
          <span>
            <small>Essential expenses</small>
            <strong>{formatRupeesFromPaise(profile.monthlyEssentialExpensesPaise)}</strong>
          </span>
          <span>
            <small>Discretionary</small>
            <strong>{formatRupeesFromPaise(profile.monthlyDiscretionaryExpensesPaise)}</strong>
          </span>
          <span>
            <small>Monthly income</small>
            <strong>
              {formatRupeesFromPaise(
                profile.monthlyTakeHomePaise + profile.monthlyOtherIncomePaise,
              )}
            </strong>
          </span>
        </div>

        <form onSubmit={submitScenario}>
          <fieldset>
            <legend>Inflation scenario</legend>
            <div className="repo-field-grid inflation-policy-fields">
              <TextField defaultValue="4.00" label="Current headline inflation (%)" max={100} min={-10} name="currentInflation" required step="0.01" type="number" />
              <TextField defaultValue="2.00" hint="Added to the current rate." label="Inflation change (percentage points)" max={100} min={-25} name="inflationChange" required step="0.01" type="number" />
              <TextField defaultValue="12" label="Projection horizon (months)" max={120} min={1} name="horizonMonths" required step="1" type="number" />
            </div>
          </fieldset>

          <fieldset>
            <legend>Monthly expense basket</legend>
            <p>We created a starting allocation from your profile. Edit any amount before calculating.</p>
            <div className="inflation-category-fields">
              {categories.map((category) => (
                <div className="inflation-category-input" key={category.id}>
                  <TextField
                    defaultValue={paiseToRupees(defaultBasket[category.spendKey])}
                    label={`${category.label} (₹/month)`}
                    max={1_000_000_000}
                    min={0}
                    name={`${category.id}Spend`}
                    required
                    step="0.01"
                    type="number"
                  />
                  <TextField
                    defaultValue={category.passThrough}
                    hint="100% means this category follows headline inflation."
                    label={`${category.label} price pass-through (%)`}
                    max={200}
                    min={0}
                    name={`${category.id}PassThrough`}
                    required
                    step="1"
                    type="number"
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Purchasing-power diagnostics</legend>
            <p>These affect the salary and portfolio diagnostics, not the headline expense result.</p>
            <div className="repo-field-grid">
              <TextField defaultValue="5.00" label="Expected salary growth (%)" max={1000} min={-100} name="salaryGrowth" required step="0.01" type="number" />
              <TextField defaultValue="7.00" label="Expected nominal portfolio return (%)" max={1000} min={-100} name="portfolioReturn" required step="0.01" type="number" />
            </div>
          </fieldset>

          {error ? <p className="repo-scenario-error" role="alert">{error}</p> : null}
          <div className="repo-form-actions">
            <Button disabled={!isHydrated || isPending} type="submit">
              {isPending
                ? "Repricing your basket…"
                : isHydrated
                  ? "Calculate inflation impact"
                  : "Preparing secure calculator…"}
              {isHydrated && !isPending ? <Icon name="arrow" /> : null}
            </Button>
            <span>Money crosses the engine boundary as integer paise; rates are explicit.</span>
          </div>
        </form>
      </Card>

      <div aria-live="polite" className="repo-result-column">
        {result && salaryImpact && portfolioImpact ? (
          <>
            <Card className="repo-net-result" elevated>
              <div>
                <p className="eyebrow">Annual impact vs current inflation path</p>
                <strong>{formatRupeesAndPaise(result.annualNetImpactPaise)}</strong>
                <span>Annualized household expense effect; salary and portfolio diagnostics are separate.</span>
              </div>
              <ConfidenceBadge detail={result.confidence.rationale} level={confidenceLabel(result.confidence.level)} />
            </Card>

            <section aria-label="Inflation outputs" className="repo-output-grid inflation-output-grid">
              <Card><p>Target headline inflation</p><strong>{percentFromBasisPoints(headlineNode?.value)}</strong><span>Economic scenario input</span></Card>
              <Card><p>Your weighted basket inflation</p><strong>{percentFromBasisPoints(personalInflationNode?.value)}</strong><span>Category spend × pass-through</span></Card>
              <Card><p>Projected monthly basket</p><strong>{formatRupeesAndPaise(Number(expenseNode?.value ?? 0))}</strong><span>At the selected horizon</span></Card>
              <Card><p>Real salary growth</p><strong>{percentFromBasisPoints(salaryNode?.value)}</strong><span>{formatRupeesAndPaise(salaryImpact.annualImpactPaise)} annual purchasing power</span></Card>
              <Card><p>Real portfolio return</p><strong>{percentFromBasisPoints(portfolioNode?.value)}</strong><span>{formatRupeesAndPaise(portfolioImpact.annualImpactPaise)} on modeled assets</span></Card>
            </section>

            <Card className="inflation-driver-card">
              <CardHeader eyebrow="Category drivers" title="Where the extra expense pressure comes from" />
              <div className="inflation-driver-table" role="table" aria-label="Personal inflation category impacts" tabIndex={0}>
                <div className="inflation-driver-row inflation-driver-row--header" role="row">
                  <span role="columnheader">Category</span><span role="columnheader">Monthly spend</span><span role="columnheader">Target rate</span><span role="columnheader">Annual effect</span>
                </div>
                {categories.map((category) => {
                  const impact = result.impacts.find((item) => item.id === `${category.id}-expense-impact`);
                  const node = result.causalGraph.nodes.find((item) => item.id === `${category.id}-inflation`);
                  const spend = result.assumptions.find((item) => item.id === category.spendKey);
                  return (
                    <div className="inflation-driver-row" key={category.id} role="row">
                      <strong role="cell">{category.label}</strong>
                      <span role="cell">{formatRupeesAndPaise(Number(spend?.value ?? 0))}</span>
                      <span role="cell">{percentFromBasisPoints(node?.value)}</span>
                      <span role="cell">{formatRupeesAndPaise(Number(impact?.annualImpactPaise ?? 0))}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="repo-uncertainty-card">
              <CardHeader eyebrow="Model uncertainty" title="Pass-through sensitivity, not a probability" />
              <div className="repo-range">
                <span><small>More pressure</small><strong>{formatRupeesAndPaise(result.uncertainty.p10AnnualImpactPaise)}</strong></span>
                <i aria-hidden="true" />
                <span><small>Selected assumptions</small><strong>{formatRupeesAndPaise(result.uncertainty.p50AnnualImpactPaise)}</strong></span>
                <i aria-hidden="true" />
                <span><small>Less pressure</small><strong>{formatRupeesAndPaise(result.uncertainty.p90AnnualImpactPaise)}</strong></span>
              </div>
              <p>{result.warnings[2]}</p>
            </Card>

            <Card className="repo-method-card">
              <CardHeader eyebrow="Calculation boundary" title="Personal arithmetic with visible assumptions" />
              <div>
                <section><h3>Deterministic</h3><ul><li>Weighted personal-basket inflation.</li><li>Current-versus-target category expense paths.</li><li>Real salary growth and real portfolio return.</li></ul></section>
                <section><h3>Assumption-driven</h3><ul><li>How much of headline inflation reaches each category.</li><li>Expected salary adjustment and nominal portfolio return.</li><li>Expense allocation when the saved profile is less detailed.</li></ul></section>
              </div>
              <p className="repo-model-version">Model {result.modelVersion} · {result.warnings[0]}</p>
            </Card>
          </>
        ) : (
          <Card className="repo-result-empty inflation-result-empty">
            <p className="eyebrow">Ready to calculate</p>
            <h2>Your personal inflation result will appear here.</h2>
            <p>Start with the profile-derived basket, then adjust category pass-through to see which expenses dominate the result.</p>
            <div aria-label="Inflation calculation path" className="repo-empty-path">
              <span>Headline CPI</span><i>→</i><span>Your basket</span><i>→</i><span>Purchasing power</span>
            </div>
          </Card>
        )}
      </div>

      {result ? <CausalGraphExplorer key={result.requestId} result={result} /> : null}
    </div>
  );
}
