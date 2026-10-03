// The next move, as data. A catalogue of small actions, each with the closed conditions in which it applies, and a
// deterministic ranking that picks the best few for one person. Pure: it reads closed values from a Result and never
// touches the francs. The catalogue is a seed in code today; the same shape is meant to live in a database table
// (see docs/RESULT-PAGE-REDESIGN.md), where a person promotes a row from draft to live.
import { OUT, type Result, type Toggles } from "./model.ts";
import type { Driver } from "./sensitivity.ts";

/** Where the neutral map of public charging points lives. Opened and read on 3 October 2026. */
export const CHARGE_MAP = "https://www.energieschweiz.ch/tools/ladeinfrastruktur-schweiz/";
/** EnergieSchweiz links this database of grants, searched by postcode. Opened on 3 October 2026. */
export const GRANTS_BY_POSTCODE = "https://www.energiefranken.ch/de";

export type ActionKind = "ask" | "write" | "test" | "read" | "remind" | "local" | "plan";
export type ActionStatus = "live" | "draft" | "retired";
export type PanelId = "whatif" | "week" | "place" | "sources";

/** One alternative: every field that is present must match. A field with a list matches any item in it. */
export type Cond = {
  barrier?: string[];
  parking?: string[];
  workAccess?: string[];
  usedStance?: string[];
  fuel?: string[];
  km?: string[];
  use?: string[];
  noUse?: string[];
  notClass?: string[];
  ending?: ("covered" | "keep")[];
  toggle?: Partial<Record<keyof Toggles, boolean>>;
  /** True: neither home nor work charging is on. */
  noCharging?: boolean;
  /** The level the charging set-up check reached (see charging.ts). Absent until the person answers it. */
  chargeLevel?: string[];
  /** Fails when the check reached one of these levels. */
  notChargeLevel?: string[];
};

/** Only these publishers may be linked. A paid-per-lead platform, a dealer or an insurer is never on the list. */
export const NEUTRAL_PUBLISHERS = ["EnergieSchweiz", "TCS", "Swiss eMobility", "ElCom", "BFE", "BAFU"] as const;

export type Action = {
  id: string;
  version: number;
  kind: ActionKind;
  status: ActionStatus;
  title: string;
  text: string;
  /** A short list to read, or a message to copy. */
  lines?: string[];
  /** The whole message, when the action is to write to someone. */
  template?: string;
  link?: { name: string; href: string; publisher: (typeof NEUTRAL_PUBLISHERS)[number]; checked?: string };
  minutes: number;
  /** What it closes: a barrier id, or "keep", "km", "local". */
  closes: string[];
  /** Which of the "what moves the answer" figures it speaks to. */
  drivers: Driver["id"][];
  /** Finishes the sentence "Shown because ...". */
  because: string;
  when: Cond[];
  /** The page opens this panel (the What-if panel, say) when the person taps "Try it". */
  panel?: PanelId;
  /** A switch the What-if panel can flip for this action. */
  lever?: keyof Toggles;
  /** An existing page tool this action runs. */
  run?: "reminder";
};

const HARD = ["none", "shared", "unsure"];

export const ACTIONS_SEED: Action[] = [
  {
    id: "settle-charging",
    version: 1,
    kind: "plan",
    status: "live",
    title: "Settle a normal week of charging first",
    text: "Without a home or work point, the public network carries every kilometre. That is usually the expensive case, and a car will not fix it.",
    lines: ["Where does the car stand overnight?", "Where does it stand during the day?", "Is there a plug within reach at either place?"],
    minutes: 10,
    closes: ["charging"],
    drivers: ["home", "public"],
    because: "you have no charging point at home or at work yet",
    when: [{ parking: HARD, noCharging: true, notChargeLevel: ["holds"] }],
    panel: "whatif",
    lever: "home",
  },
  {
    id: "test-charging-week",
    version: 1,
    kind: "test",
    status: "live",
    title: "Test your charging places for one week",
    text: "A map shows a moment. A week at your own hours shows whether the place is free, allowed, reachable and fairly priced. It is the cheapest way to find out before you buy anything.",
    lines: [
      "Is it free at the hours you would use it: early morning, evening, Saturday?",
      "May you park there for that long, and is there a fee or a time limit?",
      "How far is the walk, and does a card or an app open it?",
      "What does a kWh cost, and are there start, time or blocking fees?",
      "Is there a second place, run by someone else, within reach?",
    ],
    link: { name: "EnergieSchweiz: map of public charging points", href: CHARGE_MAP, publisher: "EnergieSchweiz", checked: "2026-10-03" },
    minutes: 15,
    closes: ["charging"],
    drivers: ["public", "home"],
    because: "a charging place only counts once you have tried it at your own hours",
    when: [{ chargeLevel: ["test", "timing", "backup"] }, { parking: HARD, noCharging: true }],
  },
  {
    id: "ask-employer",
    version: 1,
    kind: "write",
    status: "live",
    title: "Ask your employer one question",
    text: "One written answer, yes, no or not yet, changes this check more than another evening of brochures.",
    template:
      "Hello, I am thinking about an electric car. May I charge it at work on a working day? If yes, who pays for the electricity, and at what rate? A short answer, yes, no or not yet, would help me decide. Thank you.",
    minutes: 5,
    closes: ["charging"],
    drivers: ["home", "public"],
    because: "charging at work could carry most of your kilometres",
    when: [{ workAccess: ["ask", "yes"] }, { parking: HARD, use: ["commute"] }, { chargeLevel: ["missing"] }],
    panel: "whatif",
    lever: "work",
  },
  {
    id: "ask-building",
    version: 1,
    kind: "write",
    status: "live",
    title: "Put the building question in writing",
    text: "A shared garage is a decision for the landlord or the other owners. Some sites look at a mobile charger on an existing power line instead of rebuilding the garage. That depends on that building's supply. It is not a general right.",
    template:
      "Hello, I am considering an electric car. Is there a bay that comes with my home? Who would pay for a supply line, a meter and a charging point? Would a mobile charger on the existing line be allowed here? A written answer would help me plan. Thank you.",
    link: { name: "Charging in a rented building, EnergieSchweiz", href: OUT.tenantGuide, publisher: "EnergieSchweiz" },
    minutes: 10,
    closes: ["charging"],
    drivers: ["home"],
    because: "your parking is a building decision, not only yours",
    when: [{ parking: ["shared", "unsure"] }, { chargeLevel: ["missing"], workAccess: ["no"] }],
  },
  {
    id: "check-battery",
    version: 1,
    kind: "read",
    status: "live",
    title: "Only price a used car with a battery certificate",
    text: "The certificate is the check on the most expensive part. Without it, a used electric car is a rumour with a price.",
    lines: ["The date", "The kilometres", "The method", "The result"],
    link: { name: "TCS: a used electric car", href: OUT.tcsUsed, publisher: "TCS" },
    minutes: 10,
    closes: ["cost", "trust"],
    drivers: ["price"],
    because: "a used car could cut the price gap, and the battery is the risk",
    when: [{ toggle: { used: true } }, { barrier: ["cost", "trust"] }, { usedStance: ["yes"] }],
  },
  {
    id: "price-rental-days",
    version: 1,
    kind: "plan",
    status: "live",
    title: "Price the exceptional days as rental",
    text: "A few rental days a year can cost less than owning a larger battery all year. Try it and watch the year.",
    minutes: 5,
    closes: ["trips"],
    drivers: ["price", "resale"],
    because: "the rare long trips are what you worry about",
    when: [
      { barrier: ["trips"], noUse: ["towing"], notClass: ["small"] },
      { toggle: { rightSize: true }, noUse: ["towing"], notClass: ["small"] },
    ],
    panel: "whatif",
    lever: "rightSize",
  },
  {
    id: "weekend-test",
    version: 1,
    kind: "test",
    status: "live",
    title: "Test it for two days, not twenty minutes",
    text: "A short loop hides winter range and the real charging routine. A weekend will not.",
    lines: ["Drive the commute you actually do", "Charge where you would park this car, not only at the seller", "If one trip is the worry, drive that distance"],
    minutes: 15,
    closes: ["trust"],
    drivers: ["km"],
    because: "you want proof before you believe the numbers",
    when: [{ barrier: ["trust"] }, { usedStance: ["new", "no"] }],
  },
  {
    id: "trial-routes",
    version: 1,
    kind: "test",
    // Retired 3 October 2026: the EnergieSchweiz page /probefahren/ now redirects to the programme's front page, which lists no trial offer.
    status: "retired",
    title: "Try an electric car for longer than a test drive",
    text: "The federal page that once listed this no longer does. Not shown.",
    minutes: 15,
    closes: ["trust"],
    drivers: [],
    because: "you want to feel it before you decide",
    when: [{ barrier: ["trust"] }],
  },
  {
    id: "track-km",
    version: 1,
    kind: "test",
    status: "live",
    title: "Write down your real distance for one week",
    text: "The distance is the figure we guessed for you. One week of real kilometres, times 52, is better than any band.",
    lines: ["Photograph the odometer on Monday morning", "Photograph it again the next Monday", "Multiply the difference by 52"],
    minutes: 5,
    closes: ["km", "cost"],
    drivers: ["km"],
    because: "the distance was a guess, and it moves your result",
    when: [{ km: ["unsure"] }],
  },
  {
    id: "check-fuel-receipts",
    version: 1,
    kind: "plan",
    status: "live",
    title: "Add up your last three fuel receipts",
    text: "Your own litres and your own price per litre beat our figure. Compare them with what the What-if panel uses.",
    lines: ["The litres on each receipt", "The price per litre on each", "Your average price per litre"],
    minutes: 5,
    closes: ["cost"],
    drivers: ["pump"],
    because: "the fuel price is one of the figures that moves your result most",
    when: [{ fuel: ["petrol", "diesel", "hybrid"] }],
    panel: "whatif",
  },
  {
    id: "check-resale",
    version: 1,
    kind: "plan",
    status: "live",
    title: "See what cars like yours really sell for",
    text: "What your car sells for is a guess here. Three real asking prices make it a number.",
    lines: ["Find three similar cars for sale: same class, age and kilometres", "Write down the asking prices", "Take off a few hundred francs for haggling"],
    minutes: 10,
    closes: ["cost"],
    drivers: ["resale"],
    because: "what your car sells for is a guess, and it moves your result",
    when: [{ fuel: ["petrol", "diesel", "hybrid"] }],
    panel: "whatif",
  },
  {
    id: "keep-valid",
    version: 1,
    kind: "remind",
    status: "live",
    title: "Keep the car, and look again in six months",
    text: "If a used car and a smaller one still pay back too late, the check has done its job. It is not a failure to stay. Prices and rules change, so a reminder costs nothing.",
    minutes: 1,
    closes: ["keep"],
    drivers: [],
    because: "on these figures keeping your car is a fair result",
    when: [{ ending: ["keep"] }],
    run: "reminder",
  },
  {
    id: "ask-seller",
    version: 1,
    kind: "ask",
    status: "live",
    title: "Put five questions to any seller",
    text: "Some sellers know electric cars well and some do not. Five written questions show which one you are talking to, and they cost nothing.",
    template:
      "Hello, I am considering this car. Please tell me in writing: 1) How will you show me how charging works, at home and on the road? 2) For a used car: may I see a battery-health certificate with date, kilometres, method and result? 3) What warranty is left on the battery, and who honours it? 4) Would you buy it back, or tell me what it is likely to be worth in a few years? 5) What does the full price include: charging cable, registration, delivery? Thank you.",
    minutes: 5,
    closes: ["trust", "cost"],
    drivers: ["price", "resale"],
    because: "a seller's answers are part of how far you can trust the car",
    when: [{ barrier: ["trust", "cost"] }, { usedStance: ["yes"] }],
  },
  {
    id: "ask-car-data",
    version: 1,
    kind: "ask",
    status: "live",
    title: "Ask what the car sends, before you sign",
    text: "Connected cars of every kind pass data on. A written, configuration-specific answer from the maker is stronger than any brand ranking. No study shows an electric car is worse than a petrol one.",
    template:
      "Hello, I am considering the [model, year]. With no app account linked, navigation unused and the data-sharing setting on the most private choice, which data leave the car: location, trips, mileage, battery state, faults? For each: what triggers it, who receives it, where it is processed and how long it is kept? How do I reset it for a second driver or when I sell the car? Please answer in writing. Thank you.",
    minutes: 5,
    closes: ["trust"],
    drivers: [],
    because: "you said trust is what holds you back, and what a car passes on is part of it",
    when: [{ barrier: ["trust"] }],
  },
  {
    id: "ask-two-for-one-terms",
    version: 1,
    kind: "ask",
    status: "live",
    title: "If someone offers you a bigger car for the few days, get these in writing",
    text: "A promise of a bigger car for holidays is only a plan when the terms are written down. Without them it is a nice idea.",
    lines: [
      "How many days a year are guaranteed?",
      "How early must you book, and what happens in a peak holiday week?",
      "Which class of car, with a roof box or bike rack if you need it?",
      "Who pays insurance, charging and damage?",
      "What ends the guarantee, and who is the other party to the contract?",
    ],
    minutes: 5,
    closes: ["trips"],
    drivers: ["price", "resale"],
    because: "the rare trips are what you worry about, and a promise only helps if it is written down",
    when: [{ barrier: ["trips"] }, { toggle: { rightSize: true } }],
  },
  {
    id: "see-commune",
    version: 1,
    kind: "local",
    status: "live",
    title: "Look up your commune's own page",
    text: "Grants, tariffs and charging rules differ by canton and commune. Energiefranken, which EnergieSchweiz links, lists the grants for a postcode. The energy advice directory names a person for yours.",
    link: { name: "Energiefranken: grants for your postcode", href: GRANTS_BY_POSTCODE, publisher: "EnergieSchweiz", checked: "2026-10-03" },
    minutes: 5,
    closes: ["local"],
    drivers: [],
    because: "local grants and rules are not in this sum",
    when: [{}],
    panel: "place",
  },
];

/** Every action a stored session may name as the move shown. Drafts are not shown, so they are not here. */
export const ACTION_IDS: string[] = ACTIONS_SEED.filter((a) => a.status === "live").map((a) => a.id);

export const OUTCOMES = ["done", "not_for_me", "unclear"] as const;
export type Outcome = (typeof OUTCOMES)[number];

/** The closed list a stored session may carry for next-move taps: "<action id>.<outcome>". */
export const OUTCOME_KEYS: string[] = ACTIONS_SEED.filter((a) => a.status === "live").flatMap((a) => OUTCOMES.map((o) => `${a.id}.${o}`));

export function cleanOutcomes(value: unknown): string[] {
  const out: string[] = [];
  if (!Array.isArray(value)) return out;
  for (const item of value) {
    if (typeof item === "string" && OUTCOME_KEYS.includes(item) && !out.includes(item)) out.push(item);
    if (out.length >= 12) break;
  }
  return out;
}

export type Features = {
  barrier: string | null;
  parking: string | null;
  workAccess: string | null;
  usedStance: string | null;
  fuel: string | null;
  km: string | null;
  uses: string[];
  carClass: string;
  ending: "covered" | "keep";
  toggles: Partial<Record<keyof Toggles, boolean>>;
  /** From the optional charging set-up check. Null until answered. */
  chargeLevel: string | null;
};

export function featuresOf(r: Result, chargeLevel: string | null = null): Features {
  const covered = r.paybackYears != null && r.saving > 40 && r.paybackYears <= 8;
  return {
    barrier: r.answers.barrier,
    parking: r.answers.parking,
    workAccess: r.answers.workAccess,
    usedStance: r.answers.usedStance,
    fuel: r.answers.fuel,
    km: r.answers.km,
    uses: r.answers.uses,
    carClass: r.iceClass,
    ending: covered ? "covered" : "keep",
    toggles: r.toggles,
    chargeLevel,
  };
}

function has(list: string[] | undefined, value: string | null): boolean {
  return list == null || (value != null && list.includes(value));
}

export function matches(c: Cond, f: Features): boolean {
  if (!has(c.barrier, f.barrier)) return false;
  if (!has(c.parking, f.parking)) return false;
  if (!has(c.workAccess, f.workAccess)) return false;
  if (!has(c.usedStance, f.usedStance)) return false;
  if (!has(c.fuel, f.fuel)) return false;
  if (!has(c.km, f.km)) return false;
  if (!has(c.chargeLevel, f.chargeLevel)) return false;
  if (c.notChargeLevel && f.chargeLevel && c.notChargeLevel.includes(f.chargeLevel)) return false;
  if (c.ending && !c.ending.includes(f.ending)) return false;
  if (c.use && !c.use.some((u) => f.uses.includes(u))) return false;
  if (c.noUse && c.noUse.some((u) => f.uses.includes(u))) return false;
  if (c.notClass && c.notClass.includes(f.carClass)) return false;
  if (c.toggle) for (const [k, v] of Object.entries(c.toggle)) if (Boolean(f.toggles[k as keyof Toggles]) !== v) return false;
  if (c.noCharging && (f.toggles.home || f.toggles.work)) return false;
  return true;
}

export type Ranked = { action: Action; score: number; because: string; driver: Driver["id"] | null };

/**
 * The best few actions for this person. Eligible: live, and at least one alternative of `when` matches.
 * Score: 3 when it closes the gap they named (their barrier, the kilometre guess, or a result that says keep), up to 2 when
 * it speaks to one of the figures that move their result most, a little for being quick. Ties keep catalogue order.
 */
export function rankActions(f: Features, drivers: { id: Driver["id"]; label: string }[], catalogue: Action[] = ACTIONS_SEED): Ranked[] {
  const gaps = new Set<string>();
  if (f.barrier) gaps.add(f.barrier);
  if (f.ending === "keep") gaps.add("keep");
  if (f.km === "unsure") gaps.add("km");
  const order = new Map(drivers.map((d, i) => [d.id, i]));
  const ranked: Ranked[] = [];
  catalogue.forEach((action, index) => {
    if (action.status !== "live") return;
    if (!action.when.some((c) => matches(c, f))) return;
    let score = 0;
    if (action.closes.some((g) => gaps.has(g))) score += 3;
    let hit: Driver["id"] | null = null;
    let best = Infinity;
    for (const d of action.drivers) {
      const place = order.get(d);
      if (place != null && place < best) {
        best = place;
        hit = d;
      }
    }
    if (hit != null && best < 3) score += 2 - best * 0.5;
    score += action.minutes <= 5 ? 1 : action.minutes <= 10 ? 0.5 : 0;
    score -= index * 0.001;
    const label = hit ? drivers.find((d) => d.id === hit)?.label.toLowerCase() : null;
    const because = `Shown because ${action.because}.${hit != null && best < 3 && label ? ` It also speaks to “${label}”, one of the figures that moves your result most.` : ""}`;
    ranked.push({ action, score, because, driver: best < 3 ? hit : null });
  });
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}
