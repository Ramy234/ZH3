import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY, SAMPLE, evaluate, suggestToggles, type Answers } from "./model.ts";
import { sensitivity } from "./sensitivity.ts";
import { ACTIONS_SEED, NEUTRAL_PUBLISHERS, OUTCOME_KEYS, cleanOutcomes, featuresOf, rankActions } from "./actions.ts";

const A = (over: Partial<Answers>): Answers => ({ ...EMPTY, ...over });
function ranked(a: Answers) {
  const r = evaluate(a, suggestToggles(a));
  const s = sensitivity(r);
  return rankActions(featuresOf(r), (s?.drivers ?? []).map((d) => ({ id: d.id, label: d.label })));
}

test("actions: ids are unique, minutes are small, every link comes from a neutral publisher", () => {
  const ids = ACTIONS_SEED.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const a of ACTIONS_SEED) {
    assert.ok(a.minutes > 0 && a.minutes <= 20, a.id);
    assert.ok(a.because.length > 5, a.id);
    if (a.link) assert.ok((NEUTRAL_PUBLISHERS as readonly string[]).includes(a.link.publisher), a.id);
    assert.ok(!/renault|designwerk|dealer pool/i.test(JSON.stringify(a)), `${a.id} names a company`);
  }
});

test("actions: a draft or retired action is never shown", () => {
  const r = ranked(A({ ...SAMPLE, barrier: "trust" }));
  assert.ok(ACTIONS_SEED.some((a) => a.status !== "live"));
  assert.ok(r.every((x) => x.action.status === "live"));
  assert.ok(!r.some((x) => x.action.id === "trial-routes"));
});

test("actions: the shared-garage person is told to ask the building, first or near it", () => {
  const r = ranked(A({ ...SAMPLE, parking: "shared", barrier: "charging" }));
  const ids = r.map((x) => x.action.id);
  assert.ok(ids.slice(0, 3).includes("ask-building"));
  assert.match(r[0].because, /^Shown because /);
});

test("actions: a trust barrier puts the weekend test or the battery certificate on top", () => {
  const r = ranked(A({ ...SAMPLE, barrier: "trust", parking: "own" }));
  assert.ok(["weekend-test", "check-battery"].includes(r[0].action.id));
});

test("actions: with a result that says keep, the six-month reminder is offered", () => {
  const a = A({ ...SAMPLE, barrier: "cost", km: "lt10", parking: "own" });
  const r = evaluate(a, suggestToggles(a));
  const f = featuresOf(r);
  const list = rankActions(f, []);
  if (f.ending === "keep") assert.ok(list.some((x) => x.action.id === "keep-valid"));
  else assert.ok(!list.some((x) => x.action.id === "keep-valid"));
});

test("actions: there is always something to offer, and the order is the same every time", () => {
  const a = A({ ...SAMPLE });
  assert.ok(ranked(a).length > 0);
  assert.deepEqual(ranked(a).map((x) => x.action.id), ranked(a).map((x) => x.action.id));
});

test("actions: only closed outcome keys are kept", () => {
  assert.ok(OUTCOME_KEYS.includes("ask-employer.done"));
  assert.ok(!OUTCOME_KEYS.some((k) => k.startsWith("trial-routes")));
  assert.deepEqual(cleanOutcomes(["ask-employer.done", "ask-employer.done", "nope.done", "ask-employer.maybe", 5]), ["ask-employer.done"]);
});

test("actions: the charging set-up check changes the move, and a set-up that holds drops 'settle charging'", () => {
  const a = A({ ...SAMPLE, parking: "none", barrier: "charging", workAccess: "no" });
  const r = evaluate(a, { ...suggestToggles(a), home: false, work: false });
  const ids = (level: string | null) => rankActions(featuresOf(r, level), []).map((x) => x.action.id);
  assert.ok(ids(null).includes("settle-charging"));
  assert.ok(!ids("holds").includes("settle-charging"));
  assert.ok(ids("test").includes("test-charging-week"));
  assert.ok(ids("missing").includes("ask-building"));
});

test("actions: the new ask actions keep to the rules (no company, no car model, neutral links only)", () => {
  for (const id of ["ask-seller", "ask-car-data", "ask-two-for-one-terms", "test-charging-week"]) {
    const a = ACTIONS_SEED.find((x) => x.id === id);
    assert.ok(a && a.status === "live", id);
    assert.ok(!/renault|tesla|byd|zurich|z-volt/i.test(JSON.stringify(a)), `${id} names a brand`);
  }
});
