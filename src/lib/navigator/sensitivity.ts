// "What moves the answer". Re-runs the model with one assumption moved at a time (a tornado chart), and all of them
// together in the kind direction and the unkind direction (the range). Every number it shows is a re-run of evaluate().
// It adds no figure of its own and never changes the model: withDataset puts every number back.
import { PUMP, RATES, SPECS, evaluate, type Answers, type KmBand, type Result } from "./model.ts";
import { withDataset } from "./dataset.ts";

/** Payback beyond this is drawn as "never pays in a lifetime". */
export const CAP_YEARS = 40;
const MIN_SAVING = 40; // the model's own floor: at or below this there is no payback year

export type Outcome = { payback: number | null; saving: number };
export type Side = Outcome & { input: string };
export type Driver = {
  id: "pump" | "home" | "public" | "km" | "price" | "resale";
  label: string;
  /** Plain words for what was moved, e.g. "15 percent either way". */
  moved: string;
  worse: Side;
  better: Side;
  /** Width of the bar in years, capped. */
  swing: number;
};
export type Sensitivity = {
  base: Outcome;
  drivers: Driver[];
  /** All kind assumptions together, and all unkind ones together. */
  best: Outcome;
  worst: Outcome;
};

type Pick = "low" | "high";
type Move = { overrides: { key: string; value: number }[]; answers?: Partial<Answers>; homeScale?: number; input: string };

const KM_TEXT: Record<KmBand, string> = { lt10: "under 10,000 km a year", mid: "10,000 to 20,000 km a year", gt20: "over 20,000 km a year", unsure: "10,000 to 20,000 km a year" };
const chf = (n: number) => `CHF ${Math.round(n).toLocaleString("de-CH")}`;

function outcome(r: Result): Outcome {
  const payback = r.paybackYears != null && r.saving > MIN_SAVING ? r.paybackYears : null;
  return { payback, saving: r.saving };
}
const years = (o: Outcome) => (o.payback == null ? CAP_YEARS : Math.min(CAP_YEARS, o.payback));

function kmNeighbours(band: KmBand | null): { low: KmBand; high: KmBand } {
  if (band === "lt10") return { low: "lt10", high: "mid" };
  if (band === "gt20") return { low: "mid", high: "gt20" };
  if (band === "mid") return { low: "lt10", high: "gt20" };
  return { low: "lt10", high: "gt20" };
}

type Applies = Move & { applies: boolean };
const NONE: Applies = { overrides: [], input: "", applies: false };

/**
 * One assumption moved to a point on its own scale: t = -1 is the low end, 0 is as it is, +1 is the high end.
 * The low and high ends are exactly the ones the tornado used. The slider on the result page uses the points between.
 * Distance is one of three bands, so it only has the two ends and "as it is".
 */
export function moveAt(r: Result, id: Driver["id"], t: number): Applies {
  const a = r.answers;
  const k = Math.max(-1, Math.min(1, t));
  const f = (span: number) => 1 + span * k;
  const scale = (key: string, base: number, factor: number) => ({ key, value: base * factor });
  const fuel = a.fuel ?? "petrol";
  switch (id) {
    case "pump": {
      if (fuel === "electric") return NONE;
      const g = f(0.15);
      const one = PUMP[fuel === "diesel" ? "diesel" : "petrol"];
      return {
        overrides: [scale("pump.petrol", PUMP.petrol, g), scale("pump.diesel", PUMP.diesel, g), scale("pump.hybrid", PUMP.hybrid, g)],
        input: `${(one * g).toFixed(2)} francs a litre`,
        applies: true,
      };
    }
    case "home": {
      const g = f(0.25);
      const home = r.official ? r.official.homeChf : RATES.home;
      return {
        overrides: r.official ? [] : [scale("rate.home", RATES.home, g)],
        homeScale: r.official ? g : undefined,
        input: `${Math.round(home * g * 100)} rappen a kWh at home`,
        applies: true,
      };
    }
    case "public": {
      const g = f(0.25);
      return {
        overrides: [scale("rate.public", RATES.public, g), scale("rate.publicPlan", RATES.publicPlan, g)],
        input: `${Math.round(RATES.public * g * 100)} rappen a kWh on the road`,
        applies: true,
      };
    }
    case "km": {
      if (r.alreadyElectric) return NONE;
      const n = kmNeighbours(a.km);
      const moved = k <= -0.5 || k >= 0.5;
      const band = k <= -0.5 ? n.low : k >= 0.5 ? n.high : (a.km ?? "unsure");
      return { overrides: [], answers: moved ? { km: band } : {}, input: KM_TEXT[band], applies: true };
    }
    case "price": {
      if (r.alreadyElectric) return NONE;
      const priceKey = r.toggles.used ? "bevUsed" : "bevNew";
      const bevPrice = SPECS[r.bevClass][priceKey];
      const g = f(0.1);
      return { overrides: [scale(`spec.${r.bevClass}.${priceKey}`, bevPrice, g)], input: `${chf(bevPrice * g)} for the electric car`, applies: true };
    }
    case "resale": {
      if (r.alreadyElectric) return NONE;
      const resale = SPECS[r.iceClass].resale;
      const g = f(0.25);
      return { overrides: [scale(`spec.${r.iceClass}.resale`, resale, g)], input: `${chf(resale * g)} for the car you have`, applies: true };
    }
  }
}

const DRIVER_IDS: Driver["id"][] = ["pump", "home", "public", "km", "price", "resale"];

/** The moves for each driver, low and high. null for a driver that does not apply to this case. */
function moves(r: Result): Record<Driver["id"], Record<Pick, Move> | null> {
  const out = {} as Record<Driver["id"], Record<Pick, Move> | null>;
  for (const id of DRIVER_IDS) {
    const lo = moveAt(r, id, -1);
    const hi = moveAt(r, id, 1);
    out[id] = lo.applies && hi.applies ? { low: lo, high: hi } : null;
  }
  return out;
}

function runResult(r: Result, picked: Move[]): Result {
  const overrides = picked.flatMap((m) => m.overrides);
  const answers = picked.reduce<Answers>((acc, m) => ({ ...acc, ...(m.answers ?? {}) }), r.answers);
  const homeScale = picked.reduce((acc, m) => acc * (m.homeScale ?? 1), 1);
  const official = r.official ? { ...r.official, homeChf: r.official.homeChf * homeScale } : null;
  return withDataset(overrides, () => evaluate(answers, r.toggles, official, r.canton));
}

function run(r: Result, picked: Move[]): Outcome {
  return outcome(runResult(r, picked));
}

/**
 * What the case looks like with some assumptions moved on the sliders. Returns a full Result, so the page can draw the
 * changed line and the changed numbers next to the real ones. It never replaces the real result and never stores anything.
 */
export function scenario(r: Result, picks: Partial<Record<Driver["id"], number>>): Result | null {
  if (r.alreadyElectric) return null;
  const picked: Move[] = [];
  for (const id of DRIVER_IDS) {
    const t = picks[id];
    if (t == null || t === 0) continue;
    const m = moveAt(r, id, t);
    if (m.applies) picked.push(m);
  }
  if (picked.length === 0) return null;
  return runResult(r, picked);
}

/** The assumptions a slider can move for this case, in the tornado's order, with the end points and the current point in words. */
export function sliderDrivers(r: Result, sens: Sensitivity | null): { id: Driver["id"]; label: string; low: string; high: string; now: string }[] {
  if (!sens) return [];
  return sens.drivers.map((d) => ({
    id: d.id,
    label: d.label,
    low: moveAt(r, d.id, -1).input,
    high: moveAt(r, d.id, 1).input,
    now: moveAt(r, d.id, 0).input,
  }));
}

const LABEL: Record<Driver["id"], { label: string; moved: string }> = {
  pump: { label: "Petrol or diesel price", moved: "15 percent either way" },
  home: { label: "Electricity price at home", moved: "25 percent either way" },
  public: { label: "Charging price on the road", moved: "25 percent either way" },
  km: { label: "Kilometres a year", moved: "one band either way" },
  price: { label: "Price of the electric car", moved: "10 percent either way" },
  resale: { label: "What your car sells for", moved: "25 percent either way" },
};

export function sensitivity(r: Result): Sensitivity | null {
  if (r.alreadyElectric) return null;
  const base = outcome(r);
  const all = moves(r);
  const drivers: Driver[] = [];
  const kind: Move[] = [];
  const unkind: Move[] = [];
  for (const id of Object.keys(all) as Driver["id"][]) {
    const m = all[id];
    if (!m) continue;
    const lo = run(r, [m.low]);
    const hi = run(r, [m.high]);
    const loBetter = years(lo) <= years(hi);
    const better = loBetter ? { ...lo, input: m.low.input } : { ...hi, input: m.high.input };
    const worse = loBetter ? { ...hi, input: m.high.input } : { ...lo, input: m.low.input };
    kind.push(loBetter ? m.low : m.high);
    unkind.push(loBetter ? m.high : m.low);
    drivers.push({ id, ...LABEL[id], better, worse, swing: years(worse) - years(better) });
  }
  drivers.sort((x, y) => y.swing - x.swing);
  return { base, drivers, best: run(r, kind), worst: run(r, unkind) };
}

/** "year 14", "never", or a range sentence, for the labels. */
export function paybackWord(o: Outcome): string {
  return o.payback == null ? "never" : o.payback < 1 ? "under a year" : `year ${Math.ceil(o.payback)}`;
}
