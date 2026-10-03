/**
 * Browser-side decision layer for the BEV Navigator prototype.
 * Closed questions are scored with explicit weights (a Jeff-shaped step).
 * Money is arithmetic. Nothing here calls a language model.
 * Every franc figure is an illustrative placeholder, not a quote.
 */

export type Barrier = "charging" | "cost" | "trips" | "trust" | "unsure";
export type CarClass = "small" | "compact" | "mid" | "suv" | "van";
export type Fuel = "petrol" | "diesel" | "hybrid" | "electric";
export type UseId = "commute" | "everyday" | "long" | "holiday" | "towing" | "business";
export type KmBand = "lt10" | "mid" | "gt20" | "unsure";
export type Parking = "house" | "own" | "shared" | "none" | "unsure";
export type WorkAccess = "yes" | "ask" | "no";
export type TripFreq = "rare" | "yearly" | "often";
export type UsedStance = "yes" | "new" | "no";
export type CostSting = "price" | "month" | "both";
export type PersonaId =
  | "urbanRenter"
  | "familyHome"
  | "distance"
  | "cost"
  | "skeptic"
  | "occasional";
export type Worry = "tenant" | "winter" | "refuse";
export type FocusKind = "work" | "trips" | "trust" | "cost";

export type Toggles = {
  home: boolean;
  work: boolean;
  rightSize: boolean;
  used: boolean;
  publicPlan: boolean;
  tariff: boolean;
  pv: boolean;
  insDiscount: boolean;
};

export type Answers = {
  barrier: Barrier | null;
  carClass: CarClass | null;
  fuel: Fuel | null;
  uses: UseId[];
  km: KmBand | null;
  parking: Parking | null;
  workAccess: WorkAccess | null;
  tripFreq: TripFreq | null;
  usedStance: UsedStance | null;
  costSting: CostSting | null;
  mobileInterest: "yes" | "no" | null;
  worry: Worry | null;
  mix?: { home: number; work: number; public: number } | null;
  listPrice?: number | null;
  resalePrice?: number | null;
  keepYears?: 4 | 8 | 12 | 16 | 24 | 32 | null;
  litres?: number | null;
  gearQuote?: number | null;
  rentDays?: 0 | 2 | 4 | 8 | null;
};

export const EMPTY: Answers = {
  barrier: null,
  carClass: null,
  fuel: null,
  uses: [],
  km: null,
  parking: null,
  workAccess: null,
  tripFreq: null,
  usedStance: null,
  costSting: null,
  mobileInterest: null,
  worry: null,
};

export const SAMPLE: Answers = {
  barrier: "charging",
  carClass: "compact",
  fuel: "diesel",
  uses: ["commute", "everyday"],
  km: "mid",
  parking: "shared",
  workAccess: "ask",
  tripFreq: null,
  usedStance: null,
  costSting: null,
  mobileInterest: null,
  worry: null,
};

export const RATES = {
  home: 0.29,
  homeSpecial: 0.21,
  work: 0.18,
  public: 0.62,
  publicPlan: 0.48,
  pv: 0.06,
  pvShare: 0.4,
  rentalDay: 75,
  wallbox: 2200,
  sharedInstall: 1500,
  batteryCheck: 250,
  horizon: 8,
} as const;

const CLASS_ORDER: CarClass[] = ["small", "compact", "mid", "suv", "van"];

export type Spec = {
  iceL: number;
  iceIns: number;
  iceTax: number;
  iceMaint: number;
  resale: number;
  bevNew: number;
  bevUsed: number;
  kwh: number;
  /** Usable battery, kWh. A class placeholder for the ordinary-week strip. It does not enter any franc figure. */
  battery: number;
  bevIns: number;
  bevTax: number;
  bevMaint: number;
};

export const SPECS: Record<CarClass, Spec> = {
  small: {
    iceL: 5.4,
    iceIns: 740,
    iceTax: 190,
    iceMaint: 780,
    resale: 4800,
    bevNew: 27900,
    bevUsed: 16800,
    kwh: 14.2,
    battery: 40,
    bevIns: 700,
    bevTax: 70,
    bevMaint: 470,
  },
  compact: {
    iceL: 6.1,
    iceIns: 920,
    iceTax: 270,
    iceMaint: 1080,
    resale: 8500,
    bevNew: 34900,
    bevUsed: 19900,
    kwh: 16.5,
    battery: 58,
    bevIns: 860,
    bevTax: 100,
    bevMaint: 650,
  },
  mid: {
    iceL: 7.1,
    iceIns: 1120,
    iceTax: 350,
    iceMaint: 1280,
    resale: 12500,
    bevNew: 46900,
    bevUsed: 26800,
    kwh: 18.2,
    battery: 66,
    bevIns: 1040,
    bevTax: 130,
    bevMaint: 770,
  },
  suv: {
    iceL: 8.4,
    iceIns: 1380,
    iceTax: 470,
    iceMaint: 1520,
    resale: 16500,
    bevNew: 58900,
    bevUsed: 32900,
    kwh: 21,
    battery: 77,
    bevIns: 1260,
    bevTax: 170,
    bevMaint: 1220,
  },
  van: {
    iceL: 9.1,
    iceIns: 1290,
    iceTax: 430,
    iceMaint: 1580,
    resale: 14200,
    bevNew: 54900,
    bevUsed: 30500,
    kwh: 22.5,
    battery: 75,
    bevIns: 1200,
    bevTax: 160,
    bevMaint: 1260,
  },
};

export const PUMP: Record<Exclude<Fuel, "electric">, number> = {
  petrol: 1.79,
  diesel: 1.93,
  // A hybrid buys petrol. The model reads `petrol` for it (see `pumpFor`); this row only keeps the dataset sheet aligned.
  hybrid: 1.79,
};

/** The litre price the car actually pays. A hybrid is a petrol car with lower consumption, not a cheaper fuel. */
export function pumpFor(fuel: Exclude<Fuel, "electric">): number {
  return fuel === "hybrid" ? PUMP.petrol : PUMP[fuel];
}

export const DATASET = "placeholder-2026-10-02";
/** Bump when the arithmetic changes, so stored rows from before and after can be told apart. */
export const MODEL = "2026-10-03-r3";

export const SOURCES = {
  "tco-2023": {
    title: "Factsheet: total cost of a car",
    publisher: "EnergieSchweiz, Swiss Federal Office of Energy",
    published: "23 March 2023",
    supports: "Sets the 8-year window and 15,000 km a year, for a new car.",
    notThis: "Does not set the prices in this check. Those are the placeholder dataset.",
    url: "https://www.newsd.admin.ch/newsd/message/attachments/76353.pdf",
  },
  "tco-2023-report": {
    title: "Full study: total cost of a car",
    publisher: "Swiss Federal Office of Energy",
    published: "23 March 2023",
    supports: "The same window, with the assumptions written out.",
    notThis: "2022 prices, and an insurance profile in Aarau. Not these francs.",
    url: "https://www.newsd.admin.ch/newsd/message/attachments/76392.pdf",
  },
  "foen-2023": {
    title: "Environmental impact of passenger cars",
    publisher: "Federal Office for the Environment",
    published: "27 April 2023",
    supports: "A new mid-size electric car against a new petrol car, over the whole life. About 55 percent lower greenhouse gases on the Swiss consumer mix, about 65 percent on renewable electricity.",
    notThis: "Not this person’s kilometres, and not the car they already own. Inventories from the Paul Scherrer Institute, 2022.",
    url: "https://www.bafu.admin.ch/dam/de/sd-web/-1KADIYDsYhT/umweltauswirkungen-von-personenwagen-mit-verschiedenen-antriebssystemen.pdf",
  },
} as const;

export const OUT = {
  tcoFactsheet: SOURCES["tco-2023"].url,
  tcoReport: SOURCES["tco-2023-report"].url,
  tcsTax: "https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/umwelt-mobilitaet/motorfahrzeugsteuer.php",
  tcsKm: "https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/kontrollen-unterhalt/kilometerkosten.php",
  energyAdvice: "https://www.energieschweiz.ch/beratung/energieberatung/",
  tenantGuide: "https://www.energieschweiz.ch/ladeinfrastruktur/werkzeuge/ladeinfrastruktur-in-mietobjekten/",
  tcsUsed: "https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/elektromobilitaet/elektroauto-occasion.php",
} as const;

/** TCS comparison, February 2026. Order: Tayron plug-in, Model Y, Tiguan diesel, Yaris hybrid, Dacia Spring, Octavia petrol. */
const TCS_TAX: Record<string, readonly [number, number, number, number, number, number]> = {
  AG: [303, 411, 295, 213, 180, 326],
  AI: [650, 665, 548, 407, 296, 518],
  AR: [762, 779, 648, 491, 376, 615],
  BE: [535, 109, 475, 382, 61, 457],
  BL: [422, 434, 473, 188, 80, 595],
  BS: [274, 131, 432, 309, 65, 442],
  FR: [511, 921, 532, 337, 131, 601],
  GE: [123, 720, 294, 145, 120, 314],
  GL: [322, 0, 407, 322, 0, 488],
  GR: [95, 108, 570, 475, 90, 570],
  JU: [492, 456, 463, 281, 102, 472],
  LU: [475, 130, 404, 290, 35, 438],
  NE: [250, 250, 461, 309, 250, 525],
  NW: [133, 98, 340, 133, 0, 340],
  OW: [149, 125, 368, 149, 125, 368],
  SG: [620, 669, 533, 394, 150, 636],
  SH: [204, 306, 264, 204, 132, 264],
  SO: [276, 0, 351, 276, 0, 351],
  SZ: [385, 909, 334, 219, 162, 442],
  TG: [240, 72, 288, 240, 48, 432],
  TI: [388, 278, 444, 213, 115, 515],
  UR: [550, 374, 475, 338, 158, 453],
  VD: [66, 140, 210, 36, 22, 669],
  VS: [212, 135, 269, 212, 120, 269],
  ZG: [272, 252, 326, 271, 131, 328],
  ZH: [538, 0, 338, 238, 0, 338],
};

function publishedKeep(canton: string, carClass: CarClass, fuel: Fuel): { chf: number; car: string } | null {
  const row = TCS_TAX[canton];
  if (!row) return null;
  const large = carClass === "mid" || carClass === "suv" || carClass === "van";
  if (fuel === "electric") return large ? { chf: row[1], car: "Tesla Model Y" } : { chf: row[4], car: "Dacia Spring" };
  if (fuel === "diesel") return { chf: row[2], car: "VW Tiguan diesel" };
  if (fuel === "hybrid") return large ? { chf: row[0], car: "VW Tayron plug-in" } : { chf: row[3], car: "Toyota Yaris Cross hybrid" };
  return { chf: row[5], car: "Škoda Octavia petrol" };
}

function publishedBev(canton: string, carClass: CarClass): { chf: number; car: string } | null {
  const row = TCS_TAX[canton];
  if (!row) return null;
  return carClass === "mid" || carClass === "suv" || carClass === "van"
    ? { chf: row[1], car: "Tesla Model Y" }
    : { chf: row[4], car: "Dacia Spring" };
}

const PERSONA_KM: Record<PersonaId, number> = {
  urbanRenter: 11000,
  familyHome: 14000,
  distance: 24000,
  cost: 12000,
  skeptic: 12000,
  occasional: 7000,
};

export const PERSONA_META: Record<PersonaId, { title: string; line: string }> = {
  urbanRenter: {
    title: "City household without an easy home charger",
    line: "Parking, not the badge, decides whether this is realistic.",
  },
  familyHome: {
    title: "Household with a bay at home",
    line: "Home charging is available in principle. The question is the car you actually need.",
  },
  distance: {
    title: "High-kilometre driver",
    line: "The kilometres can cover the extra price, if the car charges on the days you drive them.",
  },
  cost: {
    title: "Cost-first driver",
    line: "The purchase price will dominate. Used and smaller are the serious options.",
  },
  skeptic: {
    title: "Wants proof before a switch",
    line: "That is a reasonable position. The figures stay, and so does keeping your car.",
  },
  occasional: {
    title: "The car is not an everyday tool",
    line: "Low kilometres make a new car hard to justify. Borrowing the peaks matters more.",
  },
};

export const BARRIERS: { id: Barrier; title: string; detail: string }[] = [
  {
    id: "charging",
    title: "Not where the car sleeps",
    detail: "A shared garage, no bay, or someone else who still has to say yes.",
  },
  {
    id: "cost",
    title: "Not at a price I can pay",
    detail: "The cheque, or the fear it is worth less next year.",
  },
  {
    id: "trips",
    title: "Not for the trips that are not ordinary",
    detail: "The holiday, towing, or a distance that is not a Tuesday.",
  },
  {
    id: "trust",
    title: "Not until I trust it",
    detail: "Winter, the battery, repair, or a used car that might be a guess.",
  },
  {
    id: "unsure",
    title: "I do not know. Show me a number",
    detail: "No invented barrier. The car and the parking come next.",
  },
];

export const CLASSES: { id: CarClass; title: string; detail: string }[] = [
  { id: "small", title: "Small city car", detail: "Most days, one or two people." },
  { id: "compact", title: "Compact", detail: "The usual Swiss everyday car." },
  { id: "mid", title: "Mid-size", detail: "More boot, more motorway." },
  { id: "suv", title: "SUV", detail: "Higher, heavier, and it uses more fuel." },
  { id: "van", title: "Van or large", detail: "For a family, or for work." },
];

export const FUELS: { id: Fuel; title: string; detail: string }[] = [
  { id: "petrol", title: "Petrol", detail: "You buy petrol. There is no plug." },
  { id: "diesel", title: "Diesel", detail: "Including a mild hybrid you do not plug in." },
  { id: "hybrid", title: "Hybrid", detail: "Charges itself. You still buy fuel." },
  { id: "electric", title: "Already electric", detail: "Then the question is size and charging, not the switch." },
];

export const USES: { id: UseId; title: string }[] = [
  { id: "commute", title: "Commute" },
  { id: "everyday", title: "Everyday errands" },
  { id: "long", title: "Longer drives" },
  { id: "holiday", title: "Holidays" },
  { id: "towing", title: "Towing" },
  { id: "business", title: "Work appointments" },
];

export const KM_BANDS: { id: KmBand; title: string; detail: string }[] = [
  { id: "lt10", title: "Under 10,000 km", detail: "Under about 200 km a week. A short daily hop, or less." },
  { id: "mid", title: "10,000 to 20,000 km", detail: "About 200 to 400 km a week. A commute, plus errands." },
  { id: "gt20", title: "Over 20,000 km", detail: "Over about 400 km a week. Most days, or long distances." },
  { id: "unsure", title: "Not sure", detail: "Leave it. A typical figure for this situation, and it stays labelled." },
];

export const PARKING: { id: Parking; title: string; detail: string }[] = [
  { id: "house", title: "House with a garage", detail: "You control the bay." },
  { id: "own", title: "My own bay", detail: "Apartment or house, the space is yours." },
  { id: "shared", title: "Shared garage", detail: "A building decision, not only yours." },
  { id: "none", title: "No bay where I sleep", detail: "This is a real barrier, not a lack of will." },
  { id: "unsure", title: "Not sure", detail: "We will not pretend you have a charger." },
];

export function usesForBarrier(barrier: Barrier): UseId[] {
  if (barrier === "trips") return ["everyday", "holiday"];
  if (barrier === "charging") return ["commute", "everyday"];
  return ["everyday"];
}
export function labelBarrier(id: Barrier): string {
  return BARRIERS.find((b) => b.id === id)?.title ?? id;
}
export function labelClass(id: CarClass): string {
  return CLASSES.find((b) => b.id === id)?.title ?? id;
}
export function labelFuel(id: Fuel): string {
  return FUELS.find((b) => b.id === id)?.title ?? id;
}
export function labelParking(id: Parking): string {
  return PARKING.find((b) => b.id === id)?.title ?? id;
}

export function kmPhrase(band: KmBand | null, km: number, situation?: string): string {
  const n = km.toLocaleString("de-CH");
  if (band === "lt10") return `${n} km, standing in for under 10,000`;
  if (band === "mid") return `${n} km, the middle of 10,000 to 20,000`;
  if (band === "gt20") return `${n} km, standing in for over 20,000`;
  return situation
    ? `${n} km, a typical figure for “${situation}”, because the year was unsure. It moves if that label moves.`
    : `${n} km, a typical figure because the year was unsure`;
}

export function chf(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "−" : "";
  return `${sign}CHF ${Math.abs(rounded).toLocaleString("de-CH")}`;
}

export function focusKind(a: Answers): FocusKind {
  const hard = a.parking === "none" || a.parking === "shared" || a.parking === "unsure";
  const home = a.parking === "house" || a.parking === "own";
  if ((a.barrier === "charging" || hard) && !home) return "work";
  if (
    a.barrier === "trips" ||
    a.uses.includes("long") ||
    a.uses.includes("holiday") ||
    a.uses.includes("towing")
  ) {
    return "trips";
  }
  if (a.barrier === "trust") return "trust";
  return "cost";
}

export function suggestToggles(a: Answers): Toggles {
  const homePark = a.parking === "house" || a.parking === "own";
  const sharedish = a.parking === "shared" || a.parking === "unsure";
  return {
    home: a.fuel === "electric" ? homePark : homePark || sharedish,
    work: a.workAccess === "yes" || a.workAccess === "ask",
    rightSize: a.carClass !== "small" && (a.barrier === "trips" || a.uses.includes("holiday") || a.uses.includes("long")),
    used: a.fuel === "electric" ? false : a.barrier === "cost" || a.usedStance === "yes" || a.costSting === "price",
    publicPlan: false,
    tariff: false,
    pv: false,
    insDiscount: false,
  };
}

function softmax(scores: Record<PersonaId, number>): Record<PersonaId, number> {
  const ids = Object.keys(scores) as PersonaId[];
  const max = Math.max(...ids.map((id) => scores[id]));
  const exps = ids.map((id) => Math.exp(scores[id] - max));
  const sum = exps.reduce((acc, n) => acc + n, 0);
  const out = {} as Record<PersonaId, number>;
  ids.forEach((id, i) => {
    out[id] = exps[i]! / sum;
  });
  return out;
}

function rawScores(a: Answers): Record<PersonaId, number> {
  const s: Record<PersonaId, number> = {
    urbanRenter: 0.2,
    familyHome: 0.2,
    distance: 0.15,
    cost: 0.2,
    skeptic: 0.1,
    occasional: 0.15,
  };
  if (a.parking === "shared" || a.parking === "none") s.urbanRenter += 2.4;
  if (a.parking === "unsure") s.urbanRenter += 1.2;
  if (a.parking === "house" || a.parking === "own") s.familyHome += 2.4;
  if (a.carClass === "suv" || a.carClass === "van") s.familyHome += 0.7;
  if (a.uses.includes("towing")) s.familyHome += 0.6;
  if (a.km === "gt20" || a.uses.includes("long") || a.uses.includes("business")) s.distance += 2.2;
  if (a.barrier === "trips") s.distance += 0.8;
  if (a.barrier === "cost" || a.costSting === "price") s.cost += 2.2;
  if (a.carClass === "small") s.cost += 0.6;
  if (a.barrier === "trust" || a.usedStance === "no") s.skeptic += 2.6;
  if (a.km === "lt10") s.occasional += 1.3;
  if (a.uses.includes("holiday") && a.km !== "gt20") s.occasional += 0.7;
  if (a.barrier === "charging") s.urbanRenter += 0.6;
  if (a.uses.includes("commute")) s.urbanRenter += 0.35;
  return s;
}

export type PersonaPick = {
  id: PersonaId;
  title: string;
  line: string;
  probability: number;
  mixed: boolean;
  also: { title: string; probability: number } | null;
  ranked: { id: PersonaId; title: string; probability: number }[];
};

function pickPersona(a: Answers): PersonaPick {
  const probs = softmax(rawScores(a));
  const ranked = (Object.keys(probs) as PersonaId[])
    .map((id) => ({ id, title: PERSONA_META[id].title, probability: probs[id] }))
    .sort((x, y) => y.probability - x.probability);
  const top = ranked[0]!;
  const second = ranked[1];
  const meta = PERSONA_META[top.id];
  const also =
    second && second.probability >= 0.22 && top.probability - second.probability < 0.18
      ? { title: second.title, probability: second.probability }
      : null;
  return {
    id: top.id,
    title: meta.title,
    line: meta.line,
    probability: top.probability,
    mixed: top.probability < 0.45,
    also,
    ranked,
  };
}

function annualKm(a: Answers, persona: PersonaId): { km: number; source: "answer" | "default" } {
  if (a.km === "lt10") return { km: 8000, source: "answer" };
  if (a.km === "mid") return { km: 14000, source: "answer" };
  if (a.km === "gt20") return { km: 24000, source: "answer" };
  return { km: PERSONA_KM[persona], source: "default" };
}

export function usePhrase(uses: UseId[]): string {
  if (uses.includes("towing")) return "towing in the mix";
  if (uses.includes("long") || uses.includes("holiday")) return "a long trip in the mix";
  if (uses.includes("business")) return "a lot of driving for work";
  if (uses.includes("commute")) return "mostly commuting";
  return "mostly everyday trips";
}

export function parkPhrase(parking: Parking | null): string {
  if (parking === "house") return "with a garage at home";
  if (parking === "own") return "with your own bay";
  if (parking === "shared") return "in a shared garage";
  if (parking === "none") return "without a bay where you sleep";
  return "with parking still unclear";
}

function downClass(id: CarClass): CarClass {
  const i = CLASS_ORDER.indexOf(id);
  return CLASS_ORDER[Math.max(0, i - 1)]!;
}

function blend(toggles: Toggles, uses: UseId[], custom?: { home: number; work: number; public: number } | null) {
  if (custom) {
    const home = Math.max(0, custom.home);
    const work = Math.max(0, custom.work);
    const pub = Math.max(0, custom.public);
    const sum = home + work + pub;
    if (sum > 0) return { home: home / sum, work: work / sum, public: pub / sum };
  }
  let home = toggles.home ? 0.8 : 0;
  let pub = toggles.home ? 0.2 : 1;
  let work = 0;
  if (toggles.work) {
    const take = uses.includes("commute") || uses.includes("business") ? 0.6 : 0.35;
    home *= 1 - take;
    pub *= 1 - take;
    work = 1 - home - pub;
  }
  return { home, work, public: pub };
}

function rentalDays(a: Answers): number {
  if (a.tripFreq === "often" || a.uses.includes("long") || a.km === "gt20") return 8;
  if (a.tripFreq === "rare") return 2;
  return 4;
}

function insight(a: Answers, focus: FocusKind): string {
  if (focus === "work") {
    if (a.workAccess === "yes") {
      return "Work can cover the commute, which is most of the kilometres that actually happen. The yearly cost uses a staff rate, not free power.";
    }
    if (a.workAccess === "no") {
      return "Then the week has to charge at home or on the public network. Public-only is usually the expensive way to run the car, and the figures show it.";
    }
    return "Asking is the step. Workplace charging is switched on below so you can see the difference, and you can turn it off if the answer is no.";
  }
  if (focus === "trips") {
    if (a.uses.includes("towing")) {
      return "Towing is a real constraint. A smaller car is not a fair substitute, so the check does not pretend to downsize it.";
    }
    if (a.tripFreq === "often") {
      return "Several long trips a year can justify a larger battery. The daily kilometres still deserve their own line, or the holiday picks the car.";
    }
    if (a.tripFreq === "rare") {
      return "A rare long trip is a poor reason to own a larger battery all year. Renting those days is usually the smaller number.";
    }
    return "The trip you picture and the kilometres you actually drive are different decisions. Renting the exception is one of the switches below.";
  }
  if (focus === "trust") {
    if (a.usedStance === "yes") {
      return "A used electric car is a reasonable idea with a battery-health certificate, and a poor one without it. The certificate is a cost line, not a slogan.";
    }
    if (a.usedStance === "no") {
      return "Skipping the used market keeps the cash to switch high. If payback is far, that is the trade — not a reason to invent a cheaper new car.";
    }
    return "A new car avoids the unknown battery and pays for it in value lost early. The cash figure is that trade.";
  }
  if (a.costSting === "price") {
    return "The sticker is the barrier. A certified used car moves the cash figure. A cheaper tariff barely does.";
  }
  if (a.costSting === "month") {
    return "Then the rate you charge at matters more than the badge. Turn home or work charging on and off and watch the year, not the headline price.";
  }
  return "Fuel on a normal year is the pile a lower running cost has to climb out of. The purchase is the hole in year zero.";
}

function nextSteps(
  a: Answers,
  toggles: Toggles,
  focus: FocusKind,
  within: boolean,
  days: number,
  already: boolean,
): { title: string; detail: string; lines?: string[]; link?: { name: string; href: string } }[] {
  const hard = a.parking === "none" || a.parking === "shared" || a.parking === "unsure";
  const items: { title: string; detail: string; lines?: string[]; link?: { name: string; href: string } }[] = [];
  if (hard && !toggles.home && !toggles.work) {
    items.push({
      title: "Settle a normal week of charging first",
      detail:
        "Without a home or work point, the public network carries every kilometre. That is usually the expensive case. A car will not fix it.",
    });
  }
  if (a.workAccess === "ask" || a.workAccess === "yes" || (hard && a.uses.includes("commute"))) {
    items.push({
      title: "Ask the employer before you price a wallbox",
      detail:
        "One written answer — yes, no, or not yet — changes this check more than another evening of model brochures.",
      lines: [
        "May the car charge on a working day?",
        "Who pays for the electricity?",
        "Is the answer yes, no, or not yet?",
      ],
    });
  }
  if (a.parking === "shared" || a.parking === "unsure") {
    items.push({
      title: "Put the building question in writing",
      detail:
        "A shared garage is a decision for the landlord or the other owners. Some sites look at a mobile charger on an existing power line instead of rebuilding the garage. That depends on that building’s supply. It is not a general right.",
      lines: [
        "Is there a bay that comes with the home?",
        "Who pays for a supply line, a meter, and the charging point?",
        "Is a mobile charger on the existing line even allowed here?",
      ],
      link: { name: "Charging in a rented building, EnergieSchweiz", href: OUT.tenantGuide },
    });
  }
  if (toggles.used || a.barrier === "cost" || a.barrier === "trust" || a.usedStance === "yes") {
    items.push({
      title: "Only price a used car with a battery certificate",
      detail:
        "The certificate is the check on the most expensive part. Without it, a used electric car is a rumour with a price.",
      lines: ["The date", "The kilometres", "The method", "The result"],
      link: { name: "TCS: a used electric car", href: OUT.tcsUsed },
    });
  }
  if ((focus === "trips" || toggles.rightSize) && !a.uses.includes("towing") && a.carClass !== "small") {
    items.push({
      title: "Price the exceptional days as rental",
      detail: `${days} days at an illustrative CHF ${RATES.rentalDay} sit in the year cost when the smaller-car switch is on. Compare that with owning the larger battery all year.`,
    });
  }
  if (a.barrier === "trust" || a.usedStance === "new" || a.usedStance === "no") {
    items.push({
      title: "Test it for two days, not twenty minutes",
      detail: "A short loop hides winter range and the real charging routine. A weekend will not.",
      lines: [
        "Drive the commute you actually do",
        "Charge where this car would sleep, not only at the seller",
        "If one trip is the worry, drive that distance",
      ],
    });
  }
  if (!already && !within) {
    items.push({
      title: "Keeping the car is a valid result",
      detail:
        "If a used car and a smaller one still pay back too late, the check has done its job. It is not a failure to stay.",
    });
  }
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.title) ? false : (seen.add(item.title), true))).slice(0, 4);
}

export type Assumption = {
  label: string;
  value: string;
  tag: "You" | "Default" | "Model" | "Official";
  edit?: "car" | "km" | "parking" | "mix" | "price" | "resale" | "keep" | "fuelUse" | "power" | "gear" | "days";
  link?: { name: string; href: string };
};

export type TraceRow = {
  question: string;
  kind: "choice" | "yesno" | "score";
  answer: string;
  note: string;
};

export type Result = {
  answers: Answers;
  toggles: Toggles;
  focus: FocusKind;
  persona: PersonaPick;
  km: number;
  kmSource: "answer" | "default";
  iceClass: CarClass;
  bevClass: CarClass;
  classDropped: boolean;
  towingBlocked: boolean;
  smallestBlocked: boolean;
  alreadyElectric: boolean;
  blend: { home: number; work: number; public: number };
  rate: number;
  homeOfficial: boolean;
  official: { homeChf: number; n: number; year: string; place: string } | null;
  canton: string | null;
  annualKeep: number;
  annualSwap: number;
  fuelCost: number;
  saving: number;
  cash: number;
  surplus: number;
  hardware: number;
  rentalDays: number;
  rentalCost: number;
  paybackYears: number | null;
  withinHorizon: boolean;
  series: { year: number; keep: number; swap: number }[];
  parts: { label: string; keep: number; swap: number; how: string; link?: { name: string; href: string } }[];
  verdict: string;
  headline: string;
  aha: string;
  steps: { title: string; detail: string; lines?: string[]; link?: { name: string; href: string } }[];
  assumptions: Assumption[];
  trace: TraceRow[];
};

function paybackLabel(years: number | null, within: boolean): string {
  if (years == null) return "Does not pay back on running costs";
  if (years < 1) return "Under a year";
  const y = Math.ceil(years);
  return within ? `Year ${y}` : `Year ${y}, past this picture`;
}

export function evaluate(
  a: Answers,
  toggles: Toggles,
  official?: { homeChf: number; n: number; year: string; place: string } | null,
  canton?: string | null,
): Result {
  const persona = pickPersona(a);
  const kmInfo = annualKm(a, persona.id);
  const iceClass: CarClass = a.carClass ?? "compact";
  const fuel: Fuel = a.fuel ?? "petrol";
  const parking: Parking = a.parking ?? "unsure";
  const uses = a.uses.length > 0 ? a.uses : (["everyday"] as UseId[]);
  const focus = focusKind({ ...a, parking, uses });
  const alreadyElectric = fuel === "electric";
  const towingBlocked = toggles.rightSize && uses.includes("towing");
  // A small car has no class below it. Renting days without a smaller car would only add cost to one side.
  const smallestBlocked = toggles.rightSize && !towingBlocked && iceClass === "small";
  const bevClass =
    toggles.rightSize && !uses.includes("towing") ? downClass(iceClass) : iceClass;
  const classDropped = bevClass !== iceClass;
  const ice = SPECS[iceClass];
  const bev = SPECS[bevClass];
  const mix = blend(toggles, uses, a.mix);
  const horizon = a.keepYears === 4 || a.keepYears === 12 || a.keepYears === 16 || a.keepYears === 24 || a.keepYears === 32 ? a.keepYears : RATES.horizon;

  const elcom =
    official && official.homeChf > 0.1 && official.homeChf < 0.8 && official.n >= 1 ? official : null;
  let homeRate = toggles.tariff ? RATES.homeSpecial : (elcom?.homeChf ?? RATES.home);
  if (toggles.pv) homeRate = homeRate * (1 - RATES.pvShare) + RATES.pv * RATES.pvShare;
  const publicRate = toggles.publicPlan ? RATES.publicPlan : RATES.public;
  const rate = mix.home * homeRate + mix.work * RATES.work + mix.public * publicRate;

  const classLitres = fuel === "diesel" ? ice.iceL * 0.92 : fuel === "hybrid" ? ice.iceL * 0.7 : ice.iceL;
  const litresPer100 = a.litres != null && a.litres >= 3 && a.litres <= 14 ? a.litres : classLitres;
  const fuelCost =
    fuel === "electric" ? (kmInfo.km / 100) * ice.kwh * rate : (kmInfo.km / 100) * litresPer100 * pumpFor(fuel);

  const keepPublished = canton ? publishedKeep(canton, iceClass, fuel) : null;
  const swapPublished = canton ? publishedBev(canton, bevClass) : null;
  const keepTax = keepPublished?.chf ?? (fuel === "electric" ? ice.bevTax : ice.iceTax);
  const swapTax = swapPublished?.chf ?? bev.bevTax;

  const annualKeep = Math.round(
    fuel === "electric" ? fuelCost + ice.bevIns + keepTax + ice.bevMaint : fuelCost + ice.iceIns + keepTax + ice.iceMaint,
  );

  const days = towingBlocked || smallestBlocked ? 0 : a.rentDays != null ? a.rentDays : toggles.rightSize ? rentalDays(a) : 0;
  const rentalCost = days * RATES.rentalDay;
  // Zurich's "up to 20 percent" is a ceiling on its own page, not a premium. It stays out of the francs.
  const bevIns = bev.bevIns;
  const energy = (kmInfo.km / 100) * bev.kwh * rate;
  const sameCar = alreadyElectric && !classDropped && !toggles.used;
  let annualSwap = Math.round(energy + bevIns + (sameCar ? keepTax : swapTax) + bev.bevMaint + rentalCost);
  if (sameCar) annualSwap = annualKeep;

  const altPrice =
    a.listPrice != null && a.listPrice >= 5000 && a.listPrice <= 150000
      ? Math.round(a.listPrice)
      : toggles.used
        ? bev.bevUsed
        : bev.bevNew;
  const currentResale =
    a.resalePrice != null && a.resalePrice >= 500 && a.resalePrice <= 80000
      ? Math.round(a.resalePrice)
      : alreadyElectric
        ? ice.bevUsed
        : ice.resale;
  const vehicleNet = sameCar ? 0 : altPrice - currentResale;
  let hardware = 0;
  if (!sameCar) {
    if (a.gearQuote != null && a.gearQuote >= 0 && a.gearQuote <= 20000) hardware += Math.round(a.gearQuote);
    else if (toggles.home) hardware += parking === "house" || parking === "own" ? RATES.wallbox : RATES.sharedInstall;
    if (toggles.used) hardware += RATES.batteryCheck;
  }
  const cash = Math.max(0, Math.round(vehicleNet + hardware));
  const surplus = vehicleNet < 0 ? Math.round(-vehicleNet) : 0;
  const saving = annualKeep - annualSwap;
  const paybackYears = saving > 40 && cash > 0 ? cash / saving : saving > 40 && cash === 0 ? 0 : null;
  const withinHorizon = paybackYears != null && paybackYears <= horizon;

  const series = Array.from({ length: horizon + 1 }, (_, year) => ({
    year,
    keep: annualKeep * year,
    swap: cash + annualSwap * year,
  }));

  const keepIns = fuel === "electric" ? ice.bevIns : ice.iceIns;
  const keepUpkeep = fuel === "electric" ? ice.bevMaint : ice.iceMaint;
  const kmLabel = kmInfo.km.toLocaleString("de-CH");
  const fuelHow = alreadyElectric
    ? `${kmLabel} km, this class’s consumption, and ${rate.toFixed(2)} francs a kWh. The rate is a placeholder, not a bill. There is no public tariff behind it, so there is no source link.`
    : `Keeping the car: ${kmLabel} km × ${litresPer100.toFixed(1)} litres per 100 km × ${pumpFor(fuel).toFixed(2)} francs a litre. Switching: ${kmLabel} km × ${bev.kwh} kWh per 100 km × ${rate.toFixed(2)} francs a kWh. The litre price, the consumption and the rate are placeholders. No pump and no utility is the source, so this line has no link. Not in these francs: the Federal Council proposed on 26 September 2025 a levy on electric cars from 2030, either about 5.4 rappen a kilometre or 22.8 rappen a kWh. The consultation closed on 9 January 2026. It is a draft, not law.`;
  const parts: Result["parts"] = [
    { label: alreadyElectric ? "Power" : "Fuel, or power", keep: Math.round(fuelCost), swap: sameCar ? Math.round(fuelCost) : Math.round(energy), how: fuelHow },
    {
      label: "Insurance",
      keep: keepIns,
      swap: sameCar ? keepIns : bevIns,
      how: "A class placeholder, not a quote. Zurich’s own page offers up to 20 percent off for an electric, plug-in or full-hybrid car. That is a ceiling, not a typical gap. The only published count is still Comparis, 19 August 2025: full cover, calculated in July 2025, cheaper for the electric car in 70 percent of cases and dearer in the rest. For young drivers it was close to half and half. On 11 November 2025 Comparis reported that Zurich, Allianz and others expect higher car premiums in 2026 because repairs cost more. On 6 January 2026 TCS put full-cover premiums up 14 percent in its sample car. Both are all cars, not an electric discount. No later electric-versus-petrol count was found up to 2 October 2026. TCS Electra can cover an unusual loss of battery capacity, and a charging point up to CHF 10,000. Neither is in this line.",
      link: { name: "Comparis: electric-car insurance, 19 August 2025", href: "https://www.comparis.ch/autoversicherung/praemien/elektroauto-versicherung" },
    },
    {
      label: "Tax",
      keep: keepTax,
      swap: sameCar ? keepTax : swapTax,
      how:
        keepPublished && swapPublished
          ? `TCS, February 2026. Keeping a ${keepPublished.car}: ${keepPublished.chf} francs in ${canton}. Switching to a ${swapPublished.car}: ${swapPublished.chf} francs. The nearest published car, not yours, and not a tax bill.${
              canton === "GL"
                ? " Glarus decided on 3 May 2026 that electric cars pay from 1 January 2027, with 25 percent off until 2030. This line still uses the February 2026 figure for every year."
                : canton === "SO"
                  ? " Solothurn’s parliament decided on 6 May 2026 that electric cars will pay, by weight. The government planned 1 January 2027. This line still uses the February 2026 figure for every year."
                  : ""
            }`
          : "A fixed amount for this class. Pick a canton and this line uses the TCS table from February 2026.",
      link: { name: "TCS comparison, February 2026", href: OUT.tcsTax },
    },
    {
      label: "Service",
      keep: keepUpkeep,
      swap: sameCar ? keepUpkeep : bev.bevMaint,
      how: "Service only, not tyres. The federal cost study of March 2023 found electric service about 40 percent lower for a small or mid-size car, and about 20 percent lower for an SUV. The francs per class are still a placeholder, not a garage bill.",
      link: { name: "Full study: total cost of a car, 23 March 2023", href: OUT.tcoReport },
    },
    ...(days > 0 && !sameCar
      ? [{ label: "Rental days", keep: 0, swap: rentalCost, how: `${days} days × ${RATES.rentalDay} francs. A placeholder day rate, not a rental company. No source link.` }]
      : []),
  ];

  const rentalNote = days > 0 ? ` Includes ${days} rental days.` : "";
  const yearLine = `About ${Math.ceil(paybackYears ?? 0)} years to cover it. This picture stops at ${horizon}${horizon === 8 ? ", the federal study" : ""}.`;
  const canDrop = !uses.includes("towing") && iceClass !== "small";
  const stillOpen = toggles.used
    ? classDropped || !canDrop
      ? "Used is already in."
      : "Used is already in. One class down would change the extra price again."
    : classDropped || !canDrop
      ? "A used car would change the extra price."
      : "A used car, or one class down, is what changes the extra price.";
  const notCheaper = classDropped || !canDrop
    ? "A used car would not change that. It only lowers the price at the start."
    : "A used car would not change that. It only lowers the price at the start. One class down changes the running cost.";

  let headline: string;
  let verdict: string;
  if (alreadyElectric && sameCar) {
    headline = "Keep this car";
    verdict = "You already drive electric, and this case is the same car. The money moves only if the size changes, or the car is a certified used one.";
  } else if (saving <= 40) {
    headline = "Keep this car";
    verdict = alreadyElectric
      ? "A different electric car does not cost less to run. The year is fuel or power, insurance, tax and service."
      : `Switching does not cost less to run. The year is fuel or power, insurance, tax and service.\n${notCheaper}`;
  } else if (withinHorizon) {
    headline = "The extra price is covered here";
    verdict = `${chf(saving)} less a year to run. Fuel or power, insurance, tax and service.${rentalNote}\n${chf(cash)} more at the start, after selling the car you have.\n${
      paybackYears != null && paybackYears < 1 ? "Covered in under a year" : `Covered in year ${Math.ceil(paybackYears ?? 0)}, if you keep the next car that long`
    }. This picture is ${horizon} years. Nobody sends you the difference.`;
  } else {
    headline = "Keep this car";
    verdict = `${chf(saving)} less a year to run. Fuel or power, insurance, tax and service.${rentalNote}\n${chf(cash)} more at the start, after selling the car you have.\n${yearLine}\n${stillOpen}`;
  }

  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const assumptions: Assumption[] = [
    {
      label: "Car today",
      value: `${labelClass(iceClass)} · ${labelFuel(fuel)}`,
      tag: a.carClass && a.fuel ? "You" : "Default",
      edit: "car",
    },
    {
      label: "Kilometres a year",
      value: kmPhrase(a.km, kmInfo.km, kmInfo.source === "default" ? persona.title : undefined),
      tag: kmInfo.source === "answer" ? "You" : "Default",
      edit: "km",
    },
    { label: "Parking", value: labelParking(parking), tag: a.parking ? "You" : "Default", edit: "parking" },
    ...(a.mobileInterest
      ? [
          {
            label: "Mobile charger",
            value: a.mobileInterest === "yes" ? "Interested — not priced" : "Not for this case",
            tag: "You" as const,
          },
        ]
      : []),
    ...(a.worry
      ? [
          {
            label: "Aside from the francs",
            value:
              a.worry === "tenant"
                ? "A written ask, not a right"
                : a.worry === "winter"
                  ? "Winter left outside the francs"
                  : "Kept as a choice, not corrected",
            tag: "You" as const,
          },
        ]
      : []),
    {
      label: "Where the electric kilometres charge",
      value: `Home ${pct(mix.home)} · work ${pct(mix.work)} · public ${pct(mix.public)}`,
      tag: a.mix ? "You" : "Model",
      edit: "mix",
    },
    {
      label: "Blended electricity",
      value: elcom && !toggles.tariff
        ? `${rate.toFixed(2)} CHF/kWh · home ${homeRate.toFixed(2)} is the ElCom ${elcom.year} mean for ${elcom.place}, category H4, ${elcom.n.toLocaleString("de-CH")} communes. Not your household, and not an electric-car tariff. Work ${RATES.work.toFixed(2)} and public ${publicRate.toFixed(2)} stay placeholders.`
        : `${rate.toFixed(2)} CHF/kWh · home ${homeRate.toFixed(2)}, work ${RATES.work.toFixed(2)}, public ${publicRate.toFixed(2)}`,
      tag: elcom && !toggles.tariff ? "Official" : "Model",
      edit: "power",
      link: { name: "ElCom electricity prices", href: "https://www.strompreis.elcom.admin.ch/" },
    },
    {
      label: alreadyElectric ? "Fuel equivalent" : "Fuel for the current car",
      value: chf(fuelCost),
      tag: a.litres != null ? "You" : "Model",
      edit: "fuelUse",
    },
    {
      label: sameCar ? "Alternative car" : "Electric car in the case",
      value: sameCar
        ? "Same car — nothing to buy"
        : `${labelClass(bevClass)} · ${toggles.used ? "used, certificate" : "new reference"} · ${chf(altPrice)}`,
      tag: a.listPrice != null ? "You" : "Model",
      edit: "price",
    },
    {
      label: "Resale used for the car you have",
      value: chf(currentResale),
      tag: a.resalePrice != null ? "You" : "Model",
      edit: "resale",
    },
    {
      label: "One-off charging gear and checks",
      value: hardware === 0 ? "None in this case" : chf(hardware),
      tag: a.gearQuote != null ? "You" : "Model",
      edit: "gear",
    },
    {
      label: "Rental days",
      value: towingBlocked
        ? "None — towing is on, so a few rental days do not replace that"
        : smallestBlocked
          ? "None — a small city car has no class below it"
          : days === 0
          ? "None — the smaller-car switch is off"
          : `${days} × CHF ${RATES.rentalDay}`,
      tag: a.rentDays != null ? "You" : "Model",
      edit: "days",
    },
    {
      label: "Time window",
      value:
        horizon === 8
          ? "8 years. Federal energy-office cost study, March 2023, for a new car at 15,000 km. Not how long you will keep it."
          : `${horizon} years, because you said so. The federal study still used 8. The picture uses yours.`,
      tag: horizon === 8 ? "Model" : "You",
      edit: "keep",
      link: { name: "Factsheet: total cost of a car, 23 March 2023", href: OUT.tcoFactsheet },
    },
  ];

  const trace: TraceRow[] = [
    {
      question: "What is holding you back most?",
      kind: "choice",
      answer: a.barrier ? labelBarrier(a.barrier) : "Not answered",
      note: "You chose this. Nothing else invented it.",
    },
    {
      question: "Which situation is the closest fit?",
      kind: "choice",
      answer: `${persona.title} · ${Math.round(persona.probability * 100)}%`,
      note: persona.mixed
        ? "Below 45%. The label is weak, so it does not change the francs."
        : "The label changes the wording, not the price.",
    },
    {
      question: "Is home charging part of this case?",
      kind: "yesno",
      answer: toggles.home ? "Yes" : "No",
      note: "A switch you can turn off. It is not guessed behind your back.",
    },
    {
      question: "What is payback?",
      kind: "score",
      answer: paybackLabel(paybackYears, withinHorizon),
      note: "Extra money to switch, divided by how much less the car costs to run each year. Not a refund, and not a grade.",
    },
  ];

  return {
    answers: a,
    toggles,
    focus,
    persona,
    km: kmInfo.km,
    kmSource: kmInfo.source,
    iceClass,
    bevClass,
    classDropped,
    towingBlocked,
    smallestBlocked,
    alreadyElectric,
    blend: mix,
    rate,
    homeOfficial: Boolean(elcom && !toggles.tariff),
    official: elcom,
    canton: canton && TCS_TAX[canton] ? canton : null,
    annualKeep,
    annualSwap,
    fuelCost,
    saving,
    cash,
    surplus,
    hardware,
    rentalDays: days,
    rentalCost,
    paybackYears,
    withinHorizon,
    series,
    parts,
    verdict,
    headline,
    aha: insight(a, focus),
    steps: nextSteps(a, toggles, focus, withinHorizon, rentalDays(a), alreadyElectric),
    assumptions,
    trace,
  };
}

export function shiftLine(before: Result, after: Result): string {
  const cost = after.annualSwap - before.annualSwap;
  const year = (r: Result) => (r.paybackYears == null ? null : Math.ceil(r.paybackYears));
  const y0 = year(before);
  const y1 = year(after);
  if (y0 !== y1) {
    if (y1 == null) return "No year covers the extra price";
    if (y0 == null) return `A year appears: year ${y1}`;
    return `The year moves to year ${y1}`;
  }
  if (Math.abs(cost) < 40) return "Little change to the year cost";
  return cost < 0 ? `${chf(Math.abs(cost))} less a year` : `${chf(cost)} more a year`;
}

export function homeCopy(parking: Parking | null): { title: string; hint: string } {
  if (parking === "house" || parking === "own") {
    return {
      title: "Wallbox at home",
      hint: "Most of the kilometres at a home rate, plus a placeholder cost to install a charger.",
    };
  }
  if (parking === "none") {
    return {
      title: "A bay you can actually charge in",
      hint: "A rented or agreed bay, not a public charger. The installation cost is a placeholder.",
    };
  }
  return {
    title: "A point in the shared garage",
    hint: "A placeholder share of the installation, then a rate close to a home tariff.",
  };
}

export function researchRecord(result: Result, sessionId: string, opened: string[] = [], datasetVersion: string = DATASET) {
  return {
    v: 1,
    tool: "bev-navigator-prototype",
    sessionId,
    createdAt: new Date().toISOString(),
    note: "Anonymous bag. No name, postcode, or free text. Same shape as the optional session send. This download stays on the device.",
    barrier: result.answers.barrier,
    carClass: result.answers.carClass,
    fuel: result.answers.fuel,
    uses: result.answers.uses,
    kmBand: result.answers.km,
    kmUsed: result.km,
    parking: result.answers.parking,
    focus: result.focus,
    workAccess: result.answers.workAccess,
    tripFreq: result.answers.tripFreq,
    usedStance: result.answers.usedStance,
    costSting: result.answers.costSting,
    mobileInterest: result.answers.mobileInterest,
    worry: result.answers.worry,
    claimsOpened: opened,
    listPrice: result.answers.listPrice ?? null,
    resalePrice: result.answers.resalePrice ?? null,
    keepYears: result.answers.keepYears ?? null,
    litres: result.answers.litres ?? null,
    gearQuote: result.answers.gearQuote ?? null,
    rentDays: result.answers.rentDays ?? null,
    persona: result.persona.id,
    personaProbability: Math.round(result.persona.probability * 100) / 100,
    toggles: result.toggles,
    annualKeep: result.annualKeep,
    annualSwap: result.annualSwap,
    cash: result.cash,
    saving: result.saving,
    paybackYears: result.paybackYears == null ? null : Math.round(result.paybackYears * 10) / 10,
    dataset: datasetVersion,
    model: MODEL,
    cited: ["tco-2023"],
  };
}

export function planText(result: Result): string {
  const frame = result.answers.keepYears === 12 || result.answers.keepYears === 16 || result.answers.keepYears === 24 || result.answers.keepYears === 32 ? result.answers.keepYears : 8;
  const lines = [
    "Would an electric car already work for an ordinary week?",
    "",
    result.headline,
    "",
    result.verdict,
    "",
    `Still open: ${labelBarrier(result.answers.barrier ?? "unsure")}.`,
    "Payback is not money anyone sends you. It is the year when lower running costs have added up to the extra price of switching. Before that year you are still out that extra money.",
    `The picture uses ${frame} years. Eight years is the window in the Swiss Federal Office of Energy cost study of 23 March 2023. ${SOURCES["tco-2023"].url}`,
    "",
    `Cost per year if you switch: ${chf(result.annualSwap)}`,
    `Cost per year if you keep: ${chf(result.annualKeep)}`,
    `Cash to switch: ${chf(result.cash)}`,
    `Payback: ${paybackLabel(result.paybackYears, result.withinHorizon)}`,
    "",
    "Next steps",
    ...result.steps.map((s, i) => `${i + 1}. ${s.title} — ${s.detail}`),
    "",
    "Assumptions",
    ...result.assumptions.map((s) => `- ${s.label}: ${s.value} (${s.tag})`),
    "",
    "Indicative only. Not financial, insurance, tax, or purchase advice. Not an offer.",
  ];
  return lines.join("\n");
}

export function paybackTitle(result: Result): string {
  if (result.paybackYears == null) return "—";
  if (result.paybackYears < 1) return "Under 1";
  return `Year ${Math.ceil(result.paybackYears)}`;
}
