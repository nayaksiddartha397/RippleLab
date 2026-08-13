"use client";

import { useState } from "react";

import { Card, CardHeader } from "@/components/ui/card";
import { ConfidenceBadge } from "@/components/ui/confidence-badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { SelectField, TextField } from "@/components/ui/form-field";

const impactCards = [
  { label: "Monthly cash flow", value: "Awaiting profile", trend: "Personal income and expenses", tone: "neutral" },
  { label: "Debt sensitivity", value: "Not connected", trend: "Loans and rate exposure", tone: "negative" },
  { label: "Savings buffer", value: "To be calculated", trend: "Cash and emergency runway", tone: "positive" },
];

export function DashboardPreview() {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <div className="dashboard-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Personal economic dashboard</p>
          <h1>Build a clearer picture before the next ripple.</h1>
          <p>
            Your financial profile will anchor every scenario. Day 2 establishes the interface;
            profile capture begins next.
          </p>
        </div>
        <div className="page-heading__aside">
          <ConfidenceBadge detail="Based on the product model and selected sources." level="Medium" />
          <span>Model confidence will be visible beside every result.</span>
        </div>
      </section>

      <section className="metric-grid" aria-label="Financial impact preview">
        {impactCards.map((card) => (
          <Card className="metric-card" key={card.label}>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
            <span className={`metric-card__trend metric-card__trend--${card.tone}`}>{card.trend}</span>
          </Card>
        ))}
      </section>

      <section className="dashboard-grid">
        <Card className="scenario-card" elevated>
          <CardHeader eyebrow="Scenario builder" title="What would you like to explore?" />
          <form
            className="scenario-form"
            onSubmit={(event) => {
              event.preventDefault();
              setIsPreviewOpen(true);
            }}
          >
            <TextField
              hint="Day 3 will add natural-language interpretation and confirmation."
              label="Economic question"
              placeholder="What if RBI cuts the repo rate by 1%?"
            />
            <div className="scenario-form__row">
              <SelectField
                label="Scenario family"
                options={[
                  { label: "Repo-rate change", value: "repo" },
                  { label: "Inflation increase", value: "inflation" },
                  { label: "Oil-price increase", value: "oil" },
                ]}
              />
              <SelectField
                label="View"
                options={[
                  { label: "Personal impact", value: "personal" },
                  { label: "Representative persona", value: "persona" },
                ]}
              />
            </div>
            <div className="scenario-form__actions">
              <Button type="submit">
                Preview scenario structure <Icon name="arrow" />
              </Button>
              <span>Nothing is saved or calculated yet.</span>
            </div>
          </form>
        </Card>

        <Card className="causal-preview">
          <CardHeader
            action={<span className="readiness-pill">Coming Day 7</span>}
            eyebrow="Causal graph"
            title="Trace the chain, not just the number"
          />
          <div aria-label="Illustrative repo-rate causal path" className="causal-path" role="img">
            <span>Repo rate</span>
            <Icon name="chevron" />
            <span>Loan rate</span>
            <Icon name="chevron" />
            <span>Monthly EMI</span>
            <Icon name="chevron" />
            <span className="causal-path__highlight">Your cash flow</span>
          </div>
          <p>
            Every link will reveal its mechanism, model assumption, source and confidence level.
          </p>
          <div className="mini-data-viz" aria-hidden="true">
            <span className="mini-data-viz__label">uncertainty range</span>
            <svg viewBox="0 0 308 74">
              <path d="M2 61C31 57 42 38 69 44c34 7 39-35 71-29 36 6 40 28 66 25 30-3 34-28 54-18 17 8 22 15 46-9" />
              <path className="mini-data-viz__baseline" d="M2 57h304" />
              <circle cx="140" cy="16" r="4" />
            </svg>
          </div>
        </Card>
      </section>

      <section className="readiness-row" aria-label="MVP readiness">
        <div>
          <Icon name="chart" />
          <div>
            <strong>Transparent by design</strong>
            <span>Source, formula and confidence treatments are part of the base component library.</span>
          </div>
        </div>
        <Button onClick={() => setIsPreviewOpen(true)} size="sm" tone="secondary">
          See the Day 2 preview
        </Button>
      </section>

      <Dialog
        description="The app shell is ready. Profiles, calculations and live scenarios are intentionally still gated by the delivery plan."
        onOpenChange={setIsPreviewOpen}
        open={isPreviewOpen}
        title="Scenario workspace is taking shape"
      >
        <ul className="dialog__list">
          <li>
            <strong>Today:</strong> responsive controls, data states and evidence-ready confidence treatments.
          </li>
          <li>
            <strong>Day 3:</strong> account access and protected dashboard routing.
          </li>
          <li>
            <strong>Day 7:</strong> the first working repo-rate simulation.
          </li>
        </ul>
        <Button onClick={() => setIsPreviewOpen(false)}>Back to the dashboard</Button>
      </Dialog>
    </div>
  );
}
