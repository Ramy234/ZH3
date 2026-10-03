import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY, PUMP, RATES, SAMPLE, SPECS, evaluate, suggestToggles } from "./model.ts";
import { CAP_YEARS, sensitivity } from "./sensitivity.ts";
import type { Answers } from "./model.ts";

const A = (over: Partial<Answers>): Answers => ({ ...EMPTY, ...over });
const result = (a: Answers) => evaluate(a, suggestToggles(a));

test("sensitivity: sorted by swing, the base sits inside the range, and nothing is left changed", () => {
  const before = JSON.stringify({ PUMP, RATES, SPECS });
  const r = result(SAMPLE);
  const s = sensitivity(r)!;
  assert.equal(JSON.stringify({ PUMP, RATES, SPECS }), before);
  assert.ok(s.drivers.length >= 4);
  for (let i = 1; i < s.drivers.length; i++) assert.ok(s.drivers[i - 1]!.swing >= s.drivers[i]!.swing);
  const yrs = (o: { payback: number | null }) => (o.payback == null ? CAP_YEARS : Math.min(CAP_YEARS, o.payback));
  assert.ok(yrs(s.best) <= yrs(s.base) && yrs(s.base) <= yrs(s.worst));
  for (const d of s.drivers) assert.ok(yrs(d.better) <= yrs(d.worse), d.id);
  assert.equal(s.base.saving, r.saving);
});

test("sensitivity: an already-electric case has nothing to move, and the pump price is skipped for no fuel", () => {
  assert.equal(sensitivity(result(A({ barrier: "cost", carClass: "compact", fuel: "electric", uses: ["everyday"], km: "mid", parking: "own" }))), null);
});

test("sensitivity: a higher pump price never makes the switch look worse", () => {
  const s = sensitivity(result(SAMPLE))!;
  const pump = s.drivers.find((d) => d.id === "pump")!;
  assert.match(pump.better.input, /francs a litre/);
  assert.ok(parseFloat(pump.better.input) > parseFloat(pump.worse.input));
});

test("sensitivity: with an ElCom home figure picked, the home price is the one that moves", () => {
  const a = A({ barrier: "cost", carClass: "compact", fuel: "petrol", uses: ["everyday"], km: "mid", parking: "own" });
  const official = { homeChf: 0.2, n: 100, year: "2026", place: "Test" };
  const r = evaluate(a, suggestToggles(a), official, "ZH");
  const s = sensitivity(r)!;
  const home = s.drivers.find((d) => d.id === "home")!;
  assert.match(home.better.input, /^15 rappen/);
  assert.match(home.worse.input, /^25 rappen/);
  assert.equal(RATES.home, 0.265);
});
