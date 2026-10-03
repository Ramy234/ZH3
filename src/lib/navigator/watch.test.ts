import { test } from "node:test";
import assert from "node:assert/strict";
import { WATCH_SEED, watchOverdue } from "./watch.ts";
import { ageDays, olderThanUsual, usualDays } from "./freshness.ts";
import { GAP_CODES } from "./gapcodes.ts";

test("watch: every row says it is not law, names its source and has a link and a next check", () => {
  for (const w of WATCH_SEED) {
    assert.match(w.text, /Not law/);
    assert.ok(w.url.startsWith("https://"), w.id);
    assert.ok(w.source.length > 5 && w.nextCheck >= w.asOf, w.id);
    for (const c of w.codes) assert.ok(c in GAP_CODES, `${w.id} ${c}`);
  }
});

test("watch: no row states a date of entry into force", () => {
  for (const w of WATCH_SEED) assert.ok(!/(in force|enter[s]? into force|takes effect).{0,40}20(2[7-9]|3\d)/i.test(w.text), w.id);
  assert.match(WATCH_SEED[0].text, /No date of entry into force has been published/);
});

test("watch: a row is overdue only after its next-check date", () => {
  const w = WATCH_SEED[0];
  assert.equal(watchOverdue(w, "2026-10-12"), false);
  assert.equal(watchOverdue(w, "2026-10-14"), true);
});

test("freshness: pump prices go stale in weeks, yearly rows in more than a year", () => {
  const now = new Date("2026-10-03T12:00:00Z");
  assert.equal(usualDays("pump.petrol"), 45);
  assert.equal(olderThanUsual("pump.petrol", "2026-09-19", now), false);
  assert.equal(olderThanUsual("pump.petrol", "2026-07-01", now), true);
  assert.equal(olderThanUsual("rate.home", "2026-09-08", now), false);
  assert.equal(olderThanUsual("rate.home", "2025-06-01", now), true);
  assert.equal(ageDays(null, now), null);
  assert.equal(olderThanUsual("rate.home", "not a date", now), false);
});
