#!/usr/bin/env node
// Smoke test of the Jev classifier against the fixed sentences in n8n/eval. Nothing is stored; the report holds counts only.
//
//   node scripts/jev-smoke.mjs --dry            show the exact request that would leave this computer, send nothing
//   node scripts/jev-smoke.mjs --rules          the keyword rules only (no key, no network)
//   JEV_API_KEY=... node scripts/jev-smoke.mjs  the whole pipeline with real Jev calls (one call per sentence)
//   node scripts/jev-smoke.mjs --url <webhook>  the deployed n8n workflow W7 instead of calling Jev directly
//
// The sentences are written by the project team, not collected from people. They contain invented names and numbers
// on purpose, so that the "personal" and "injection" questions have something to find. Do not add real sentences.
import { readFileSync, writeFileSync } from "node:fs";
import { prepare, decide, callJev, SPEC } from "../n8n/lib/w7-pipeline.mjs";

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const GERMAN = /\b(ich|und|der|die|das|mein|nicht|wo|laden|miete|wohn|zu teuer|ferien|reichweite|kosten|preis|auto)\b|ä|ö|ü|ß/i;
const base = read("n8n/eval/words-eval.json").items.map((i) => ({ ...i, lang: GERMAN.test(i.text) ? "de" : "en" }));
export const ITEMS = [...base, ...read("n8n/eval/words-eval-extra.json").items];

const arg = (n) => process.argv.includes(n);
const val = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : null; };

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)} %` : "-");
const BANDS = ["auto", "confirm", "ask"];

export function summarise(rows) {
  const out = { n: rows.length };
  const ok = (r) => r.got.barrier === r.item.label;
  out.final = rows.filter(ok).length;
  out.rules = rows.filter((r) => r.rules === r.item.label).length;
  out.ai = rows.filter((r) => r.got.via === "ai").length;
  out.byBand = Object.fromEntries(BANDS.map((b) => {
    const x = rows.filter((r) => r.got.band === b);
    return [b, { n: x.length, right: x.filter(ok).length }];
  }));
  const langs = [...new Set(rows.map((r) => r.item.lang))];
  out.byLang = Object.fromEntries(langs.map((l) => {
    const x = rows.filter((r) => r.item.lang === l);
    return [l, { n: x.length, right: x.filter(ok).length, rulesRight: x.filter((r) => r.rules === r.item.label).length }];
  }));
  const inj = rows.filter((r) => r.item.tags?.includes("injection"));
  out.injection = { n: inj.length, flagged: inj.filter((r) => r.got.injection).length, followed: inj.filter((r) => !r.got.injection && r.got.via === "ai" && r.item.label !== r.got.barrier).length };
  const per = rows.filter((r) => r.item.tags?.includes("personal"));
  out.personal = { n: per.length, flagged: per.filter((r) => r.got.personal).length };
  const withPark = rows.filter((r) => r.item.parking);
  out.parking = { n: withPark.length, right: withPark.filter((r) => r.got.parking === r.item.parking).length, wrong: withPark.filter((r) => r.got.parking && r.got.parking !== r.item.parking).length };
  const withTen = rows.filter((r) => r.item.tenure);
  out.tenure = { n: withTen.length, right: withTen.filter((r) => r.got.tenure === r.item.tenure).length, wrong: withTen.filter((r) => r.got.tenure && r.got.tenure !== r.item.tenure).length };
  const noPark = rows.filter((r) => !r.item.parking && r.got.parking);
  out.invented = { parking: noPark.length, tenure: rows.filter((r) => !r.item.tenure && r.got.tenure).length };
  out.tokens = rows.reduce((s, r) => s + (r.got.tokens ?? 0), 0);
  const ms = rows.map((r) => r.ms).filter(Number.isFinite).sort((a, b) => a - b);
  out.latency = ms.length ? { p50: ms[Math.floor(ms.length * 0.5)], p95: ms[Math.min(ms.length - 1, Math.floor(ms.length * 0.95))] } : null;
  return out;
}

function print(s, mode) {
  console.log(`\n${mode} on ${s.n} sentences (spec ${SPEC.version})`);
  console.log(`  concern right (final answer):   ${s.final} of ${s.n}  ${pct(s.final, s.n)}`);
  console.log(`  concern right (keyword rules):  ${s.rules} of ${s.n}  ${pct(s.rules, s.n)}`);
  console.log(`  answered by the model:          ${s.ai} of ${s.n}`);
  for (const b of BANDS) console.log(`  band ${b.padEnd(8)}                 ${String(s.byBand[b].n).padStart(2)} sentences, ${pct(s.byBand[b].right, s.byBand[b].n)} right`);
  for (const [l, v] of Object.entries(s.byLang)) console.log(`  language ${l}: final ${pct(v.right, v.n)}, rules ${pct(v.rulesRight, v.n)} (${v.n})`);
  console.log(`  injection attempts: ${s.injection.n}, flagged ${s.injection.flagged}, answer followed the instruction ${s.injection.followed}`);
  console.log(`  personal details:   ${s.personal.n}, flagged ${s.personal.flagged}`);
  console.log(`  parking said:       ${s.parking.n}, right ${s.parking.right}, wrong ${s.parking.wrong}`);
  console.log(`  tenure said:        ${s.tenure.n}, right ${s.tenure.right}, wrong ${s.tenure.wrong}`);
  console.log(`  invented from nothing: parking ${s.invented.parking}, tenure ${s.invented.tenure}`);
  if (s.tokens) console.log(`  input tokens in total: ${s.tokens}`);
  if (s.latency) console.log(`  latency: median ${s.latency.p50} ms, slowest 5 % ${s.latency.p95} ms`);
}

async function main() {
  const limit = Number(val("--limit")) || ITEMS.length;
  const items = ITEMS.slice(0, limit);
  if (arg("--dry")) {
    const p = prepare(items[0].text);
    console.log("Nothing is sent. This is the exact body of one call, for the first sentence:\n");
    console.log(JSON.stringify(p.built[0].request, null, 2));
    console.log(`\nIt goes to https://api.typesafe.ai/v1/systemone with an Authorization header you supply. ${items.length} sentences would mean ${items.length} calls.`);
    return;
  }
  const key = process.env.JEV_API_KEY;
  const url = val("--url");
  const mode = arg("--rules") ? "Rules only" : url ? "Workflow W7" : "Jev";
  if (mode === "Jev" && !key) {
    console.error("JEV_API_KEY is not set. Run it as:  JEV_API_KEY=your-key node scripts/jev-smoke.mjs\n(or use --rules, --dry or --url). The key is read from the terminal and never written anywhere.");
    process.exit(2);
  }
  const rows = [];
  const errors = {};
  for (const item of items) {
    const p = prepare(item.text);
    const rules = p.ruled[0].rules.barrier;
    let got;
    let ms = null;
    try {
      if (mode === "Rules only") got = decide(p, null);
      else if (url) {
        const t0 = Date.now();
        const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ words: item.text }) });
        ms = Date.now() - t0;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        got = await res.json();
      } else {
        const r = await callJev(p.built[0].request, key);
        ms = r.ms;
        got = decide(p, r.body);
      }
    } catch (e) {
      errors[e.message] = (errors[e.message] ?? 0) + 1;
      got = decide(p, null);
    }
    rows.push({ item, rules, got, ms });
  }
  const s = summarise(rows);
  print(s, mode);
  if (Object.keys(errors).length) console.log(`  calls that failed and fell back to the rules: ${JSON.stringify(errors)}`);
  console.log("\nMissed (wanted -> got, band, how):");
  for (const r of rows.filter((x) => x.got.barrier !== x.item.label)) console.log(`  ${r.item.label} -> ${r.got.barrier} (${r.got.band}, ${r.got.via}, ${r.got.confidence})  #${ITEMS.indexOf(r.item)}`);
  const file = new URL(`../n8n/eval/last-smoke-${mode.toLowerCase().replace(/\W+/g, "-")}.json`, import.meta.url);
  writeFileSync(file, JSON.stringify({ mode, spec: SPEC.version, summary: s, rows: rows.map((r) => ({ id: ITEMS.indexOf(r.item), label: r.item.label, got: r.got.barrier, band: r.got.band, via: r.got.via, conf: r.got.confidence })) }, null, 1));
  console.log(`\nCounts and sentence numbers (no text) saved in ${file.pathname.split("/").slice(-2).join("/")}`);
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
