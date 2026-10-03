// Rounding and validation for what is stored. Pure, so a test can run it without a server.

export function money(value: unknown): number {
  const n = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.max(-500000, Math.min(500000, Math.round(n)));
}

/** Round to the nearest step. A stored figure is a band, so an exact price cannot single out one person. */
export function band(value: unknown, step: number): number {
  return Math.round(money(value) / step) * step;
}

/** The only shape of postcode that is stored: four digits, first one not zero. */
export function cleanPostcode(value: unknown): string | null {
  return typeof value === "string" && /^[1-9]\d{3}$/.test(value) ? value : null;
}

/** How the stored figures are rounded. Exported so the tests and the privacy notice say the same thing. */
export const BANDS = { price: 2500, quote: 500, annual: 100, saving: 50, cash: 500, payback: 0.5, litres: 1 } as const;

