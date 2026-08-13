"use client";

import { ErrorState } from "@/components/ui/states";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="route-error">
      <ErrorState
        description="Your work has not been changed. Try loading the workspace again."
        onRetry={reset}
        title="The workspace needs another try"
      />
    </main>
  );
}
