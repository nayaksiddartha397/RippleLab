"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfidenceBadge } from "@/components/ui/confidence-badge";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { SelectField, TextField } from "@/components/ui/form-field";
import { colorTokens, spacingTokens } from "@/lib/design-tokens";

export function DesignSystemShowcase() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  return (
    <div className="showcase-stack">
      <section className="page-heading page-heading--showcase">
        <div>
          <p className="eyebrow">Day 2 component gallery</p>
          <h1>Interfaces built for uncertain outcomes.</h1>
          <p>
            A small, opinionated system for explaining economics without pretending every result is
            certain.
          </p>
        </div>
        <div className="page-heading__aside">
          <span className="readiness-pill">Keyboard-ready</span>
          <span>Focus, status and error states are treated as product UI.</span>
        </div>
      </section>

      <section className="showcase-grid showcase-grid--tokens" aria-labelledby="tokens-heading">
        <Card>
          <CardHeader eyebrow="Foundations" title="Color tokens" />
          <div className="token-list" id="tokens-heading">
            {colorTokens.map((token) => (
              <div className="token-list__row" key={token.variable}>
                <span className="color-swatch" style={{ backgroundColor: token.value }} />
                <div>
                  <strong>{token.name}</strong>
                  <span>{token.role}</span>
                </div>
                <code>{token.value}</code>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Foundations" title="Spacing and type" />
          <div className="type-sample">
            <span className="eyebrow">Eyebrow / 12px</span>
            <strong>Headings prioritize the decision.</strong>
            <p>Body copy gives caveats, assumptions and context room to breathe.</p>
          </div>
          <div className="spacing-list">
            {spacingTokens.map((token) => (
              <div className="spacing-list__row" key={token.name}>
                <span>{token.name}</span>
                <i style={{ width: token.value }} />
                <code>{token.value}</code>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="showcase-grid" aria-label="Reusable components">
        <Card>
          <CardHeader eyebrow="Actions" title="Buttons and confidence" />
          <div className="component-row">
            <Button>Primary action</Button>
            <Button tone="secondary">Secondary</Button>
            <Button tone="quiet">Quiet action</Button>
          </div>
          <div className="component-row component-row--badges">
            <ConfidenceBadge detail="Evidence is direct and assumptions are narrow." level="High" />
            <ConfidenceBadge detail="Some scenario inputs remain assumption-driven." level="Medium" />
            <ConfidenceBadge detail="Evidence is limited or highly assumption-driven." level="Low" />
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Inputs" title="Fields communicate their state" />
          <div className="showcase-form">
            <TextField hint="Use a short, specific question." label="Scenario name" placeholder="A gentler rate path" />
            <SelectField
              label="Evidence mode"
              options={[
                { label: "Show assumptions", value: "show" },
                { label: "Compact", value: "compact" },
              ]}
            />
            <TextField error="Use an amount above zero." label="Monthly rent" placeholder="₹0" />
          </div>
        </Card>
      </section>

      <section className="showcase-grid" aria-label="System states">
        <Card>
          <CardHeader eyebrow="No data" title="Empty state" />
          <EmptyState
            action={<Button size="sm">Add a financial profile</Button>}
            description="Profiles will be private and editable before any simulation runs."
            title="Your first economic twin starts here"
          />
        </Card>
        <Card>
          <CardHeader eyebrow="In progress" title="Loading state" />
          <LoadingState label="Preparing transparent scenario inputs" />
          <CardHeader eyebrow="Unexpected outcome" title="Error state" />
          <ErrorState
            description={retryCount === 0 ? "The latest policy input could not be loaded." : "Retry recorded. The connection is ready to try again."}
            onRetry={() => setRetryCount((count) => count + 1)}
          />
        </Card>
      </section>

      <section className="showcase-dialog-row">
        <div>
          <p className="eyebrow">Dialog pattern</p>
          <h2>Interrupt only when a decision needs context.</h2>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Open example dialog</Button>
      </section>

      <Dialog
        description="Native dialog semantics provide escape-key support and correctly identify this temporary focused context."
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        title="Review your assumptions"
      >
        <p>
          Later scenario forms will use this pattern before a calculation is saved or a sensitive
          personal field is shared.
        </p>
        <Button onClick={() => setDialogOpen(false)}>Understood</Button>
      </Dialog>
    </div>
  );
}
