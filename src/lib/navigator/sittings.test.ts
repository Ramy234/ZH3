import { test } from "node:test";
import assert from "node:assert/strict";
import { keyMatches, sittingsReport, MIN_CELL, PUBLIC_MIN_CELL, type FlatRow } from "./sittings.ts";
import { band, cleanPostcode, BANDS } from "./bands.ts";
import { cleanActions, cleanCohort } from "./telemetry.ts";

const row = (over: Partial<FlatRow> = {}): FlatRow => ({ cohort: "i1", stage: "final", from_sample: false, ending: "keep_or_later", barrier: "charging", unclear: null, actions: ["share"], ...over });
const many = (n: number, over: Partial<FlatRow> = {}) => Array.from({ length: n }, () => row(over));

test("sittings: a sitting under 5 shows nothing but its code", () => {
  const r = sittingsReport(many(4));
  assert.equal(r.sittings[0].finished, null);
  assert.equal(r.hidden, 1);
  assert.equal(r.sittings[0].barriers.length, 0);
});

test("sittings: counts per code, samples and mid-way sessions left out, flags are plain sentences", () => {
  const rows = [...many(6, { unclear: "payback", actions: ["share", "share", "fold_why"] }), ...many(3, { ending: "covered_within_8" }), row({ from_sample: true }), row({ stage: "mid" }), ...many(2, { cohort: null }), ...many(5, { cohort: "j2" })];
  const r = sittingsReport(rows);
  const i1 = r.sittings.find((s) => s.code === "i1")!;
  assert.equal(i1.finished, 9);
  assert.equal(i1.keep, 6);
  assert.equal(i1.actions.find((a) => a.key === "share")?.n, 9);
  assert.equal(i1.actions.find((a) => a.key === "fold_why")?.n, 6);
  assert.equal(i1.unclear[0].key, "payback");
  assert.equal(r.withoutCode, 2);
  assert.equal(r.sittings.length, 2);
  assert.ok(i1.flags.every((f) => typeof f === "string" && f.length > 5));
});

test("sittings: a short code list is closed, and the key check fails closed", () => {
  assert.equal(cleanCohort(" I3 "), "i3");
  assert.equal(cleanCohort("class 3b"), null);
  assert.equal(cleanCohort("ab123"), null);
  assert.deepEqual(cleanActions(["share", "share", "buy_now", 5, "picture"]), ["share", "picture"]);
  assert.equal(keyMatches("abc", undefined), false);
  assert.equal(keyMatches("abc", ""), false);
  assert.equal(keyMatches("abd", "abc"), false);
  assert.equal(keyMatches("abc", "abc"), true);
});

test("tightening: public cells are at least ten and never below the internal one", () => {
  assert.ok(PUBLIC_MIN_CELL >= 10);
  assert.ok(PUBLIC_MIN_CELL >= MIN_CELL);
});

test("tightening: prices are banded so an exact figure is not stored", () => {
  assert.equal(band(38450, BANDS.price), 37500);
  assert.equal(band(39000, BANDS.price), 40000);
  assert.equal(band(1234, BANDS.quote), 1000);
  assert.equal(band(Number.NaN, BANDS.price), 0);
});

test("tightening: only a four-digit postcode is kept", () => {
  assert.equal(cleanPostcode("8001"), "8001");
  assert.equal(cleanPostcode("0801"), null);
  assert.equal(cleanPostcode("80010"), null);
  assert.equal(cleanPostcode("Bahnhofstr. 1"), null);
  assert.equal(cleanPostcode(8001), null);
});
