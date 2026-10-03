import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIONS_SEED, NEUTRAL_PUBLISHERS } from "./actions.ts";
import { FACT_VIEW, FACTS } from "./facts.ts";
import { WATCH_SEED } from "./watch.ts";
import { RIGHTS_LINKS } from "./rights.ts";

// Every outside link the page can show, with where it sits.
type L = { where: string; href: string; note: string };
function allLinks(): L[] {
  const out: L[] = [];
  for (const a of ACTIONS_SEED) if (a.link && a.status === "live") out.push({ where: `action ${a.id}`, href: a.link.href, note: a.link.publisher });
  for (const [k, v] of Object.entries(FACT_VIEW)) {
    for (const l of v.links ?? []) out.push({ where: `fact ${k}`, href: l.href, note: l.note });
    for (const line of v.lines) if (line.link) out.push({ where: `fact ${k} line`, href: line.link.href, note: "" });
  }
  for (const [k, f] of Object.entries(FACTS)) if (f.url) out.push({ where: `fact ${k} source`, href: f.url, note: "" });
  for (const [k, l] of Object.entries(RIGHTS_LINKS)) out.push({ where: `rights ${k}`, href: l.href, note: l.note });
  for (const w of WATCH_SEED) out.push({ where: `watch ${w.id}`, href: w.url, note: "" });
  return out;
}

const HOSTS = [
  "energieschweiz.ch", "tcs.ch", "admin.ch", "elcom.admin.ch", "energiefranken.ch", "iea.org", "bnef.com", "srf.ch", "mozillafoundation.org", "carscoops.com",
  "cnil.fr", "ethique.gouv.qc.ca", "designwerk.com", "mobility.ch", "electrive.com", "zurich.ch", "swiss-emobility.ch", "bfe.admin.ch", "zh.ch", "lu.ch",
];
/** A company, not a public body or a test. Its link may only appear when the note says what it is. */
const COMPANY = ["designwerk.com", "mobility.ch", "zurich.ch", "electrive.com", "bnef.com", "carscoops.com"];

test("links: every link is https and from a host we have looked at", () => {
  for (const l of allLinks()) {
    const u = new URL(l.href);
    assert.equal(u.protocol, "https:", `${l.where} ${l.href}`);
    assert.ok(HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`)), `${l.where}: ${u.hostname} is not on the list`);
  }
});

test("links: a company link says what it is, in the sheet that shows it", () => {
  for (const l of allLinks()) {
    const host = new URL(l.href).hostname;
    if (!COMPANY.some((h) => host === h || host.endsWith(`.${h}`)) || l.note === "") continue;
    assert.match(l.note, /provider|manufacturer|maker|example|analyst firm|sells|press release|reported|Aviloo/i, `${l.where} ${host}: the note must say what this is`);
  }
});

test("links: a provider is never the next move and never a neutral publisher", () => {
  for (const a of ACTIONS_SEED) {
    if (!a.link) continue;
    assert.ok((NEUTRAL_PUBLISHERS as readonly string[]).includes(a.link.publisher));
    assert.ok(!COMPANY.some((h) => new URL(a.link!.href).hostname.endsWith(h)), `${a.id} links a company`);
  }
});

test("links: Z-Volt is listed as an insurer's own service, among neutral tools, with no figure from its price list", () => {
  const z = Object.values(FACT_VIEW).flatMap((v) => v.links ?? []).find((l) => /zurich\.ch/.test(l.href));
  assert.ok(z, "Z-Volt link present");
  assert.match(z!.name, /Zurich Insurance/);
  assert.match(z!.note, /not a neutral source/);
  assert.doesNotMatch(z!.note, /CHF|0\.\d\d/);
  const view = FACT_VIEW["public-tariff"];
  assert.ok(view.links!.findIndex((l) => /zurich\.ch/.test(l.href)) > 0, "never listed first");
});
