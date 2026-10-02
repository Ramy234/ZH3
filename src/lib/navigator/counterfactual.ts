// "What would have to be true". Pure arithmetic on a finished Result and the model's own switches.
// It adds no figure of its own: the study window is RATES.horizon, and each lever is a re-run of evaluate().
// It never recommends a car. "Keep this car" stays a complete ending.
import { RATES, evaluate, type Result, type Toggles } from "./model.ts";

export type LeverKey = Exclude<keyof Toggles, "insDiscount">;
export type Lever = { key: LeverKey; paybackAfter: number; reaches: boolean };

export type Counterfactual =
  | { kind: "none" }
  | { kind: "no-saving"; best: Lever | null }
  | { kind: "covered"; window: number; room: number }
  | { kind: "late"; window: number; extraPriceMustFall: number; yearlySavingMustRise: number; best: Lever | null };

const LEVERS: LeverKey[] = ["used", "rightSize", "work", "home", "publicPlan", "tariff", "pv"];
const MIN_SAVING = 40; // the model's own floor: below this there is no payback year

function bestLever(r: Result, window: number): Lever | null {
  let best: Lever | null = null;
  for (const key of LEVERS) {
    if (r.toggles[key]) continue;
    const next = evaluate(r.answers, { ...r.toggles, [key]: true }, r.official, r.canton);
    if (next.saving <= MIN_SAVING || next.paybackYears == null) continue;
    if (r.paybackYears != null && next.paybackYears >= r.paybackYears - 0.05) continue;
    const lever = { key, paybackAfter: next.paybackYears, reaches: next.paybackYears <= window };
    if (!best || lever.paybackAfter < best.paybackAfter) best = lever;
  }
  return best;
}

export function wouldHaveToBeTrue(r: Result): Counterfactual {
  if (r.alreadyElectric) return { kind: "none" };
  const window = RATES.horizon;
  if (r.paybackYears == null || r.saving <= MIN_SAVING) return { kind: "no-saving", best: bestLever(r, window) };
  const room = Math.round(r.saving * window - r.cash);
  if (r.paybackYears <= window) return { kind: "covered", window, room: Math.max(0, room) };
  return {
    kind: "late",
    window,
    extraPriceMustFall: Math.max(0, -room),
    yearlySavingMustRise: Math.max(0, Math.ceil(r.cash / window - r.saving)),
    best: bestLever(r, window),
  };
}
