import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { seedRows } from "../src/lib/navigator/dataset.ts";
import { CURRENT_SQL, INSERT_SQL } from "../n8n/build-w2.mjs";

const code = readFileSync(new URL("../n8n/src/w2-validate.js", import.meta.url), "utf8");
const run = (sheet, current) => {
  const $ = (name) => ({ all: () => (name === "Read sheet" ? sheet : current).map((json) => ({ json })) });
  return new Function("$", `return (function(){${code}})()`)($)[0].json;
};
const current = seedRows().map((r) => ({ ...r }));
const asSheet = (rows) => rows.map((r) => ({ ...r, value: String(r.value) }));

test("W2: the unchanged seed validates and publishes nothing", () => {
  const out = run(asSheet(current), current);
  assert.deepEqual(out.errors, []);
  assert.equal(out.ok, true);
  assert.equal(out.changes, 0);
});

test("W2: a sourced edit is a change; a sourced row without a source is refused", () => {
  const sheet = asSheet(current);
  const row = sheet.find((r) => r.key === "pump.diesel");
  Object.assign(row, { value: "1.98", status: "sourced", publisher: "BFS", published_on: "01.10.2026", source_url: "https://www.bfs.admin.ch/" });
  const ok = run(sheet, current);
  assert.equal(ok.ok, true);
  assert.equal(ok.changes, 1);
  assert.equal(ok.rows.find((r) => r.key === "pump.diesel").published_on, "2026-10-01");
  row.source_url = "";
  const bad = run(sheet, current);
  assert.equal(bad.ok, false);
  assert.match(bad.errors.join("\n"), /needs publisher, published_on and source_url/);
});

test("W2: bad values, unknown, duplicate and missing keys are refused", () => {
  const sheet = asSheet(current);
  sheet.find((r) => r.key === "rate.home").value = "abc";
  sheet.push({ key: "rate.invented", value: "1", unit: "x", status: "placeholder" });
  sheet.push({ ...sheet[3] });
  const out = run(sheet.filter((r) => r.key !== "pump.petrol"), current);
  assert.equal(out.ok, false);
  const e = out.errors.join("\n");
  assert.match(e, /value must be a number/);
  assert.match(e, /unknown key "rate.invented"/);
  assert.match(e, /duplicate key/);
  assert.match(e, /missing key "pump.petrol"/);
});

test("W2: a 3x jump is a warning, not a block", () => {
  const sheet = asSheet(current);
  sheet.find((r) => r.key === "rate.wallbox").value = "9000";
  const out = run(sheet, current);
  assert.equal(out.ok, true);
  assert.match(out.warnings.join("\n"), /rate.wallbox/);
});

test("W2: the migrations and both SQL statements work, and a version is insert-only", async () => {
  const db = new PGlite();
  for (const f of ["0009_bev_dataset.sql", "0010_bev_dataset_seed.sql", "0011_bev_dataset_test.sql"]) {
    await db.exec(readFileSync(new URL(`../migrations/${f}`, import.meta.url), "utf8"));
  }
  // test table: current is empty, then a first version goes in through the real insert statement
  assert.equal((await db.query(CURRENT_SQL)).rows.length, 0);
  const v = run(asSheet(current), []);
  await db.query(INSERT_SQL, [v.version, JSON.stringify(v.rows)]);
  const back = (await db.query(CURRENT_SQL)).rows;
  assert.equal(back.length, current.length);
  assert.equal(back.find((r) => r.key === "rate.horizon").published_on, "2023-03-23");
  await assert.rejects(db.query("update bev_dataset_test set value = 1"), /insert-only/);
  await assert.rejects(db.query("delete from bev_dataset"), /insert-only/);
});
