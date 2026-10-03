import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanLog, cleanReply, deviceAnswer } from "./classifier.ts";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

test("reply from W7: only closed names pass; none becomes 'no barrier'; text-like extras are dropped", () => {
  const ok = cleanReply({ ok: true, barrier: "charging", confidence: 0.9, band: "auto", via: "ai", alt: null, agree: true, rulesBarrier: "charging", parking: "shared", tenure: "rent", lang: "de", injection: false, personal: false, lenBucket: "mid", tokens: 211, spec: "x", words: "I live at Bahnhofstrasse 1" });
  assert.ok("ok" in ok);
  if (!("ok" in ok)) return;
  assert.deepEqual([ok.barrier, ok.band, ok.parking, ok.tenure, ok.meta.hinted], ["charging", "auto", "shared", "rent", true]);
  assert.doesNotMatch(JSON.stringify(ok), /Bahnhof/);
  const none = cleanReply({ ok: true, barrier: "none", band: "auto", via: "ai" });
  assert.ok("ok" in none && none.barrier === null && none.band === "ask");
  for (const bad of [null, {}, { ok: true, barrier: "buy", band: "auto", via: "ai" }, { ok: true, barrier: "cost", band: "sure", via: "ai" }, { ok: true, barrier: "cost", band: "auto", via: "device" }, { ok: false }]) assert.ok("error" in cleanReply(bad), JSON.stringify(bad));
  const junk = cleanReply({ ok: true, barrier: "cost", band: "confirm", via: "rules", parking: "garage", tenure: "squat", alt: "cost" });
  assert.ok("ok" in junk && junk.parking === null && junk.tenure === null && junk.alt === null);
});

test("device answer: read on the phone by the keyword rules; short text is refused; never 'auto'", () => {
  const a = deviceAnswer("I rent a flat and there is no plug in the garage");
  assert.ok("ok" in a);
  if ("ok" in a) assert.deepEqual([a.barrier, a.via, a.band], ["charging", "device", "confirm"]);
  assert.ok("error" in deviceAnswer("hi"));
  const t = deviceAnswer("The weather is nice");
  assert.ok("ok" in t && t.barrier === null && t.band === "ask");
});

test("log line: closed columns only, bad lines refused, and the table takes exactly them", async () => {
  const meta = { spec: "s", via: "device", band: "confirm", label: "cost", rulesLabel: "cost", agree: true, lang: null, lenBucket: "short", injection: false, personal: false, hinted: false, tokens: null };
  const row = cleanLog({ meta, outcome: "yes" });
  assert.ok(row);
  assert.equal(cleanLog({ meta: { ...meta, via: "carrier-pigeon" }, outcome: "yes" }), null);
  assert.equal(cleanLog({ meta, outcome: "maybe" }), null);
  assert.deepEqual(Object.keys(row!).sort(), ["agree", "band", "hinted", "injection", "label", "lang", "lenBucket", "outcome", "personal", "rulesLabel", "spec", "tokens", "via"]);
  const db = new PGlite();
  const dir = new URL("../../../migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter((x) => /^\d{4}_.*\.sql$/.test(x) && !x.startsWith("0001_")).sort()) await db.exec(readFileSync(new URL(f, dir), "utf8"));
  const ins = (r: NonNullable<typeof row>) => db.query(
    "insert into bev_classifier_log (spec, via, band, label, rules_label, agree, outcome, lang, len_bucket, injection, personal, hinted, tokens) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
    [r.spec, r.via, r.band, r.label, r.rulesLabel, r.agree, r.outcome, r.lang, r.lenBucket, r.injection, r.personal, r.hinted, r.tokens]);
  for (let i = 0; i < 4; i++) await ins(row!);
  assert.equal((await db.query("select * from bev_classifier_stats")).rows.length, 0, "a group of four is hidden");
  await ins({ ...row!, outcome: "no" });
  const stats = (await db.query("select suggestions, accepted_pct from bev_classifier_stats")).rows;
  assert.deepEqual(stats, [{ suggestions: 5, accepted_pct: 80 }]);
  const jobs = (await db.query("select id, enabled from bev_jobs order by id")).rows;
  assert.deepEqual((jobs as { enabled: boolean }[]).map((j) => j.enabled), [false, false, false]);
  const rls = (await db.query("select relname from pg_class where relname in ('bev_classifier_log','bev_jobs','bev_job_runs') and relrowsecurity")).rows;
  assert.equal(rls.length, 3);
  await db.close();
});
