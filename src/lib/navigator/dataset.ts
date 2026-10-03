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
  battery: "kWh",
  bevIns: "CHF/year",
  bevTax: "CHF/year",
  bevMaint: "CHF/year",
};

const TCO = {
  publisher: "EnergieSchweiz, Swiss Federal Office of Energy",
  published_on: "2023-03-23",
  source_url: "https://www.newsd.admin.ch/newsd/message/attachments/76353.pdf",
};

type Evidence = Pick<DatasetRow, "status" | "publisher" | "published_on" | "source_url"> & { note: string };

// Rows with a dated, linked source (checked on 3 Oct 2026). Everything else stays a placeholder.
const SOURCED: Record<string, Evidence> = {
  "pump.petrol": {
    status: "sourced",
    publisher: "TCS (Touring Club Schweiz), Benzinpreise Schweiz",
    published_on: "2026-09-19",
    source_url: "https://www.tcs.ch/de/camping-reisen/reiseinformationen/wissenswertes/fahrkosten-gebuehren/benzinpreise-schweiz.php",
    note: "Euro-Super 95. Derived: the time-weighted average of the 23 entries in the TCS table from 1 Jan to 19 Sep 2026 (261 days), each price counted from its date to the next entry. The latest single price, 19 Sep, is 2.14, the highest of the year; the lowest is 1.61 (3 Feb). TCS Kilometerkosten 2026 (6 Jan 2026) used 1.71 as a yearly average. Replaced by a federal monthly average if one is wired.",
  },
  "pump.diesel": {
    status: "sourced",
    publisher: "TCS (Touring Club Schweiz), Benzinpreise Schweiz",
    published_on: "2026-09-19",
    source_url: "https://www.tcs.ch/de/camping-reisen/reiseinformationen/wissenswertes/fahrkosten-gebuehren/benzinpreise-schweiz.php",
    note: "Diesel. Derived: the time-weighted average of the 23 entries in the TCS table from 1 Jan to 19 Sep 2026 (261 days), each price counted from its date to the next entry. The latest single price, 19 Sep, is 2.46, the highest of the year; the lowest is 1.73 (3 Feb). Replaced by a federal monthly average if one is wired.",
  },
  "rate.home": {
    status: "sourced",
    publisher: "ElCom via the Federal Council, press release on 2027 electricity tariffs",
    published_on: "2026-09-08",
    source_url: "https://www.admin.ch/de/newnsb/1miE201yRzoA",
    note: "National median 2027, profile H4 (4,500 kWh a year): 26.5 Rp./kWh. 2026 was 27.7. TCS Kilometerkosten 2026 (6 Jan 2026) used 28 rappen. Replaced by the ElCom canton or commune figure when one is picked.",
  },
};

// Evidence found for rows that stay placeholders: it says which way the real figure points, it does not set the number.
const EVIDENCE_NOTE: Record<string, string> = {
  "rate.public": "TCS 2026 (page undated): DC average 59 Rp./kWh, AC average 50. The model uses the DC average. Prices differ by half or more between providers.",
  "rate.publicPlan": "TCS 2026 (page undated): DC with a subscription 51 Rp./kWh, AC budget 40. The model uses the DC subscription figure.",
  "rate.wallbox": "Observed range 900 to 2,500 CHF for one wallbox (Beobachter, undated). Up to 15,000 CHF for an 18-bay building.",
  "rate.sharedInstall": "Unverified. Reported cases run up to 15,000 CHF for an 18-bay building (Beobachter, undated).",
};
const EVIDENCE_FIELD: Record<string, string> = {
  bevNew: "Class placeholder. Swiss average listing price of a new electric car: 51,424 CHF in Q1 2026, down 4.2 % (AutoScout24, 9 Apr 2026). The 2025 full-year average was 56,229 CHF, down 8.1 % (AutoScout24, 13 Jan 2026). Not comparable by class.",
  bevUsed: "Class placeholder. Swiss average listing price of a used electric car: 40,599 CHF in Q1 2026, down 3.2 % (AutoScout24, 9 Apr 2026). The 2025 full-year average was 43,549 CHF, down 8.3 % (AutoScout24, 13 Jan 2026). Skewed by expensive models.",
  resale: "Class placeholder. No public Swiss resale figure by class was found. Used electric listings in 2025 were about 3 % below 2020 levels (AutoScout24, 13 Jan 2026), which says nothing by class. Needs a Eurotax or AutoScout24 extract.",
  iceL: "Class placeholder, not a quote. For scale: TCS Kilometerkosten 2026 (6 Jan 2026) uses 5 l/100 km for one model car. The federal average of all new cars in 2025 is 5.1 l petrol-equivalent, but it includes electrified cars, so it is not a petrol class figure (BFE, 23 Jun 2026).",
  kwh: "Class placeholder, not a quote. For scale: TCS Kilometerkosten 2026 (6 Jan 2026) uses 18 kWh/100 km for one model car. The TCS winter test of 26 Jan 2026 (about 0 \u00b0C) measured 22.2 (Tesla Model Y) to 31.6 (Volvo EX90). The EnergieSchweiz label shows 13 to 30.6 across models (Oct 2023).",
  iceIns: "Class placeholder, not a quote. Comparis (19 Aug 2025): fully comprehensive cover is cheaper for an electric car in 70 % of cases. Many insurers expected higher premiums in 2026.",
  bevIns: "Class placeholder, not a quote. Comparis (19 Aug 2025): fully comprehensive cover is cheaper for an electric car in 70 % of cases. Zurich states a discount of up to 20 %. That ceiling is not applied.",
};

export function seedRows(): DatasetRow[] {
  const rows: DatasetRow[] = [];
  for (const [name, value] of Object.entries(RATES)) {
    const meta = RATE_META[name]!;
    const key = `rate.${name}`;
    const ev: Evidence | undefined = name === "horizon"
      ? { status: "sourced", publisher: TCO.publisher, published_on: TCO.published_on, source_url: TCO.source_url, note: meta.note }
      : SOURCED[key];
    rows.push({
      key,
      value,
      unit: meta.unit,
      status: ev?.status ?? "placeholder",
      publisher: ev?.publisher ?? null,
      published_on: ev?.published_on ?? null,
      source_url: ev?.source_url ?? null,
      note: ev?.note ?? EVIDENCE_NOTE[key] ?? meta.note,
    });
  }
  for (const [fuel, value] of Object.entries(PUMP)) {
    const key = `pump.${fuel}`;
    const ev = SOURCED[key];
    rows.push({
      key,
      value,
      unit: "CHF/litre",
      status: ev?.status ?? "placeholder",
      publisher: ev?.publisher ?? null,
      published_on: ev?.published_on ?? null,
      source_url: ev?.source_url ?? null,
      note: ev?.note ?? "Equals pump.petrol. A hybrid buys petrol: the model reads pump.petrol for it and ignores this row.",
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
        note: field === "battery" ? "Usable battery, class placeholder. Used only for the ordinary-week strip, never for francs." : EVIDENCE_FIELD[field] ?? "Class placeholder, not a quote.",
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

/**
 * Run `fn` with some dataset numbers swapped, then put every one back (also if `fn` throws).
 * Synchronous on purpose: nothing else can read the model numbers while the swap is in place.
 * Used for "what if this number were different" views. It never keeps a change.
 */
export function withDataset<T>(overrides: Pick<DatasetRow, "key" | "value">[], fn: () => T): T {
  const saved: { obj: Record<string, number>; field: string; value: number }[] = [];
  for (const o of overrides) {
    const t = target(o.key);
    if (t) saved.push({ obj: t.obj, field: t.field, value: t.obj[t.field]! });
  }
  applyDataset(overrides);
  try {
    return fn();
  } finally {
    for (const s of saved) s.obj[s.field] = s.value;
  }
}
