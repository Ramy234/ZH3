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

/** The moves for each driver, low and high. Returns [] for a driver that does not apply to this case. */
function moves(r: Result): Record<Driver["id"], Record<Pick, Move> | null> {
  const a = r.answers;
  const fuel = a.fuel ?? "petrol";
  const scale = (key: string, base: number, f: number) => ({ key, value: base * f });
  const pump = (f: number) => [scale("pump.petrol", PUMP.petrol, f), scale("pump.diesel", PUMP.diesel, f), scale("pump.hybrid", PUMP.hybrid, f)];
  const priceKey = r.toggles.used ? "bevUsed" : "bevNew";
  const bevPrice = SPECS[r.bevClass][priceKey];
  const resale = SPECS[r.iceClass].resale;
  const home = r.official ? r.official.homeChf : RATES.home;
  const km = kmNeighbours(a.km);
  return {
    pump: fuel === "electric" ? null : {
      low: { overrides: pump(0.85), input: `${(PUMP[fuel === "diesel" ? "diesel" : "petrol"] * 0.85).toFixed(2)} francs a litre` },
      high: { overrides: pump(1.15), input: `${(PUMP[fuel === "diesel" ? "diesel" : "petrol"] * 1.15).toFixed(2)} francs a litre` },
    },
    home: {
      low: { overrides: r.official ? [] : [scale("rate.home", RATES.home, 0.75)], homeScale: r.official ? 0.75 : undefined, input: `${Math.round(home * 75)} rappen a kWh at home` },
      high: { overrides: r.official ? [] : [scale("rate.home", RATES.home, 1.25)], homeScale: r.official ? 1.25 : undefined, input: `${Math.round(home * 125)} rappen a kWh at home` },
    },
    public: {
      low: { overrides: [scale("rate.public", RATES.public, 0.75), scale("rate.publicPlan", RATES.publicPlan, 0.75)], input: `${Math.round(RATES.public * 75)} rappen a kWh on the road` },
      high: { overrides: [scale("rate.public", RATES.public, 1.25), scale("rate.publicPlan", RATES.publicPlan, 1.25)], input: `${Math.round(RATES.public * 125)} rappen a kWh on the road` },
    },
    km: r.alreadyElectric ? null : {
      low: { overrides: [], answers: { km: km.low }, input: KM_TEXT[km.low] },
      high: { overrides: [], answers: { km: km.high }, input: KM_TEXT[km.high] },
    },
    price: r.alreadyElectric ? null : {
      low: { overrides: [scale(`spec.${r.bevClass}.${priceKey}`, bevPrice, 0.9)], input: `${chf(bevPrice * 0.9)} for the electric car` },
      high: { overrides: [scale(`spec.${r.bevClass}.${priceKey}`, bevPrice, 1.1)], input: `${chf(bevPrice * 1.1)} for the electric car` },
    },
    resale: r.alreadyElectric ? null : {
      low: { overrides: [scale(`spec.${r.iceClass}.resale`, resale, 0.75)], input: `${chf(resale * 0.75)} for the car you have` },
      high: { overrides: [scale(`spec.${r.iceClass}.resale`, resale, 1.25)], input: `${chf(resale * 1.25)} for the car you have` },
    },
  };
}

function run(r: Result, picked: Move[]): Outcome {
  const overrides = picked.flatMap((m) => m.overrides);
  const answers = picked.reduce<Answers>((acc, m) => ({ ...acc, ...(m.answers ?? {}) }), r.answers);
  const homeScale = picked.reduce((acc, m) => acc * (m.homeScale ?? 1), 1);
  const official = r.official ? { ...r.official, homeChf: r.official.homeChf * homeScale } : null;
  return withDataset(overrides, () => outcome(evaluate(answers, r.toggles, official, r.canton)));
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
