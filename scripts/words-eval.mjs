#!/usr/bin/env node
// Scores the W6 classifier on the fixed set in n8n/eval/words-eval.json.
//   node scripts/words-eval.mjs                 the keyword rules (the code that runs inside W6)
//   node scripts/words-eval.mjs --url <webhook> the whole workflow (rules, or AI when its flag is on)
// Prints accuracy, accuracy among answers at confidence 0.6 or more, and a confusion list. Nothing is stored.
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const { note, items } = JSON.parse(read("n8n/eval/words-eval.json"));

function rulesAnswer(words) {
  const $input = { first: () => ({ json: { words } }) };
  const [{ json }] = new Function("$input", `return (function(){${read("n8n/src/w6-rules.js")}})()`)($input);
  return { ...json.rules, via: "rules" };
}
async function urlAnswer(url, words) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ words }) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function evaluate(answer) {
  const rows = [];
  for (const it of items) rows.push({ ...it, got: await answer(it.text) });
  const right = rows.filter((r) => r.got.barrier === r.label);
  const sure = rows.filter((r) => r.got.confidence >= 0.6);
  const sureRight = sure.filter((r) => r.got.barrier === r.label);
  const wrong = rows.filter((r) => r.got.barrier !== r.label);
  return { rows, accuracy: right.length / rows.length, sure: sure.length, sureAccuracy: sure.length ? sureRight.length / sure.length : null, wrong };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf("--url");
  const url = i > -1 ? process.argv[i + 1] : null;
  const r = await evaluate(url ? (w) => urlAnswer(url, w) : async (w) => rulesAnswer(w));
  console.log(note, "\n");
  console.log(`${url ? "Workflow" : "Rules"} on ${r.rows.length} sentences`);
  console.log(`  correct overall:                 ${(100 * r.accuracy).toFixed(0)} %`);
  console.log(`  answered at confidence >= 0.6:   ${r.sure} of ${r.rows.length}, ${r.sureAccuracy == null ? "-" : (100 * r.sureAccuracy).toFixed(0) + " %"} correct`);
  const via = {};
  for (const x of r.rows) via[x.got.via] = (via[x.got.via] ?? 0) + 1;
  console.log(`  answered by:                     ${JSON.stringify(via)}`);
  console.log("\nMissed (wanted -> got):");
  for (const x of r.wrong) console.log(`  ${x.label} -> ${x.got.barrier} (${x.got.confidence})  "${x.text}"`);
}
