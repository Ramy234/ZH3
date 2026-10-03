// One list of gaps, in the codes of the INFRAS barrier analysis for the canton of Zurich (INFRAS for AWEL, 1 July 2026,
// "Analyse zum Abbau von Hemmnissen fuer die Elektromobilitaet", 26 sub-barriers in seven groups). The wording of each
// line is ours. X1 is ours: the INFRAS list has no code for what a connected car passes on.
// A closed list, so a stored session can carry it and a count can read it. It never touches the francs.

export const GAP_GROUPS = {
  H1: "Battery and range",
  H2: "Charging",
  H3: "Money and rules",
  H4: "The car market",
  H5: "Knowing and trusting",
  H6: "Life of the car",
  H7: "Feelings and climate",
  X: "Added here",
} as const;

export type GapGroup = keyof typeof GAP_GROUPS;

export const GAP_CODES = {
  "H1.1": "Range for a real week or a long trip",
  "H1.2": "Range in the cold, on the motorway or with a load",
  "H1.3": "The battery's reputation",
  "H2.1": "No dependable public charging nearby",
  "H2.2": "No way to charge where the car parks, often in a rented or shared building",
  "H2.3": "Charging takes longer than filling up",
  "H2.4": "Apps, cards and prices that are hard to compare",
  "H3.1": "Purchase price and what the car sells for later",
  "H3.2": "Doubt about the price of electricity",
  "H3.3": "Rules, grants or taxes that are not settled",
  "H3.4": "Company-car rules",
  "H3.5": "Expected insurance cost",
  "H4.1": "Too few models to choose from",
  "H4.2": "Few used electric cars, hard to judge",
  "H4.3": "No clear word on battery life and repair",
  "H4.4": "A seller who cannot advise on electric cars",
  "H5.1": "Missing or wrong knowledge, unfamiliar words",
  "H5.2": "Doubt about the technology, or waiting for better",
  "H5.3": "Safety and power-supply worries",
  "H5.4": "Using it abroad",
  "H5.5": "Personal safety while charging",
  "H6.1": "Battery life and the cost of replacing it",
  "H6.2": "Repair and service",
  "H7.1": "Doubt that it helps the climate",
  "H7.2": "Battery production and recycling",
  "H7.3": "Habit, feeling or attachment to the car",
  X1: "What a connected car passes on about you",
} as const;

export type GapCode = keyof typeof GAP_CODES;
export const GAP_CODE_LIST = Object.keys(GAP_CODES) as GapCode[];

export function gapGroup(code: GapCode): GapGroup {
  return code.startsWith("X") ? "X" : (code.slice(0, 2) as GapGroup);
}

const BARRIER: Record<string, GapCode[]> = {
  charging: ["H2.2", "H2.1"],
  cost: ["H3.1"],
  trips: ["H1.1", "H1.2"],
  trust: ["H5.2", "H1.3", "H6.1"],
  unsure: [],
};
const WORRY: Record<string, GapCode[]> = { tenant: ["H2.2"], winter: ["H1.2"], refuse: ["H7.3"] };
const UNCLEAR: Record<string, GapCode[]> = { km: ["H5.1"], payback: ["H5.1"], price: ["H3.1"], wording: ["H5.1"] };
const STING: Record<string, GapCode[]> = { price: ["H3.1"], month: ["H3.2"], both: ["H3.1"] };

/** What a fact sheet that was opened speaks to. Keys are fact keys (src/lib/navigator/facts.ts). */
export const FACT_CODES: Record<string, GapCode[]> = {
  "two-for-one": ["H1.1", "H1.2"],
  "mobile-charger": ["H2.2"],
  battery: ["H4.2", "H4.3", "H6.1"],
  workplace: ["H2.1"],
  "public-tariff": ["H2.4", "H3.2"],
  "tenant-right": ["H2.2", "H3.3"],
  winter: ["H1.2"],
  "not-for-me": ["H7.3"],
  "canton-tax": ["H3.3"],
  "local-grant": ["H3.3"],
  "wait-or-not": ["H5.2"],
  "car-data": ["X1"],
  "value-loss": ["H3.1", "H5.1"],
  leasing: ["H3.1", "H3.5"],
  "test-drive": ["H1.1", "H1.2", "H4.4"],
};

/** What each charging-set-up level says is still missing. */
const CHARGE_LEVEL: Record<string, GapCode[]> = {
  missing: ["H2.1", "H2.2"],
  test: ["H2.1"],
  timing: ["H2.3"],
  backup: ["H2.1"],
  holds: [],
};

export type GapInput = {
  barrier?: string | null;
  worry?: string | null;
  unclear?: string | null;
  costSting?: string | null;
  usedStance?: string | null;
  openedFacts?: string[];
  chargeLevel?: string | null;
};

/** The codes a session touched, sorted, no duplicates. Only closed inputs go in, so only closed codes can come out. */
export function gapCodesFor(input: GapInput): GapCode[] {
  const out = new Set<GapCode>();
  const add = (list: GapCode[] | undefined) => list?.forEach((c) => out.add(c));
  if (input.barrier) add(BARRIER[input.barrier]);
  if (input.worry) add(WORRY[input.worry]);
  if (input.unclear) add(UNCLEAR[input.unclear]);
  if (input.costSting) add(STING[input.costSting]);
  if (input.usedStance === "yes") add(["H4.2", "H4.3"]);
  for (const key of input.openedFacts ?? []) add(FACT_CODES[key]);
  if (input.chargeLevel) add(CHARGE_LEVEL[input.chargeLevel]);
  return GAP_CODE_LIST.filter((c) => out.has(c));
}

/** Keeps only known codes, at most 12. Used when a stored list is read back. */
export function cleanGapCodes(value: unknown): GapCode[] {
  if (!Array.isArray(value)) return [];
  const out: GapCode[] = [];
  for (const item of value) {
    if (typeof item === "string" && item in GAP_CODES && !out.includes(item as GapCode)) out.push(item as GapCode);
    if (out.length >= 12) break;
  }
  return out;
}
