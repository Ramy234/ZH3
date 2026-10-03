// The rule: nothing the page states as a fact or a figure is without a named source, a date and (when it is a public page) a link.
// This walks every list in the code that holds such statements. A new entry that skips its source fails here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FACTS, FACT_VIEW } from "./facts.ts";
import { SOURCES } from "./model.ts";
import { seedRows } from "./dataset.ts";
import { WATCH_SEED } from "./watch.ts";
import { RIGHTS_LINKS } from "./rights.ts";
import { ACTIONS_SEED } from "./actions.ts";
import { NOT_DRIVING } from "./not-driving.ts";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Statements that are open about not being a sourced fact. Everything else must have a link. */
const NOT_A_FACT = ["concept", "unverified", "assumption", "stance"];
/** Known holes, each with its reason. The test fails if one is fixed (remove it here) or if a new one appears. */
const KNOWN_GAPS: Record<string, string> = {
  winter: "The gfs.bern Mobility Monitor PDF sits on a mailing host (mailing-ircockpit.eqs.com) and was not confirmed as a stable public address.",
};

test("every fact sheet names where it comes from, with a date, and a link unless it is a project idea", () => {
  for (const [key, f] of Object.entries(FACTS)) {
    assert.ok(f.source.length > 40, `${key}: source`);
    assert.match(f.as_of, DATE, `${key}: as_of`);
    if (!NOT_A_FACT.includes(f.status) && !(key in KNOWN_GAPS)) assert.ok(f.url, `${key}: a dated sheet needs a link`);
    if (f.url) assert.match(f.url, /^https:\/\//);
  }
  for (const key of Object.keys(FACTS)) assert.ok(FACT_VIEW[key as keyof typeof FACT_VIEW], `${key}: view`);
});

test("every sheet that shows a figure or compares says what the figure is and where it is from", () => {
  for (const [key, v] of Object.entries(FACT_VIEW)) {
    if (v.figure) assert.ok(v.figure.caption.length > 60, `${key}: the figure needs a caption that says what it is`);
    if ((v.figure || v.compare) && !(key in KNOWN_GAPS)) assert.ok((v.links ?? []).length > 0 || FACTS[key as keyof typeof FACTS].url, `${key}: a figure needs a link`);
    for (const l of v.links ?? []) assert.ok(l.note.length > 20, `${key}: link ${l.name} needs a note that says what it is`);
  }
});

test("every federal-source card has a publisher, a date and a link, and says what it is not", () => {
  for (const [key, s] of Object.entries(SOURCES)) {
    assert.ok(s.publisher && s.published && s.url.startsWith("https://"), key);
    assert.ok(s.supports.length > 20 && s.notThis.length > 20, key);
  }
});

test("the dataset: a number is either labelled a placeholder or carries publisher, date and link", () => {
  for (const r of seedRows()) {
    assert.ok(["placeholder", "sourced", "official", "live"].includes(r.status), r.key);
    if (r.status === "placeholder") continue;
    assert.ok(r.publisher && r.published_on && r.source_url, `${r.key}: ${r.status} needs publisher, date and link`);
    assert.match(String(r.published_on), DATE);
  }
  const sourced = seedRows().filter((r) => r.status !== "placeholder").map((r) => r.key);
  for (const k of ["rate.home", "rate.horizon", "rate.travelCard", "pump.petrol", "pump.diesel"]) assert.ok(sourced.includes(k), `${k} should be sourced`);
});

test("rules still being decided, rights links and next-move links each carry a source, a date and a public host", () => {
  for (const w of WATCH_SEED) {
    assert.ok(w.source && w.url.startsWith("https://") && DATE.test(w.asOf) && DATE.test(w.nextCheck), w.id);
  }
  for (const [k, l] of Object.entries(RIGHTS_LINKS)) assert.ok(l.note.length > 15 && l.href.startsWith("https://"), k);
  for (const a of ACTIONS_SEED) if (a.link && a.status === "live") assert.ok(a.link.publisher && a.link.href.startsWith("https://"), a.id);
  for (const l of [...NOT_DRIVING.neutral, ...NOT_DRIVING.providers]) assert.ok(l.note.length > 20, l.name);
});

test("the known gaps are still gaps (fix the entry, then delete it from KNOWN_GAPS)", () => {
  for (const key of Object.keys(KNOWN_GAPS)) {
    const f = FACTS[key as keyof typeof FACTS];
    const v = FACT_VIEW[key as keyof typeof FACT_VIEW];
    assert.ok(!f.url && !(v.links ?? []).length, `${key} now has a link: remove it from KNOWN_GAPS`);
  }
});
