export const colorTokens = [
  { name: "Canvas", variable: "--color-canvas", value: "#F5F7FB", role: "Application background" },
  { name: "Ink", variable: "--color-ink", value: "#172033", role: "Primary text and navigation" },
  { name: "Ripple", variable: "--color-ripple-600", value: "#236C83", role: "Primary actions and active states" },
  { name: "Signal", variable: "--color-signal-500", value: "#E0922B", role: "Attention and uncertainty" },
  { name: "Positive", variable: "--color-positive-600", value: "#267A54", role: "Favourable impact" },
  { name: "Negative", variable: "--color-negative-600", value: "#B84E5D", role: "Adverse impact" },
  { name: "Data violet", variable: "--color-data-violet", value: "#7162B7", role: "Comparison series" },
] as const;

export const spacingTokens = [
  { name: "Compact", value: "0.5rem", role: "Inside dense controls" },
  { name: "Default", value: "1rem", role: "Card padding and small groups" },
  { name: "Section", value: "1.5rem", role: "Related content groups" },
  { name: "Page", value: "2rem", role: "Desktop content padding" },
] as const;

export const confidenceLevels = ["High", "Medium", "Low"] as const;

export type ConfidenceLevel = (typeof confidenceLevels)[number];
