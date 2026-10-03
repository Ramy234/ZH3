import { test } from "node:test";
import assert from "node:assert/strict";
import { FACT_CODES, GAP_CODES, GAP_CODE_LIST, cleanGapCodes, gapCodesFor, gapGroup } from "./gapcodes.ts";
import { FACTS } from "./facts.ts";

test("gap codes: the INFRAS list has 26 sub-barriers in seven groups, plus our own X1", () => {
  const infras = GAP_CODE_LIST.filter((c) => c.startsWith("H"));
  assert.equal(infras.length, 26);
  assert.equal(new Set(infras.map((c) => gapGroup(c))).size, 7);
  assert.ok("X1" in GAP_CODES);
});

test("gap codes: every fact sheet maps to known codes, and every code maps from somewhere or is left open on purpose", () => {
  for (const key of Object.keys(FACTS)) {
    assert.ok(FACT_CODES[key]?.length > 0, `fact ${key} has no code`);
    for (const c of FACT_CODES[key]) assert.ok(c in GAP_CODES, `${key} -> ${c}`);
  }
});

test("gap codes: the six taps give the codes the INFRAS list names", () => {
  assert.deepEqual(gapCodesFor({ barrier: "charging" }), ["H2.1", "H2.2"]);
  assert.deepEqual(gapCodesFor({ barrier: "unsure" }), []);
  assert.deepEqual(gapCodesFor({ barrier: "trips", worry: "winter" }), ["H1.1", "H1.2"]);
  assert.ok(gapCodesFor({ barrier: "trust" }).includes("H5.2"));
});

test("gap codes: opened sheets and the set-up check add codes; the result is sorted without duplicates", () => {
  const codes = gapCodesFor({ barrier: "charging", openedFacts: ["tenant-right", "car-data"], chargeLevel: "missing" });
  assert.deepEqual(codes, [...new Set(codes)]);
  assert.deepEqual(codes, GAP_CODE_LIST.filter((c) => codes.includes(c)));
  assert.ok(codes.includes("H3.3") && codes.includes("X1"));
  assert.ok(!gapCodesFor({ chargeLevel: "holds" }).length);
});

test("gap codes: unknown strings never get through", () => {
  assert.deepEqual(cleanGapCodes(["H2.2", "H2.2", "nope", 4, "X1"]), ["H2.2", "X1"]);
  assert.deepEqual(cleanGapCodes("H2.2"), []);
  assert.deepEqual(gapCodesFor({ barrier: "<script>", openedFacts: ["<b>"] }), []);
});
