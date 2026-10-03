import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY, SAMPLE, RATES, evaluate, suggestToggles } from "./model.ts";
import { wouldHaveToBeTrue } from "./counterfactual.ts";
import type { Answers } from "./model.ts";

const A = (over: Partial<Answers>): Answers => ({ ...EMPTY, ...over });
const run = (a: Answers) => {
  const r = evaluate(a, suggestToggles(a));
  return { r, c: wouldHaveToBeTrue(r) };
};

test("late: the two gaps are the arithmetic of the 8-year window, and the best lever really moves the year", () => {
  const { r, c } = run(SAMPLE);
  assert.equal(c.kind, "late");
  if (c.kind !== "late") return;
  assert.equal(c.window, RATES.horizon);
  assert.equal(c.extraPriceMustFall, r.cash - r.saving * RATES.horizon);
  // With that much less extra price, or that much more saving each year, the payback lands on the window.
  assert.ok((r.cash - c.extraPriceMustFall) / r.saving <= RATES.horizon + 1e-9);
  assert.ok(r.cash / (r.saving + c.yearlySavingMustRise) <= RATES.horizon + 1e-9);
  if (c.best) {
    assert.ok(c.best.paybackAfter < (r.paybackYears ?? Infinity));
    assert.equal(c.best.reaches, c.best.paybackAfter <= RATES.horizon);
    assert.equal(r.toggles[c.best.key], false);
  }
});

test("covered: says how much room the extra price has before the year passes 8", () => {
  const { r, c } = run(A({ barrier: "cost", carClass: "mid", fuel: "diesel", uses: ["business", "long"], km: "gt20", parking: "house", usedStance: "yes" }));
  assert.equal(c.kind, "covered");
  if (c.kind === "covered") assert.equal(c.room, Math.round(r.saving * 8 - r.cash));
  assert.ok(r.withinHorizon);
});

test("no saving: no price can make the money come back, and only a lever that creates a saving is offered", () => {
  const { r, c } = run(A({ barrier: "cost", carClass: "compact", fuel: "hybrid", uses: ["everyday"], km: "gt20", parking: "none" }));
  assert.ok(r.saving <= 40);
  assert.equal(c.kind, "no-saving");
  if (c.kind === "no-saving" && c.best) {
    const next = evaluate(r.answers, { ...r.toggles, [c.best.key]: true }, r.official, r.canton);
    assert.ok(next.saving > 40);
  }
});

test("already electric: nothing to counter-argue", () => {
  assert.equal(run(A({ barrier: "cost", carClass: "compact", fuel: "electric", uses: ["everyday"], km: "mid", parking: "own" })).c.kind, "none");
});

test("it never changes the result it reads", () => {
  const r = evaluate(SAMPLE, suggestToggles(SAMPLE));
  const before = JSON.stringify(r);
  wouldHaveToBeTrue(r);
  assert.equal(JSON.stringify(r), before);
});

import { ordinaryWeek } from "./week.ts";
import { SPECS } from "./model.ts";

test("ordinary week: plain division, and it never touches the francs", () => {
  const r = evaluate(SAMPLE, suggestToggles(SAMPLE));
  const before = JSON.stringify(r);
  const w = ordinaryWeek(r);
  assert.equal(w.weekKm, r.km / 52);
  assert.ok(Math.abs(w.share - (w.weekKwh / SPECS[r.bevClass].battery)) < 1e-12);
  assert.equal(w.coversWeek, w.fullChargeKm >= w.weekKm);
  assert.ok(Math.abs(w.mix.home + w.mix.work + w.mix.public - 1) < 1e-9);
  assert.equal(JSON.stringify(r), before);
  for (const cls of Object.values(SPECS)) assert.ok(cls.battery > 0 && cls.battery < 200);
});
