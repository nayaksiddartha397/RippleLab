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
  buildOilPriceRequest,
  deriveOilExpenseInputs,
  type OilExpenseInputs,
} from "@/lib/scenarios/oil-price";

const CausalGraphExplorer = dynamic(
  () =>
    import("@/components/scenarios/causal-graph-explorer").then(
      (module) => module.CausalGraphExplorer,
    ),
  {
    loading: () => (
      <Card aria-live="polite" className="repo-causal-card repo-causal-loading">
        <p className="eyebrow">Interactive causal graph</p>
        <h2>Preparing your oil-to-household transmission path…</h2>
      </Card>
    ),
    ssr: false,
  },
);

type ExposurePreset = "commuter" | "low-driving" | "transit-renter";

const presetCopy: Record<ExposurePreset, { label: string; note: string }> = {
  commuter: {
    label: "Car commuter",
    note: "Higher direct litres plus the full profile-derived transport exposure.",
  },
  "transit-renter": {
    label: "Transit renter",
    note: "Low direct fuel use; public transport, food and utilities still transmit costs.",
  },
  "low-driving": {
    label: "Low-driving",
    note: "Minimal direct fuel use while indirect household channels remain visible.",
  },
};

const channels = [
  { id: "direct-fuel", label: "Direct vehicle fuel", impactId: "direct-fuel-impact" },
  { id: "transport", label: "Transport services", impactId: "transport-expense-impact" },
  { id: "food", label: "Food and groceries", impactId: "food-expense-impact" },
  { id: "utilities", label: "Utilities", impactId: "utilities-expense-impact" },
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
  return "RippleLab could not run this oil-price scenario. Check the assumptions and try again.";
}

function formatRetailPrice(value: unknown) {
  return `₹${(Number(value ?? 0) / 100).toFixed(2)} / litre`;
}

function exposureForPreset(
  preset: ExposurePreset,
  baseline: OilExpenseInputs,
): OilExpenseInputs {
  if (preset === "transit-renter") {
    return {
      ...baseline,
      monthlyFuelLitres: 8,
      transportSpendPaise: Math.round(baseline.transportSpendPaise * 0.6),
    };
  }
  if (preset === "low-driving") {
    return {
      ...baseline,
      monthlyFuelLitres: 5,
      transportSpendPaise: Math.round(baseline.transportSpendPaise * 0.35),
    };
  }
  return baseline;
}

export function OilPriceSimulator({
  profile,
  profileId,
}: {
  profile: FinancialProfile;
  profileId: string;
}) {
  const baselineExposure = useMemo(() => deriveOilExpenseInputs(profile), [profile]);
  const [preset, setPreset] = useState<ExposurePreset>("commuter");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const isHydrated = useIsHydrated();
  const exposure = exposureForPreset(preset, baselineExposure);

  async function submitScenario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    const formData = new FormData(event.currentTarget);
    const request = buildOilPriceRequest({
      profile,
      profileId,
      requestId: crypto.randomUUID(),
      values: {
        crudeToRetailPassThroughPercent: numberFrom(formData, "crudeToRetailPassThrough"),
        currentCrudePriceUsd: numberFrom(formData, "currentCrudePrice"),
        currentRetailFuelPricePaisePerLitre: Math.round(
          numberFrom(formData, "currentRetailFuelPrice") * 100,
        ),
        foodPassThroughPercent: numberFrom(formData, "foodPassThrough"),
        foodSpendPaise: Math.round(numberFrom(formData, "foodSpend") * 100),
        horizonMonths: numberFrom(formData, "horizonMonths"),
        monthlyFuelLitres: numberFrom(formData, "monthlyFuelLitres"),
        targetCrudePriceUsd: numberFrom(formData, "targetCrudePrice"),
        transportPassThroughPercent: numberFrom(formData, "transportPassThrough"),
        transportSpendPaise: Math.round(numberFrom(formData, "transportSpend") * 100),
        utilitiesPassThroughPercent: numberFrom(formData, "utilitiesPassThrough"),
        utilitiesSpendPaise: Math.round(numberFrom(formData, "utilitiesSpend") * 100),
      },
    });

    try {
      const response = await fetch("/api/simulations/oil-price", {
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
      setError("The oil-price engine is temporarily unavailable. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  const crudeNode = result?.causalGraph.nodes.find((node) => node.id === "crude-oil-price");
  const retailNode = result?.causalGraph.nodes.find((node) => node.id === "retail-fuel-price");
  const directImpact = result?.impacts.find((impact) => impact.id === "direct-fuel-impact");
  const indirectImpact = result
    ? result.impacts
        .filter((impact) => impact.id !== "direct-fuel-impact")
        .reduce((total, impact) => total + impact.annualImpactPaise, 0)
    : 0;

  return (
    <div className="repo-scenario-layout oil-layout">
      <Card className="repo-scenario-form oil-form" elevated>
        <CardHeader eyebrow="Inputs and assumptions" title="Build your household oil exposure" />
        <div className="repo-profile-strip oil-profile-strip">
          <span>
            <small>Essential expenses</small>
            <strong>{formatRupeesFromPaise(profile.monthlyEssentialExpensesPaise)}</strong>
          </span>
          <span>
            <small>City</small>
            <strong>{profile.city}</strong>
          </span>
          <span>
            <small>Housing</small>
            <strong>{profile.housingStatus.replaceAll("_", " ")}</strong>
          </span>
        </div>

        <form onSubmit={submitScenario}>
          <fieldset>
            <legend>Crude-oil scenario</legend>
            <p>These values are scenario inputs in US dollars per barrel, not a live forecast.</p>
            <div className="repo-field-grid oil-policy-fields">
              <TextField defaultValue="80.00" label="Current crude price (USD/barrel)" max={500} min={0.01} name="currentCrudePrice" required step="0.01" type="number" />
              <TextField defaultValue="120.00" label="Target crude price (USD/barrel)" max={500} min={0} name="targetCrudePrice" required step="0.01" type="number" />
              <TextField defaultValue="12" label="Impact horizon (months)" max={120} min={1} name="horizonMonths" required step="1" type="number" />
            </div>
          </fieldset>

          <fieldset>
            <legend>Exposure preset</legend>
            <p>Presets change visible inputs only; your saved financial profile is not overwritten.</p>
            <div className="oil-preset-grid">
              {(Object.keys(presetCopy) as ExposurePreset[]).map((item) => (
                <button
                  aria-pressed={preset === item}
                  className={preset === item ? "oil-preset oil-preset--active" : "oil-preset"}
                  key={item}
                  onClick={() => {
                    setPreset(item);
                    setResult(null);
                  }}
                  type="button"
                >
                  <strong>{presetCopy[item].label}</strong>
                  <span>{presetCopy[item].note}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset key={preset}>
            <legend>Direct fuel channel</legend>
            <div className="repo-field-grid">
              <TextField defaultValue="100.00" label="Current retail fuel price (₹/litre)" max={100000} min={0} name="currentRetailFuelPrice" required step="0.01" type="number" />
              <TextField defaultValue={exposure.monthlyFuelLitres} label="Monthly fuel use (litres)" max={1000000} min={0} name="monthlyFuelLitres" required step="0.1" type="number" />
              <TextField defaultValue="30" hint="Applied to the crude-price percentage change." label="Crude-to-retail pass-through (%)" max={200} min={0} name="crudeToRetailPassThrough" required step="1" type="number" />
            </div>
          </fieldset>

          <fieldset key={`${preset}-indirect`}>
            <legend>Indirect household channels</legend>
            <p>Each rate maps part of the crude-price percentage change into that expense.</p>
            <div className="oil-channel-fields">
              <div className="oil-channel-input">
                <TextField defaultValue={paiseToRupees(exposure.transportSpendPaise)} label="Transport services (₹/month)" max={1_000_000_000} min={0} name="transportSpend" required step="0.01" type="number" />
                <TextField defaultValue="12" label="Transport pass-through (%)" max={200} min={0} name="transportPassThrough" required step="1" type="number" />
              </div>
              <div className="oil-channel-input">
                <TextField defaultValue={paiseToRupees(exposure.foodSpendPaise)} label="Food and groceries (₹/month)" max={1_000_000_000} min={0} name="foodSpend" required step="0.01" type="number" />
                <TextField defaultValue="4" label="Food pass-through (%)" max={200} min={0} name="foodPassThrough" required step="1" type="number" />
              </div>
              <div className="oil-channel-input">
                <TextField defaultValue={paiseToRupees(exposure.utilitiesSpendPaise)} label="Utilities (₹/month)" max={1_000_000_000} min={0} name="utilitiesSpend" required step="0.01" type="number" />
                <TextField defaultValue="6" label="Utilities pass-through (%)" max={200} min={0} name="utilitiesPassThrough" required step="1" type="number" />
              </div>
            </div>
          </fieldset>

          {error ? <p className="repo-scenario-error" role="alert">{error}</p> : null}
          <div className="repo-form-actions">
            <Button disabled={!isHydrated || isPending} type="submit">
              {isPending
                ? "Tracing the oil shock…"
                : isHydrated
                  ? "Calculate oil-price impact"
                  : "Preparing secure calculator…"}
              {isHydrated && !isPending ? <Icon name="arrow" /> : null}
            </Button>
            <span>Crude, retail fuel, litres and rupees remain separate units.</span>
          </div>
        </form>
      </Card>

      <div aria-live="polite" className="repo-result-column">
        {result && directImpact ? (
          <>
            <Card className="repo-net-result" elevated>
              <div>
                <p className="eyebrow">Estimated annual household effect</p>
                <strong>{formatRupeesAndPaise(result.annualNetImpactPaise)}</strong>
                <span>Direct fuel plus three indirect channels under the selected assumptions.</span>
              </div>
              <ConfidenceBadge detail={result.confidence.rationale} level={confidenceLabel(result.confidence.level)} />
            </Card>

            <section aria-label="Oil-price outputs" className="repo-output-grid oil-output-grid">
              <Card><p>Target crude scenario</p><strong>${Number(crudeNode?.value ?? 0).toFixed(2)} / barrel</strong><span>Global scenario unit</span></Card>
              <Card><p>Modeled retail fuel</p><strong>{formatRetailPrice(retailNode?.value)}</strong><span>Local editable starting point</span></Card>
              <Card><p>Direct fuel effect</p><strong>{formatRupeesAndPaise(directImpact.annualImpactPaise)}</strong><span>Litres × retail price change</span></Card>
              <Card><p>Indirect effects</p><strong>{formatRupeesAndPaise(indirectImpact)}</strong><span>Transport + food + utilities</span></Card>
            </section>

            <Card className="oil-driver-card">
              <CardHeader eyebrow="Household channels" title="Where the annual effect comes from" />
              <div className="oil-driver-table" role="table" aria-label="Oil-price household impacts" tabIndex={0}>
                <div className="oil-driver-row oil-driver-row--header" role="row">
                  <span role="columnheader">Channel</span>
                  <span role="columnheader">Modeled relationship</span>
                  <span role="columnheader">Annual effect</span>
                </div>
                {channels.map((channel) => {
                  const impact = result.impacts.find((item) => item.id === channel.impactId);
                  return (
                    <div className="oil-driver-row" key={channel.id} role="row">
                      <strong role="cell">{channel.label}</strong>
                      <span role="cell">{channel.id === "direct-fuel" ? "Retail Δ × litres" : "Crude % Δ × spend × pass-through"}</span>
                      <span role="cell">{formatRupeesAndPaise(Number(impact?.annualImpactPaise ?? 0))}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="repo-uncertainty-card">
              <CardHeader eyebrow="Model uncertainty" title="Transmission sensitivity, not a probability" />
              <div className="repo-range">
                <span><small>Higher cost transmission</small><strong>{formatRupeesAndPaise(result.uncertainty.p10AnnualImpactPaise)}</strong></span>
                <i aria-hidden="true" />
                <span><small>Selected assumptions</small><strong>{formatRupeesAndPaise(result.uncertainty.p50AnnualImpactPaise)}</strong></span>
                <i aria-hidden="true" />
                <span><small>Lower cost transmission</small><strong>{formatRupeesAndPaise(result.uncertainty.p90AnnualImpactPaise)}</strong></span>
              </div>
              <p>{result.warnings[2]}</p>
            </Card>

            <Card className="repo-method-card">
              <CardHeader eyebrow="Calculation boundary" title="Household arithmetic with visible transmission choices" />
              <div>
                <section><h3>Deterministic</h3><ul><li>Crude percentage change and modeled retail price.</li><li>Direct annual fuel spending effect.</li><li>Four-channel annual household total.</li></ul></section>
                <section><h3>Assumption-driven</h3><ul><li>Crude-to-retail fuel transmission.</li><li>Transport, food and utility pass-through.</li><li>Monthly fuel use and category spending.</li></ul></section>
              </div>
              <p className="repo-model-version">Model {result.modelVersion} · {result.warnings[0]}</p>
            </Card>
          </>
        ) : (
          <Card className="repo-result-empty oil-result-empty">
            <p className="eyebrow">Ready to calculate</p>
            <h2>Your personal oil-price ripple will appear here.</h2>
            <p>Choose an exposure preset, edit any value, then compare direct driving costs with the less visible indirect channels.</p>
            <div aria-label="Oil-price calculation path" className="repo-empty-path">
              <span>Crude oil</span><i>→</i><span>Retail + indirect costs</span><i>→</i><span>Your household</span>
            </div>
          </Card>
        )}
      </div>

      {result ? <CausalGraphExplorer key={result.requestId} result={result} /> : null}
    </div>
  );
}
