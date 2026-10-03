// "Your ordinary week, in battery". Plain division on numbers the model already holds, plus the class battery placeholder.
// The week is the yearly kilometres over 52, spread evenly. No winter factor, no speed, no invented day-by-day pattern.
import { SPECS, type Result } from "./model.ts";

export type Week = {
  weekKm: number;
  weekKwh: number;
  battery: number;
  /** Share of one battery an ordinary week uses. Above 1 means more than one full battery a week. */
  share: number;
  /** Kilometres one full battery covers at the class consumption. */
  fullChargeKm: number;
  coversWeek: boolean;
  mix: { home: number; work: number; public: number };
};

export function ordinaryWeek(r: Result): Week {
  const spec = SPECS[r.bevClass];
  const weekKm = r.km / 52;
  const weekKwh = (weekKm * spec.kwh) / 100;
  const fullChargeKm = (spec.battery / spec.kwh) * 100;
  return {
    weekKm,
    weekKwh,
    battery: spec.battery,
    share: weekKwh / spec.battery,
    fullChargeKm,
    coversWeek: fullChargeKm >= weekKm,
    mix: r.blend,
  };
}
