export function paiseToRupees(paise: number) {
  return String(paise / 100);
}

export function basisPointsToPercent(basisPoints: number) {
  return String(basisPoints / 100);
}

export function formatRupeesFromPaise(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(paise / 100);
}

export function formatRupeesAndPaise(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(paise / 100);
}

export function labelFromValue(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
