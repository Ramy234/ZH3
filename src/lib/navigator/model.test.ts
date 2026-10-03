import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY, SAMPLE, evaluate, researchRecord, suggestToggles } from "./model.ts";
import type { Answers, Toggles } from "./model.ts";

const A = (over: Partial<Answers>): Answers => ({ ...EMPTY, ...over });

// Golden scenarios. Numbers pinned from the model as reviewed on 2 Oct 2026 (MODEL 2026-10-03-r4, DATASET v-2026-10-03-0003; pump 1.83 / 2.03 (average of the 2026 TCS entries to 19 Sep), home 0.265 (ElCom 2027 median), public 0.59 / 0.51).
// A failing golden means the arithmetic moved: check it is intended, then bump MODEL and re-pin.
const GOLDEN: {
  name: string;
  a: Answers;
  headline: string;
  keep: number;
  swap: number;
  cash: number;
  saving: number;
  year: number | null;
  within: boolean;
  km: number;
}[] = [
  { name: "worked example", a: SAMPLE, headline: "Keep this car", keep: 3865, swap: 2164, cash: 27900, saving: 1701, year: 17, within: false, km: 14000 },
  { name: "small car with trips", a: A({ barrier: "trips", carClass: "small", fuel: "petrol", uses: ["everyday", "holiday"], km: "mid", parking: "own", tripFreq: "often" }), headline: "Keep this car", keep: 3093, swap: 1896, cash: 25300, saving: 1197, year: 22, within: false, km: 14000 },
  { name: "towing", a: A({ barrier: "trips", carClass: "suv", fuel: "diesel", uses: ["towing", "holiday"], km: "gt20", parking: "house" }), headline: "Keep this car", keep: 7135, swap: 4313, cash: 44600, saving: 2822, year: 16, within: false, km: 24000 },
  { name: "already electric", a: A({ barrier: "cost", carClass: "compact", fuel: "electric", uses: ["everyday"], km: "mid", parking: "own" }), headline: "Keep this car", keep: 2372, swap: 2372, cash: 0, saving: 0, year: null, within: false, km: 14000 },
  { name: "not sure kilometres", a: A({ barrier: "unsure", carClass: "compact", fuel: "petrol", uses: ["everyday"], km: "unsure", parking: "unsure" }), headline: "Keep this car", keep: 3498, swap: 2209, cash: 27900, saving: 1289, year: 22, within: false, km: 11000 },
  { name: "low kilometres", a: A({ barrier: "cost", carClass: "small", fuel: "petrol", uses: ["everyday"], km: "lt10", parking: "none" }), headline: "Keep this car", keep: 2501, swap: 1910, cash: 12250, saving: 591, year: 21, within: false, km: 8000 },
  { name: "high kilometres, used ok", a: A({ barrier: "cost", carClass: "mid", fuel: "diesel", uses: ["business", "long"], km: "gt20", parking: "house", usedStance: "yes" }), headline: "The extra price is covered here", keep: 5932, swap: 3517, cash: 9850, saving: 2415, year: 5, within: true, km: 24000 },
  { name: "hybrid SUV, distrusts used", a: A({ barrier: "trust", carClass: "suv", fuel: "hybrid", uses: ["everyday"], km: "mid", parking: "own", usedStance: "no" }), headline: "Keep this car", keep: 4876, swap: 3620, cash: 44600, saving: 1256, year: 36, within: false, km: 14000 },
  { name: "diesel van, business", a: A({ barrier: "charging", carClass: "van", fuel: "diesel", uses: ["business"], km: "gt20", parking: "own", workAccess: "yes" }), headline: "Keep this car", keep: 7379, swap: 3916, cash: 42900, saving: 3463, year: 13, within: false, km: 24000 },
  { name: "nothing answered", a: EMPTY, headline: "Keep this car", keep: 3498, swap: 2681, cash: 26400, saving: 817, year: 33, within: false, km: 11000 },
];

for (const g of GOLDEN) {
  test(`golden: ${g.name}`, () => {
    const r = evaluate(g.a, suggestToggles(g.a));
    assert.equal(r.headline, g.headline);
    assert.equal(r.annualKeep, g.keep);
    assert.equal(r.annualSwap, g.swap);
    assert.equal(r.cash, g.cash);
    assert.equal(r.saving, g.saving);
    assert.equal(r.paybackYears == null ? null : Math.ceil(r.paybackYears), g.year);
    assert.equal(r.withinHorizon, g.within);
    assert.equal(r.km, g.km);
  });
}

// Invariant: the title agrees with the lines under it.
for (const g of GOLDEN) {
  test(`title agrees with the lines: ${g.name}`, () => {
    const r = evaluate(g.a, suggestToggles(g.a));
    const covered = r.headline === "The extra price is covered here";
    assert.equal(covered, r.saving > 40 && r.withinHorizon);
    if (covered) {
      assert.match(r.verdict, /Covered in (year \d+|under a year)/);
      assert.ok(r.verdict.includes(`${Math.ceil(r.paybackYears ?? 0)}`) || r.paybackYears! < 1);
    } else {
      assert.equal(r.headline, "Keep this car");
      assert.doesNotMatch(r.verdict, /Covered in/);
    }
    assert.equal(r.series.length, 9);
    assert.equal(r.series[0]!.swap, r.cash);
  });
}

// Tap matrix: flipping any one switch either moves a franc or is not in the sum at all.
const NOT_IN_THE_SUM: (keyof Toggles)[] = ["insDiscount"]; // Zurich's 20 % is a ceiling, kept out of the francs
const TOGGLES: (keyof Toggles)[] = ["home", "work", "rightSize", "used", "publicPlan", "tariff", "pv", "insDiscount"];

const MATRIX: Answers[] = [
  SAMPLE,
  A({ barrier: "trips", carClass: "suv", fuel: "diesel", uses: ["holiday", "long"], km: "gt20", parking: "house" }),
  A({ barrier: "cost", carClass: "mid", fuel: "petrol", uses: ["everyday"], km: "mid", parking: "own", workAccess: "yes" }),
];

for (const toggle of TOGGLES) {
  test(`tap matrix: ${toggle}`, () => {
    let moved = false;
    for (const a of MATRIX) {
      for (const start of [false, true]) {
        const base: Toggles = { ...suggestToggles(a), [toggle]: start };
        const flipped: Toggles = { ...base, [toggle]: !start };
        const r0 = evaluate(a, base);
        const r1 = evaluate(a, flipped);
        if (r0.annualSwap !== r1.annualSwap || r0.cash !== r1.cash || r0.annualKeep !== r1.annualKeep) moved = true;
      }
    }
    if (NOT_IN_THE_SUM.includes(toggle)) assert.equal(moved, false, `${toggle} must stay out of the francs`);
    else assert.equal(moved, true, `${toggle} moves no franc and is not labelled as outside the sum`);
  });
}

test("a closed tap never invents cost: switching a toggle off keeps keep-side francs fixed", () => {
  const a = SAMPLE;
  const on = evaluate(a, { ...suggestToggles(a), pv: true });
  const off = evaluate(a, { ...suggestToggles(a), pv: false });
  assert.equal(on.annualKeep, off.annualKeep);
});

// Outside the francs: climate, grants, 2030 levy, winter. Nothing in the result carries them.
test("climate, grants, levy and winter never enter the francs", () => {
  const r = evaluate(SAMPLE, suggestToggles(SAMPLE));
  const keys = Object.keys(r).join(" ").toLowerCase();
  assert.doesNotMatch(keys, /co2|carbon|grant|levy|winter/);
  const withDiscount = evaluate(SAMPLE, { ...suggestToggles(SAMPLE), insDiscount: true });
  assert.equal(withDiscount.annualSwap, r.annualSwap);
});

// Payload whitelist: researchRecord carries only these fields. Extra answers must not leak.
const WHITELIST = new Set([
  "v", "tool", "sessionId", "createdAt", "note", "barrier", "carClass", "fuel", "uses", "kmBand", "kmUsed",
  "parking", "focus", "workAccess", "tripFreq", "usedStance", "costSting", "mobileInterest", "worry",
  "claimsOpened", "listPrice", "resalePrice", "keepYears", "litres", "gearQuote", "rentDays", "persona",
  "personaProbability", "toggles", "annualKeep", "annualSwap", "cash", "saving", "paybackYears",
  "dataset", "model", "cited",
]);

test("research record has no field outside the whitelist and no free text", () => {
  const hostile = { ...SAMPLE, postcode: "8001", name: "Hans Muster", note: "<script>x</script>" } as unknown as Answers;
  const rec = researchRecord(evaluate(hostile, suggestToggles(hostile)), "s-1", ["battery"]);
  for (const key of Object.keys(rec)) assert.ok(WHITELIST.has(key), `unexpected field: ${key}`);
  const text = JSON.stringify(rec);
  assert.doesNotMatch(text, /8001|Hans|script/);
});

// A hybrid buys petrol: its litre price is petrol's, and only its consumption is lower.
test("hybrid pays the petrol litre price", () => {
  const base = { ...EMPTY, barrier: "cost" as const, carClass: "compact" as const, uses: ["everyday" as const], km: "mid" as const, parking: "own" as const };
  const hybrid = evaluate({ ...base, fuel: "hybrid" }, suggestToggles({ ...base, fuel: "hybrid" }));
  const petrol = evaluate({ ...base, fuel: "petrol" }, suggestToggles({ ...base, fuel: "petrol" }));
  assert.ok(hybrid.annualKeep < petrol.annualKeep, "lower consumption still makes it cheaper to run");
  assert.match(hybrid.parts[0].how, /1.83 francs a litre/);
});

test("going without a car: a travel card plus rented days, the car sold once, never the headline", () => {
  const a = A({ barrier: "cost", carClass: "compact", fuel: "petrol", uses: ["everyday"], km: "mid", parking: "own", tripFreq: "rare" });
  const r = evaluate(a, suggestToggles(a));
  assert.equal(r.without.card, 4095);
  assert.equal(r.without.days, 2);
  assert.equal(r.without.annual, 4095 + 2 * 75);
  assert.equal(r.without.series.length, r.series.length);
  assert.equal(r.without.series[0], -r.without.creditBack);
  assert.equal(r.without.series[3], r.without.annual * 3 - r.without.creditBack);
  // It is an extra line: the keep and switch numbers do not depend on it.
  assert.equal(r.series[3]!.keep, r.annualKeep * 3);
  assert.equal(r.series[3]!.swap, r.cash + r.annualSwap * 3);
});

test("used-car ceiling: resale plus the saving over the window, minus gear and the battery check", () => {
  const a = { ...SAMPLE, carClass: "compact" as const, km: "mid" as const, fuel: "petrol" as const };
  const r = evaluate(a, suggestToggles(a), null, null);
  const u = r.usedCeiling!;
  assert.ok(u);
  assert.equal(u.window, 8);
  assert.equal(u.resale, 8500);
  const expected = Math.round((u.resale + u.saving * 8 - u.gear) / 100) * 100;
  assert.equal(u.chf, expected);
  assert.equal(u.reachable, u.resale + u.saving * 8 - u.gear >= u.classUsed);
  // A used car at exactly the ceiling reaches the window, give or take the rounding to a hundred.
  const atCeiling = evaluate({ ...a, listPrice: u.chf }, { ...suggestToggles(a), used: true }, null, null);
  assert.ok(atCeiling.paybackYears != null && atCeiling.paybackYears <= 8.2, `payback ${atCeiling.paybackYears}`);
  // Already electric: no ceiling.
  const e = evaluate({ ...a, fuel: "electric" as const }, suggestToggles({ ...a, fuel: "electric" as const }), null, null);
  assert.equal(e.usedCeiling, null);
});
