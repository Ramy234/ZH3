// "Older than usual". Every figure has a date. A pump price goes stale in weeks, a yearly tariff in a year, a study when a new one
// is out. This is a display rule only: it never changes a number or the sum. Pure, so a test can pin it.

const DAY = 86_400_000;

/** Days after which a figure with this dataset key (or fact key) is older than usual. */
export function usualDays(key: string): number {
  if (key.startsWith("pump.") || key === "pump") return 45;
  if (key.startsWith("rate.home") || key.startsWith("rate.public") || key.includes("tariff")) return 400;
  if (key.startsWith("tax.") || key.startsWith("canton")) return 400;
  if (key.startsWith("spec.") || key.startsWith("rate.horizon")) return 730;
  return 400;
}

export function ageDays(asOf: string | null | undefined, now: Date = new Date()): number | null {
  if (!asOf) return null;
  const t = Date.parse(asOf.length === 10 ? `${asOf}T12:00:00Z` : asOf);
  if (!Number.isFinite(t)) return null;
  return Math.floor((now.getTime() - t) / DAY);
}

export function olderThanUsual(key: string, asOf: string | null | undefined, now: Date = new Date()): boolean {
  const age = ageDays(asOf, now);
  return age != null && age > usualDays(key);
}
