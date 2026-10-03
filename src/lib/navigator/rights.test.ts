import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, suggestToggles, SAMPLE } from "./model.ts";
import { exploreMore, rightsFor } from "./rights.ts";

const base = () => evaluate(SAMPLE, suggestToggles(SAMPLE), null, "ZH");

test("rights: the tax row follows the canton and says it is not a tax bill", () => {
  const r = base();
  const set = rightsFor({ canton: "ZH", tenure: null, postcodeSet: false, result: r }).find((x) => x.id === "tax")!;
  assert.match(set.text, /not a tax bill|not your registration/);
  const unset = rightsFor({ canton: null, tenure: null, postcodeSet: false, result: evaluate(SAMPLE, suggestToggles(SAMPLE), null, null) }).find((x) => x.id === "tax")!;
  assert.match(unset.text, /Pick one/);
});

test("rights: renter and owner rows appear only for the chosen tenure", () => {
  const r = base();
  const ids = (t: "own" | "rent" | null) => rightsFor({ canton: null, tenure: t, postcodeSet: false, result: r }).map((x) => x.id);
  assert.ok(ids("rent").includes("tenant") && !ids("rent").includes("owner") && !ids("rent").includes("solar"));
  assert.ok(ids("own").includes("owner") && ids("own").includes("solar") && !ids("own").includes("tenant"));
  assert.ok(!ids(null).includes("tenant") && !ids(null).includes("solar"));
});

test("rights: no franc amount from a grant, and the draft is never called law", () => {
  const r = base();
  for (const t of ["own", "rent", null] as const) {
    for (const row of rightsFor({ canton: "ZH", tenure: t, postcodeSet: true, result: r })) {
      if (row.id !== "tax") assert.doesNotMatch(row.text, /CHF\s?\d|\d\s?francs/, row.id);
    }
  }
  const tenant = rightsFor({ canton: null, tenure: "rent", postcodeSet: false, result: r }).find((x) => x.id === "tenant")!;
  assert.match(tenant.text, /not law/i);
});

test("rights: explore-more shows both situations until one is chosen", () => {
  assert.deepEqual(exploreMore(null).map((g) => g.id), ["own", "rent", "all"]);
  assert.deepEqual(exploreMore("own").map((g) => g.id), ["own", "all"]);
  assert.deepEqual(exploreMore("rent").map((g) => g.id), ["rent", "all"]);
});
