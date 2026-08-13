import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function EmptyState({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="state state--empty">
      <span aria-hidden="true" className="state__illustration">
        ○
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </section>
  );
}

export function LoadingState({ label = "Loading your economic view" }: { label?: string }) {
  return (
    <div aria-live="polite" className="state state--loading" role="status">
      <span aria-hidden="true" className="loading-orbit" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  description,
  onRetry,
  title = "We could not load this view",
}: {
  description: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <section className="state state--error" role="alert">
      <span aria-hidden="true" className="state__illustration">
        !
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
    </section>
  );
}
