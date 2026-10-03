import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluate, SAMPLE, suggestToggles, PUMP, RATES, SPECS } from "./model.ts";
import { applyDataset, seedRows, SEED_VERSION } from "./dataset.ts";

const before = () => {
  const r = evaluate(SAMPLE, suggestToggles(SAMPLE));
  return [r.annualKeep, r.annualSwap, r.cash];
};

test("seed covers every number in RATES, SPECS and PUMP, once", () => {
  const rows = seedRows();
  const keys = rows.map((r) => r.key);
  assert.equal(new Set(keys).size, keys.length);
  const expected = Object.keys(RATES).length + Object.keys(PUMP).length + Object.values(SPECS).reduce((n, s) => n + Object.keys(s).length, 0);
  assert.equal(rows.length, expected);
});

test("applying the seed changes no franc", () => {
  const b = before();
  assert.equal(applyDataset(seedRows()), seedRows().length);
  assert.deepEqual(before(), b);
});

test("a sourced row names publisher, date and url; the rest are placeholders", () => {
  for (const r of seedRows()) {
    if (r.status === "placeholder") continue;
    assert.ok(r.publisher && r.published_on && r.source_url, r.key);
  }
  assert.equal(seedRows().find((r) => r.key === "rate.horizon")?.status, "sourced");
});

test("a dataset value moves the francs, bad rows are ignored, then it restores", () => {
  const b = before();
  const pump = PUMP.diesel;
  assert.equal(applyDataset([{ key: "pump.diesel", value: 2.5 }, { key: "pump.nope", value: 1 }, { key: "pump.petrol", value: -1 }, { key: "rate.home", value: Number.NaN }]), 1);
  assert.notDeepEqual(before(), b);
  applyDataset([{ key: "pump.diesel", value: pump }]);
  assert.deepEqual(before(), b);
});

test("the seed migration matches model.ts", () => {
  const sql = readFileSync(new URL("../../../migrations/0024_bev_dataset_v2026_10_03d.sql", import.meta.url), "utf8");
  assert.ok(sql.includes(`'${SEED_VERSION}'`));
  for (const r of seedRows()) assert.ok(sql.includes(`'${r.key}', ${r.value},`), `seed migration is stale for ${r.key}: run scripts/gen-dataset-seed.mjs`);
});
