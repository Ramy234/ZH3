/**
 * The numbers the model uses, as rows the research team can edit and source.
 * The seed is read straight from the constants in model.ts, so the two cannot drift:
 * dataset.test.ts checks that applying the seed changes nothing.
 * The arithmetic stays in model.ts. A dataset row only replaces a number, never a formula.
 */
import { DATASET, PUMP, RATES, SPECS } from "./model.ts";
import type { CarClass, Spec } from "./model.ts";

export type DatasetStatus = "placeholder" | "sourced" | "official" | "live";

export type DatasetRow = {
  key: string;
  value: number;
  unit: string;
  status: DatasetStatus;
  publisher: string | null;
  published_on: string | null;
  source_url: string | null;
  note: string;
};

export const SEED_VERSION = DATASET;

const RATE_META: Record<string, { unit: string; note: string }> = {
  home: { unit: "CHF/kWh", note: "Home electricity. Replaced by the ElCom mean when a canton or commune is picked." },
  homeSpecial: { unit: "CHF/kWh", note: "Home electricity on an off-peak or electric-car tariff. Illustrative." },
  work: { unit: "CHF/kWh", note: "Illustrative staff rate at work. Not free electricity." },
  public: { unit: "CHF/kWh", note: "Public charging. No maintained Swiss tariff feed exists." },
  publicPlan: { unit: "CHF/kWh", note: "Public charging on a subscription plan. Illustrative." },
  pv: { unit: "CHF/kWh", note: "Own solar power, opportunity cost." },
  pvShare: { unit: "share", note: "Share of home kilometres charged from own solar when the switch is on." },
  rentalDay: { unit: "CHF/day", note: "Day rate for a larger rental car. Not a rental company." },
  wallbox: { unit: "CHF", note: "Wallbox and install, house or own garage." },
  sharedInstall: { unit: "CHF", note: "Share of an install in a shared garage." },
  batteryCheck: { unit: "CHF", note: "Battery-health check on a used car." },
  horizon: { unit: "years", note: "Window of the picture." },
};

const SPEC_UNIT: Record<keyof Spec, string> = {
  iceL: "l/100km",
  iceIns: "CHF/year",
  iceTax: "CHF/year",
  iceMaint: "CHF/year",
  resale: "CHF",
  bevNew: "CHF",
  bevUsed: "CHF",
  kwh: "kWh/100km",
  bevIns: "CHF/year",
  bevTax: "CHF/year",
  bevMaint: "CHF/year",
};

const TCO = {
  publisher: "EnergieSchweiz, Swiss Federal Office of Energy",
  published_on: "2023-03-23",
  source_url: "https://www.newsd.admin.ch/newsd/message/attachments/76353.pdf",
};

export function seedRows(): DatasetRow[] {
  const rows: DatasetRow[] = [];
  for (const [name, value] of Object.entries(RATES)) {
    const meta = RATE_META[name]!;
    const sourced = name === "horizon";
    rows.push({
      key: `rate.${name}`,
      value,
      unit: meta.unit,
      status: sourced ? "sourced" : "placeholder",
      publisher: sourced ? TCO.publisher : null,
      published_on: sourced ? TCO.published_on : null,
      source_url: sourced ? TCO.source_url : null,
      note: meta.note,
    });
  }
  for (const [fuel, value] of Object.entries(PUMP)) {
    rows.push({
      key: `pump.${fuel}`,
      value,
      unit: "CHF/litre",
      status: "placeholder",
      publisher: null,
      published_on: null,
      source_url: null,
      note: "Pump price. W3 will replace this with the BFS monthly average.",
    });
  }
  for (const [cls, spec] of Object.entries(SPECS)) {
    for (const [field, value] of Object.entries(spec)) {
      rows.push({
        key: `spec.${cls}.${field}`,
        value,
        unit: SPEC_UNIT[field as keyof Spec],
        status: "placeholder",
        publisher: null,
        published_on: null,
        source_url: null,
        note: "Class placeholder, not a quote.",
      });
    }
  }
  return rows;
}

/** Turn a dataset key into the place in model.ts it replaces, or null if the key is unknown. */
function target(key: string): { obj: Record<string, number>; field: string } | null {
  const [group, a, b] = key.split(".");
  if (group === "rate" && a && a in RATES && !b) return { obj: RATES as unknown as Record<string, number>, field: a };
  if (group === "pump" && a && a in PUMP && !b) return { obj: PUMP as unknown as Record<string, number>, field: a };
  if (group === "spec" && a && b && a in SPECS && b in SPECS[a as CarClass])
    return { obj: SPECS[a as CarClass] as unknown as Record<string, number>, field: b };
  return null;
}

/** Replace model numbers with dataset values. Unknown keys and non-finite or negative values are ignored. */
export function applyDataset(rows: Pick<DatasetRow, "key" | "value">[]): number {
  let applied = 0;
  for (const row of rows) {
    const t = target(row.key);
    const v = Number(row.value);
    if (!t || !Number.isFinite(v) || v < 0) continue;
    t.obj[t.field] = v;
    applied += 1;
  }
  return applied;
}

/** For the "how this line is made" text: status and source of one key. */
export function describe(rows: DatasetRow[], key: string): DatasetRow | undefined {
  return rows.find((r) => r.key === key);
}
