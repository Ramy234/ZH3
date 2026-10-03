// "Number sheets": for one headline figure, the sum in words and the dataset rows it reads.
// It only looks numbers up. The arithmetic stays in model.ts, so a sheet can never disagree with the page.
import { chf, type Result } from "./model.ts";
import type { DatasetRow } from "./dataset.ts";

export type SheetKind = "keep" | "switch" | "cash" | "payback";

export type SheetLine = {
  key: string;
  label: string;
  value: string;
  status: "sourced" | "official" | "live" | "placeholder" | "missing";
  publisher: string | null;
  published_on: string | null;
  source_url: string | null;
  note: string;
};

export type Sheet = {
  title: string;
  /** The sum in plain words. */
  formula: string;
  /** Result of the sum, with this case's figures. */
  worked: string;
  lines: SheetLine[];
  /** Francs-by-line from the model, when the figure is a total. */
  parts: { label: string; amount: number; how: string; link?: { name: string; href: string } }[];
};

const FIELD: Record<string, string> = {
  iceL: "Fuel use of your car (litres per 100 km)",
  iceIns: "Insurance, your car",
  iceTax: "Road tax, your car",
  iceMaint: "Service, your car",
  resale: "What your car would sell for",
  bevNew: "Price of the electric car, new",
  bevUsed: "Price of the electric car, used",
  kwh: "Electric car's use (kWh per 100 km)",
  bevIns: "Insurance, electric car",
  bevTax: "Road tax, electric car",
  bevMaint: "Service, electric car",
};
const RATE: Record<string, string> = {
  home: "Electricity at home",
  work: "Charging at work",
  public: "Charging on the road",
  publicPlan: "Charging on the road, with a plan",
  wallbox: "Wallbox and installation",
  sharedInstall: "Share of a shared-garage installation",
  batteryCheck: "Battery check on a used car",
  rentalDay: "One rental day",
  horizon: "Years in the picture",
};
const PUMP_LABEL: Record<string, string> = { petrol: "Petrol, per litre", diesel: "Diesel, per litre" };

const UNIT: Record<string, string> = {
  "CHF/litre": "francs a litre",
  "CHF/kWh": "francs a kWh",
  "CHF/year": "francs a year",
  "CHF/day": "francs a day",
  CHF: "francs",
  "l/100km": "litres per 100 km",
  "kWh/100km": "kWh per 100 km",
  years: "years",
};

function label(key: string): string {
  const [g, a, b] = key.split(".");
  if (g === "pump") return PUMP_LABEL[a!] ?? key;
  if (g === "rate") return RATE[a!] ?? key;
  if (g === "spec") return FIELD[b!] ?? key;
  return key;
}

function line(rows: DatasetRow[], key: string, extra?: { value?: string; note?: string; status?: SheetLine["status"] }): SheetLine {
  const row = rows.find((r) => r.key === key);
  if (!row) {
    return { key, label: label(key), value: extra?.value ?? "-", status: "missing", publisher: null, published_on: null, source_url: null, note: extra?.note ?? "Not in the loaded dataset." };
  }
  const n = row.unit === "CHF" || row.unit === "CHF/year" || row.unit === "CHF/day" ? chf(row.value) : `${row.value} ${UNIT[row.unit] ?? row.unit}`;
  return {
    key,
    label: label(key),
    value: extra?.value ?? n,
    status: extra?.status ?? row.status,
    publisher: row.publisher,
    published_on: row.published_on,
    source_url: row.source_url,
    note: extra?.note ?? row.note,
  };
}

export function numberSheet(kind: SheetKind, r: Result, rows: DatasetRow[]): Sheet {
  const fuel = r.answers.fuel ?? "petrol";
  const ice = `spec.${r.iceClass}`;
  const bev = `spec.${r.bevClass}`;
  const partsOf = (side: "keep" | "swap") => r.parts.map((p) => ({ label: p.label, amount: p[side], how: p.how, link: p.link })).filter((p) => p.amount > 0);
  const official = r.official
    ? { value: `${(r.official.homeChf * 100).toFixed(1)} rappen a kWh`, status: "official" as const, note: `ElCom ${r.official.year}, profile H4, ${r.official.place}. Replaces the national median because you picked a place.` }
    : undefined;

  if (kind === "keep") {
    const lines = [
      ...(fuel === "electric" ? [line(rows, "rate.home", official)] : [line(rows, `pump.${fuel === "hybrid" ? "petrol" : fuel}`)]),
      line(rows, `${ice}.${fuel === "electric" ? "bevIns" : "iceIns"}`),
      line(rows, `${ice}.${fuel === "electric" ? "bevTax" : "iceTax"}`, r.canton ? { note: `Replaced by the TCS comparison for ${r.canton}: see the line under "Tax".` } : undefined),
      line(rows, `${ice}.${fuel === "electric" ? "bevMaint" : "iceMaint"}`),
      ...(fuel === "electric" ? [] : [line(rows, `${ice}.iceL`)]),
    ];
    return {
      title: "Keeping your car, a year",
      formula: "Fuel (litres per 100 km × your kilometres ÷ 100 × price per litre) + insurance + road tax + service.",
      worked: `${chf(r.annualKeep)} a year, at ${r.km.toLocaleString("de-CH")} km.`,
      lines,
      parts: partsOf("keep"),
    };
  }
  if (kind === "switch") {
    const lines = [
      line(rows, "rate.home", official),
      line(rows, "rate.public"),
      ...(r.toggles.work ? [line(rows, "rate.work")] : []),
      line(rows, `${bev}.kwh`),
      line(rows, `${bev}.bevIns`),
      line(rows, `${bev}.bevTax`),
      line(rows, `${bev}.bevMaint`),
      ...(r.rentalDays > 0 ? [line(rows, "rate.rentalDay")] : []),
    ];
    return {
      title: "The electric car, a year",
      formula: "Electricity (kWh per 100 km × your kilometres ÷ 100 × blended price per kWh) + insurance + road tax + service + rental days, if any.",
      worked: `${chf(r.annualSwap)} a year, at ${r.km.toLocaleString("de-CH")} km and ${r.rate.toFixed(2)} francs a kWh blended.`,
      lines,
      parts: partsOf("swap"),
    };
  }
  if (kind === "cash") {
    const lines = [
      line(rows, `${bev}.${r.toggles.used ? "bevUsed" : "bevNew"}`),
      line(rows, `${ice}.resale`),
      ...(r.hardware > 0
        ? [line(rows, r.answers.parking === "house" || r.answers.parking === "own" ? "rate.wallbox" : "rate.sharedInstall")]
        : []),
      ...(r.toggles.used ? [line(rows, "rate.batteryCheck")] : []),
    ];
    return {
      title: "The extra money at the start",
      formula: "Price of the electric car − what your car would sell for + charging hardware (and a battery check on a used car).",
      worked: `${chf(r.cash)} extra.${r.surplus > 0 ? ` The switch leaves you ${chf(r.surplus)} ahead before charging hardware.` : ""}`,
      lines,
      parts: [],
    };
  }
  const years = r.paybackYears == null || r.saving <= 40 ? null : r.paybackYears;
  return {
    title: "The year the extra price is covered",
    formula: "Extra money at the start ÷ how much less a year costs. It is the year you would have to still own the car for the saving to have caught up. Nobody pays it out.",
    worked: years == null ? "No year. Switching does not cost less to run on these figures." : `${chf(r.cash)} ÷ ${chf(r.saving)} a year = ${years.toFixed(1)} years.`,
    lines: [line(rows, "rate.horizon")],
    parts: [],
  };
}

/** Which rows are placeholders. Used for the honest counter on the sheet and on /method. */
export function statusWord(s: SheetLine["status"]): string {
  return s === "placeholder" ? "Rough class figure" : s === "sourced" ? "Sourced" : s === "official" ? "Official" : s === "live" ? "Live" : "Not loaded";
}
