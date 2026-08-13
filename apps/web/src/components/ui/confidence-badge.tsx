import type { ConfidenceLevel } from "@/lib/design-tokens";
import { cn } from "@/lib/cn";

export function ConfidenceBadge({
  level,
  detail,
}: {
  level: ConfidenceLevel;
  detail?: string;
}) {
  const levelClass = level.toLowerCase();

  return (
    <span className={cn("confidence-badge", `confidence-badge--${levelClass}`)} title={detail}>
      <span aria-hidden="true" className="confidence-badge__dot" />
      <span>{level} confidence</span>
    </span>
  );
}
