import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY, SAMPLE, PUMP, evaluate, suggestToggles } from "./model.ts";
import { applyDataset } from "./dataset.ts";
import { cardContent } from "./share-card.ts";
import { monthsLater, revisitIcs } from "./revisit.ts";
import type { Answers } from "./model.ts";

const A = (over: Partial<Answers>): Answers => ({ ...EMPTY, ...over });
const result = (a: Answers) => evaluate(a, suggestToggles(a));

test("card: same title and figures as the page, and nothing about the person", () => {
  const r = result(SAMPLE);
  const c = cardContent(r);
  assert.equal(c.title, r.headline);
  assert.match(c.figures[0].value, /^CHF/);
  const text = JSON.stringify(c);
  assert.doesNotMatch(text, /postcode|canton|@|http/i);
  assert.match(c.foot, /fair ending/);
  assert.match(c.open, /Still open/);
});

test("card: no payback year is said plainly, and an already-electric case has nothing extra at the start", () => {
  // At the 19 Sep 2026 pump price every ordinary case saves something, so this case needs a cheap-fuel year to exist.
  const keep = { petrol: PUMP.petrol, diesel: PUMP.diesel };
  applyDataset([{ key: "pump.petrol", value: 1.2 }, { key: "pump.diesel", value: 1.3 }]);
  try {
    const hybrid = result(A({ barrier: "cost", carClass: "compact", fuel: "hybrid", uses: ["everyday"], km: "gt20", parking: "none" }));
    assert.match(cardContent(hybrid).payback, /does not cost less to run/);
  } finally {
    applyDataset(Object.entries(keep).map(([k, value]) => ({ key: `pump.${k}`, value })));
  }
  const electric = result(A({ barrier: "cost", carClass: "compact", fuel: "electric", uses: ["everyday"], km: "mid", parking: "own" }));
  assert.match(cardContent(electric).figures[1].note, /nothing extra/);
});

test("revisit: six months on, clamped to the end of a short month", () => {
  assert.equal(monthsLater(new Date(Date.UTC(2026, 9, 3)), 6).toISOString().slice(0, 10), "2027-04-03");
  assert.equal(monthsLater(new Date(Date.UTC(2026, 7, 31)), 6).toISOString().slice(0, 10), "2027-02-28");
  assert.equal(monthsLater(new Date(Date.UTC(2026, 10, 30)), 6).toISOString().slice(0, 10), "2027-05-30");
});

test("revisit: a well-formed all-day event with no answers in it", () => {
  const ics = revisitIcs(new Date(Date.UTC(2026, 9, 3, 8, 5, 9)), 6, "https://example.org/");
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
  assert.match(ics, /DTSTART;VALUE=DATE:20270403\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20270404\r\n/);
  assert.match(ics, /DTSTAMP:20261003T080509Z\r\n/);
  assert.match(ics, /URL:https:\/\/example\.org\/\r\n/);
  assert.equal(ics.split("\r\n").every((l) => l.length <= 200), true);
  assert.doesNotMatch(ics, /CHF|barrier|postcode/i);
  assert.equal(revisitIcs(new Date(), 6, null).includes("URL:"), false);
});
