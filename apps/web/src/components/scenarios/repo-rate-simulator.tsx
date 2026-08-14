"use client";

import type { SimulationResult } from "@ripplelab/contracts/simulation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfidenceBadge } from "@/components/ui/confidence-badge";
import { TextField } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { formatRupeesAndPaise, formatRupeesFromPaise } from "@/lib/profile/format";
import type { FinancialProfile } from "@/lib/profile/types";
import { buildRepoRateRequest } from "@/lib/scenarios/repo-rate";

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
  return "RippleLab could not run this scenario. Check the assumptions and try again.";
}

export function RepoRateSimulator({
  profile,
  profileId,
}: {
  profile: FinancialProfile;
  profileId: string;
}) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function submitScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    const formData = new FormData(event.currentTarget);
    const request = buildRepoRateRequest({
      profile,
      profileId,
      requestId: crypto.randomUUID(),
      values: {
        currentDepositRateBps: Math.round(numberFrom(formData, "currentDepositRate") * 100),
        currentRepoRateBps: Math.round(numberFrom(formData, "currentRepoRate") * 100),
        depositPassThroughPercent: numberFrom(formData, "depositPassThrough"),
        horizonMonths: numberFrom(formData, "horizonMonths"),
        loanPassThroughPercent: numberFrom(formData, "loanPassThrough"),
        remainingLoanTermMonths: numberFrom(formData, "remainingLoanTermMonths"),
        repoRateChangeBps: numberFrom(formData, "repoRateChangeBps"),
      },
    });

    try {
      const response = await fetch("/api/simulations/repo-rate", {
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
      setError("The scenario service is temporarily unavailable. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  const loanImpact = result?.impacts.find((impact) => impact.id === "home-loan-emi");
  const depositImpact = result?.impacts.find((impact) => impact.id === "deposit-income");
  const emiNode = result?.causalGraph.nodes.find((node) => node.id === "monthly-emi");
  const loanRateNode = result?.causalGraph.nodes.find((node) => node.id === "loan-rate");
  const depositRateNode = result?.causalGraph.nodes.find((node) => node.id === "deposit-rate");
  const resetEmi = Number(emiNode?.value ?? 0);
  const originalEmi = resetEmi + Number(loanImpact?.annualImpactPaise ?? 0) / 12;

  return (
    <div className="repo-scenario-layout">
      <Card className="repo-scenario-form" elevated>
        <CardHeader eyebrow="Inputs and assumptions" title="Model one RBI repo-rate move" />
        <div className="repo-profile-strip">
          <span>
            <small>Home loan</small>
            <strong>{formatRupeesFromPaise(profile.outstandingHomeLoanPaise)}</strong>
          </span>
          <span>
            <small>Loan rate</small>
            <strong>{(profile.weightedLoanRateBps / 100).toFixed(2)}%</strong>
          </span>
          <span>
            <small>Fixed deposits</small>
            <strong>{formatRupeesFromPaise(profile.fixedDepositsPaise)}</strong>
          </span>
        </div>

        <form onSubmit={submitScenario}>
          <fieldset>
            <legend>Policy scenario</legend>
            <div className="repo-field-grid">
              <TextField defaultValue="6.50" label="Current repo rate (%)" max={100} min={0} name="currentRepoRate" required step="0.01" type="number" />
              <TextField defaultValue="-100" hint="Use a negative value for a cut." label="Repo-rate change (bps)" max={1000} min={-1000} name="repoRateChangeBps" required step="1" type="number" />
              <TextField defaultValue="12" label="Result horizon (months)" max={120} min={1} name="horizonMonths" required step="1" type="number" />
            </div>
          </fieldset>

          <fieldset>
            <legend>Transmission assumptions</legend>
            <p>These are editable model choices, not promises about a bank&apos;s future pricing.</p>
            <div className="repo-field-grid">
              <TextField defaultValue="70" hint="Share of the policy move reaching the floating loan." label="Loan pass-through (%)" max={100} min={0} name="loanPassThrough" required step="1" type="number" />
              <TextField defaultValue="50" hint="Share reaching new or renewing deposit rates." label="Deposit pass-through (%)" max={100} min={0} name="depositPassThrough" required step="1" type="number" />
              <TextField defaultValue="180" hint="The saved profile does not yet store this value." label="Remaining loan term (months)" max={1200} min={1} name="remainingLoanTermMonths" required step="1" type="number" />
              <TextField defaultValue="7.25" hint="Gross annual rate before the modeled change." label="Current deposit rate (%)" max={100} min={0} name="currentDepositRate" required step="0.01" type="number" />
            </div>
          </fieldset>

          {error ? <p className="repo-scenario-error" role="alert">{error}</p> : null}
          <div className="repo-form-actions">
            <Button disabled={isPending} type="submit">
              {isPending ? "Running deterministic engine…" : "Calculate my impact"}
              {!isPending ? <Icon name="arrow" /> : null}
            </Button>
            <span>Money is sent as integer paise; rates are sent as basis points.</span>
          </div>
        </form>
      </Card>

      <div aria-live="polite" className="repo-result-column">
        {result && loanImpact && depositImpact ? (
          <>
            <Card className="repo-net-result" elevated>
              <div>
                <p className="eyebrow">Calculated annual net impact</p>
                <strong>{formatRupeesAndPaise(result.annualNetImpactPaise)}</strong>
                <span>Loan cash-flow effect plus modeled gross deposit-income effect.</span>
              </div>
              <ConfidenceBadge
                detail={result.confidence.rationale}
                level={confidenceLabel(result.confidence.level)}
              />
            </Card>

            <section aria-label="Deterministic outputs" className="repo-output-grid">
              <Card>
                <p>Modeled monthly EMI</p>
                <strong>{formatRupeesAndPaise(resetEmi)}</strong>
                <span>{formatRupeesAndPaise(originalEmi)} before the reset</span>
              </Card>
              <Card>
                <p>Annual loan cash-flow effect</p>
                <strong>{formatRupeesAndPaise(loanImpact.annualImpactPaise)}</strong>
                <span>Loan rate becomes {(Number(loanRateNode?.value ?? 0) / 100).toFixed(2)}%</span>
              </Card>
              <Card>
                <p>Annual deposit-income effect</p>
                <strong>{formatRupeesAndPaise(depositImpact.annualImpactPaise)}</strong>
                <span>Modeled renewal rate {(Number(depositRateNode?.value ?? 0) / 100).toFixed(2)}%</span>
              </Card>
            </section>

            <Card className="repo-uncertainty-card">
              <CardHeader eyebrow="Model uncertainty" title="A sensitivity range, not a probability" />
              <div className="repo-range">
                <span><small>Lower bound</small><strong>{formatRupeesAndPaise(result.uncertainty.p10AnnualImpactPaise)}</strong></span>
                <i aria-hidden="true" />
                <span><small>Selected assumptions</small><strong>{formatRupeesAndPaise(result.uncertainty.p50AnnualImpactPaise)}</strong></span>
                <i aria-hidden="true" />
                <span><small>Upper bound</small><strong>{formatRupeesAndPaise(result.uncertainty.p90AnnualImpactPaise)}</strong></span>
              </div>
              <p>{result.warnings[1]}</p>
            </Card>

            <Card className="repo-method-card">
              <CardHeader eyebrow="Calculation boundary" title="What is exact, and what is assumed" />
              <div>
                <section>
                  <h3>Deterministic</h3>
                  <ul>
                    <li>EMI before and after the supplied rate reset.</li>
                    <li>Gross annual simple interest on the supplied deposit balance.</li>
                    <li>Annual net impact from those two calculated paths.</li>
                  </ul>
                </section>
                <section>
                  <h3>Assumption-driven</h3>
                  <ul>
                    <li>How much of the RBI move reaches each product.</li>
                    <li>The remaining loan term and current deposit rate.</li>
                    <li>When the lender or bank actually reprices.</li>
                  </ul>
                </section>
              </div>
              <p className="repo-model-version">Model {result.modelVersion} · {result.warnings[0]}</p>
            </Card>
          </>
        ) : (
          <Card className="repo-result-empty">
            <p className="eyebrow">Ready to calculate</p>
            <h2>Your before-and-after result will appear here.</h2>
            <p>
              Start with the seeded assumptions, then change either pass-through percentage to
              see the deterministic outputs update.
            </p>
            <div aria-label="Scenario calculation path" className="repo-empty-path">
              <span>RBI rate</span><i>→</i><span>Product rates</span><i>→</i><span>Your cash flow</span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
