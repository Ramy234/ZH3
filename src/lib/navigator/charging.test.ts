import { test } from "node:test";
import assert from "node:assert/strict";
import { EXAMPLE_TARIFFS, NO_SETUP, chargeVerdict, cleanSetup, costPer100, setupDone } from "./charging.ts";

const S = (main: any, backup: any, standing: any) => ({ main, backup, standing });

test("charging check: nothing is said until all three taps are answered", () => {
  assert.equal(chargeVerdict(NO_SETUP, null), null);
  assert.equal(chargeVerdict(S("yes", "yes", null), null), null);
  assert.equal(setupDone(S("yes", "no", "yes")), true);
});

test("charging check: a missing main place comes first and points to employer or building", () => {
  assert.equal(chargeVerdict(S("no", "yes", "yes"), "ask")?.level, "missing");
  assert.equal(chargeVerdict(S("no", "yes", "yes"), "ask")?.next, "ask-employer");
  assert.equal(chargeVerdict(S("no", "no", "no"), "no")?.next, "ask-building");
});

test("charging check: a maybe is a test, never a pass", () => {
  assert.equal(chargeVerdict(S("maybe", "yes", "yes"), null)?.level, "test");
});

test("charging check: charging that costs extra trips, or no backup, does not hold", () => {
  assert.equal(chargeVerdict(S("yes", "yes", "no"), null)?.level, "timing");
  assert.equal(chargeVerdict(S("yes", "no", "yes"), null)?.level, "backup");
});

test("charging check: only main yes, backup yes and standing time yes holds, and it says it does not change the francs", () => {
  const v = chargeVerdict(S("yes", "yes", "yes"), null);
  assert.equal(v?.level, "holds");
  assert.match(v!.text, /does not change the francs/);
  for (const main of ["no", "maybe"]) for (const b of ["yes", "no"]) for (const st of ["yes", "no"]) assert.notEqual(chargeVerdict(S(main, b, st), null)?.level, "holds");
});

test("charging check: unknown values are dropped", () => {
  assert.deepEqual(cleanSetup({ main: "yes", backup: "<x>", standing: 3 }), { main: "yes", backup: null, standing: null });
  assert.deepEqual(cleanSetup(null), NO_SETUP);
});

test("charging check: the cost per 100 km is plain arithmetic, fees included", () => {
  assert.equal(costPer100(18, 0.5), 9);
  assert.equal(costPer100(18, 0.35), 6.3);
  assert.equal(costPer100(18, 0.85), 15.3);
  assert.equal(costPer100(18, 0.5, 2, 20), 10.8);
  assert.equal(costPer100(0, 0.5), 0);
  assert.equal(EXAMPLE_TARIFFS.length, 4);
});
