/**
 * Number-formatting helpers used by the dashboard.
 * All functions are pure and safe to call during SSR.
 */

/** Format a ratio (0–1) as a percentage string, e.g. 0.613 → "61%" */
export function formatPercent(ratio: number, fractionDigits = 0): string {
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}

/**
 * Format a percentage-point delta, e.g. 3.8 → "+3.8 pp"
 * Always includes the sign prefix.
 */
export function formatPp(pp: number, fractionDigits = 1): string {
  const sign = pp >= 0 ? "+" : "";
  return `${sign}${pp.toFixed(fractionDigits)} pp`;
}

/**
 * Format a large integer with compact notation, e.g. 24_000 → "24K"
 * Falls back to plain string for small numbers.
 */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Format an ISO timestamp as a locale date string in UTC.
 * Using a fixed locale and timeZone prevents SSR/client hydration mismatches.
 *
 * @example formatUtcDate("2026-11-07T10:00:00.000Z") → "Nov 7, 2026"
 */
export function formatUtcDate(isoString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(isoString));
}

/**
 * Format an accuracy value (0–1) as a percentage with one decimal place.
 * e.g. 0.816 → "81.6%"
 */
export function formatAccuracy(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
