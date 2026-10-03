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
  const sql = readFileSync(new URL("../../../migrations/0027_bev_dataset_v2026_10_03e.sql", import.meta.url), "utf8");
  assert.ok(sql.includes(`'${SEED_VERSION}'`));
  for (const r of seedRows()) assert.ok(sql.includes(`'${r.key}', ${r.value},`), `seed migration is stale for ${r.key}: run scripts/gen-dataset-seed.mjs`);
});

test("the Google Sheet template is the current dataset: regenerate it with scripts/gen-dataset-csv.mjs", async () => {
  const { csv } = await import("../../../scripts/gen-dataset-csv.mjs");
  assert.equal(readFileSync(new URL("../../../n8n/sheet/bev-dataset-template.csv", import.meta.url), "utf8"), csv());
  assert.match(csv(), /rate\.travelCard,4095,CHF\/year,sourced,/);
});

test("no figure that a dataset row owns is typed again into a sentence in model.ts", () => {
  const model = readFileSync(new URL("./model.ts", import.meta.url), "utf8");
  // the litre prices, the home price and the travel card live in rows; their sentences come from the row notes
  for (const literal of ["2.14 for petrol", "23 entries", "26.5 rappen", "4,095", "3,995"]) assert.ok(!model.includes(literal), `model.ts repeats ${literal}`);
  assert.match(model, /dataNote\("pump\.petrol"\)/);
  assert.match(model, /dataNote\("rate\.home"\)/);
});

test("applying the seed also loads each row's wording, and the page text follows it", async () => {
  const { DATA_NOTES, evaluate, EMPTY, suggestToggles } = await import("./model.ts");
  applyDataset(seedRows());
  assert.match(DATA_NOTES["pump.petrol"] ?? "", /TCS/);
  applyDataset([{ key: "pump.petrol", value: 1.9, note: "Test note for the litre price." }]);
  const a = { ...EMPTY, barrier: "cost", fuel: "petrol", carClass: "compact", km: "mid", parking: "own" } as never;
  const r = evaluate(a, suggestToggles(a));
  const fuel = r.parts.find((p) => p.label.startsWith("Fuel"))!;
  assert.match(fuel.how, /Test note for the litre price\./);
  applyDataset(seedRows());
});
