// Tests for the n8n workflow files W1, W3, W4, W5 and the SQL they rely on (migrations 0012 and 0013).
// The Code nodes run here exactly as written in n8n/src; the SQL runs in PGlite.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { ENUMS, CANTONS } from "../n8n/lib/enums.mjs";
import { wf as w1, INSERT_SQL as W1_INSERT } from "../n8n/build-w1.mjs";
import { wf as w3, INSERT_SQL as W3_INSERT } from "../n8n/build-w3.mjs";
import { wf as w4, URLS_SQL, PREVIOUS_SQL, INSERT_SQL as W4_INSERT } from "../n8n/build-w4.mjs";
import { wf as w5 } from "../n8n/build-w5.mjs";
import { wf as w6 } from "../n8n/build-w6.mjs";
import { wf as w7 } from "../n8n/build-w7.mjs";
import { wf as w8 } from "../n8n/build-w8.mjs";
import { evaluate as evalWords } from "./words-eval.mjs";
import { DIGEST_SQL } from "../n8n/lib/w5-sql.mjs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const src = (n) => read(`n8n/src/${n}`);

// Runs a Code node. refs: { "Node name": [json, ...] } answers $('Node name').all() and .first().
function run(source, input = [{}], refs = {}) {
  const wrap = (arr) => ({ all: () => arr.map((json) => ({ json })), first: () => ({ json: arr[0] }) });
  const $input = wrap(input);
  const $ = (name) => {
    if (!(name in refs)) throw new Error(`no reference to ${name}`);
    return wrap(refs[name]);
  };
  return new Function("$input", "$", `return (function(){${source}})()`)($input, $).map((i) => i.json);
}

const MIGRATIONS = readdirSync(new URL("../migrations/", import.meta.url)).filter((f) => f.endsWith(".sql")).sort();
async function database() {
  const db = new PGlite();
  for (const f of MIGRATIONS) await db.exec(read(`migrations/${f}`));
  await db.exec("create table bev_sessions_test (like bev_sessions including all)");
  return db;
}

test("closed lists: the app's types, W1's whitelist and the shared list agree", () => {
  const one = src("w1-typesafe-choice.js").match(/const ONE_OF = (\{[\s\S]*?\n\});/)[1];
  const inNode = new Function(`return ${one}`)();
  assert.deepEqual(inNode, ENUMS);
  const model = read("src/lib/navigator/model.ts");
  const union = (name) => [...model.match(new RegExp(`export type ${name} =([^;]*);`))[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  for (const [name, key] of [["Barrier", "barrier"], ["CarClass", "carClass"], ["Fuel", "fuel"], ["UseId", "use"], ["KmBand", "kmBand"], ["Parking", "parking"], ["WorkAccess", "workAccess"], ["TripFreq", "tripFreq"]]) {
    assert.deepEqual(union(name), ENUMS[key], name);
  }
});

test("canton order matches the app's BFS numbers", () => {
  const block = read("src/lib/navigator/session.ts").match(/const CANTON_BFS[^{]*\{([\s\S]*?)\n\};/)[1];
  const pairs = [...block.matchAll(/(\w\w): "(\d+)"/g)].map((m) => [m[1], Number(m[2])]);
  assert.equal(pairs.length, 26);
  pairs.forEach(([code, n]) => assert.equal(CANTONS[n - 1], code));
});

test("every workflow: inactive, unique names, valid wiring, one credential, no secret text, writes off", () => {
  for (const wf of [w1, w3, w4, w5, w6, w7, w8]) {
    assert.equal(wf.active, false, wf.name);
    assert.equal(wf.settings.saveDataSuccessExecution, "none", wf.name);
    const names = wf.nodes.map((n) => n.name);
    assert.equal(new Set(names).size, names.length, wf.name);
    for (const [from, c] of Object.entries(wf.connections)) {
      assert.ok(names.includes(from), `${wf.name}: ${from}`);
      for (const out of Object.values(c).flat()) for (const t of out) assert.ok(names.includes(t.node), `${wf.name}: ${t.node}`);
    }
    for (const n of wf.nodes.filter((x) => x.type.endsWith("postgres"))) {
      assert.deepEqual(n.credentials, { postgres: { id: "Tj1nxebs0zLxWTBj", name: "bev Postgres" } }, n.name);
      if (/insert/i.test(n.parameters.query)) assert.equal(n.disabled, true, `${wf.name}: ${n.name} must start off`);
    }
    const text = JSON.stringify(wf);
    assert.doesNotMatch(text, /(password|api[_-]?key|token|secret)\\?["']?\s*[:=]\s*\\?["'][^"'\\]{4,}|bearer [a-z0-9]/i, wf.name);
    for (const sched of wf.nodes.filter((n) => n.type.endsWith("scheduleTrigger"))) assert.equal(sched.disabled, true, `${wf.name}: ${sched.name}`);
  }
  for (const sql of [W1_INSERT, W3_INSERT, W4_INSERT]) assert.match(sql, /insert into bev_\w+_test /);
});

test("W1: junk is dropped, the row lands, and the flat view reads it as columns", async () => {
  const sample = run(src("w1-sample-session.js"))[0];
  const a = run(src("w1-typesafe-choice.js"), [sample]);
  const b = run(src("code-price.js"), a);
  const [row] = run(src("switch-toggles.js"), b);
  assert.doesNotMatch(JSON.stringify(row), /<script|postcode|8001|buy_now/i);
  assert.equal(row.payload.cohort, "i3");
  assert.deepEqual(row.payload.actions, ["share", "fold_why"]);
  assert.equal(row.payload.barrierVia, "tap");
  assert.deepEqual(row.payload.gapCodes, ["H2.2"], "only codes from the closed list pass");
  assert.deepEqual(row.payload.chargeSetup, { main: "maybe", backup: "no", standing: "yes", level: "test" });
  assert.deepEqual(row.payload.nextMove, { shown: "test-charging-week", outcomes: ["test-charging-week.done"] });
  assert.deepEqual(row.payload.location, { canton: "ZH", settlement: "city", tenure: "rent", plz2: null });
  const db = await database();
  await db.query(W1_INSERT, [row.clientSession, row.stage, JSON.stringify(row.payload)]);
  await db.exec("insert into bev_sessions select * from bev_sessions_test");
  const flat = (await db.query("select * from bev_sessions_flat")).rows[0];
  assert.equal(flat.stage, "final");
  assert.equal(flat.from_sample, row.payload.fromSample);
  assert.equal(flat.barrier, row.payload.answers.barrier);
  assert.equal(flat.cohort, "i3");
  assert.deepEqual(flat.actions, ["share", "fold_why"]);
  assert.equal(flat.barrier_via, "tap");
  assert.equal(flat.annual_swap, row.payload.nodes.find((n) => n.id === "price").output.annualSwap);
  assert.ok(["covered_within_8", "keep_or_later"].includes(flat.ending));
});

test("flat view: a result page that saved three times counts once, with the latest actions", async () => {
  const db = await database();
  const save = (id, stage, actions, at) => db.query("insert into bev_sessions (id, client_session, stage, payload, created_at) values ($1, 'cs-one', $2, $3, $4)", [id, stage, JSON.stringify({ stage, fromSample: false, cohort: "i1", actions, answers: { barrier: "cost" }, nodes: [] }), at]);
  await save("a", "mid", [], "2026-10-03T10:00:00Z");
  await save("b", "final", [], "2026-10-03T10:01:00Z");
  await save("c", "final", ["fold_why"], "2026-10-03T10:02:00Z");
  await save("d", "final", ["fold_why", "share"], "2026-10-03T10:03:00Z");
  const rows = (await db.query("select stage, actions from bev_sessions_flat order by stage")).rows;
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.find((r) => r.stage === "final").actions, ["fold_why", "share"]);
});

test("W1: unknown stage, session id and switch key are refused (the 400 path)", () => {
  const sample = run(src("w1-sample-session.js"))[0];
  assert.throws(() => run(src("w1-typesafe-choice.js"), [{ body: { ...sample.body, stage: "other" } }]), /Bad stage/);
  assert.throws(() => run(src("w1-typesafe-choice.js"), [{ body: { ...sample.body, clientSession: "x" } }]), /Bad session/);
  const a = run(src("w1-typesafe-choice.js"), [sample]);
  a[0].raw.toggles.invented = true;
  assert.throws(() => run(src("switch-toggles.js"), run(src("code-price.js"), a)), /Unexpected switch/);
  assert.equal(w1.nodes.filter((n) => n.onError === "continueErrorOutput").length, 3);
  assert.equal(w1.connections["Switch"].main[1][0].node, "Reply 400");
});

test("W5: the digest hides cells under 5 and counts the ending from paybackYears", async () => {
  const db = await database();
  const price = (payback) => ({ id: "price", output: { annualSwap: 1000, annualKeep: 1500, saving: 500, paybackYears: payback, model: "m", dataset: "d" } });
  let n = 0;
  const add = async (barrier, payback, extra = {}, sample = false, stage = "final") => {
    n += 1;
    const payload = { stage, fromSample: sample, gapCodes: extra.gaps ?? [], nextMove: { shown: null, outcomes: extra.outcomes ?? [] }, claimsOpened: extra.facts ?? [], cohort: extra.cohort ?? null, actions: extra.actions ?? [], answers: { barrier, unclear: extra.unclear ?? null, keepYears: extra.keepYears ?? null }, nodes: [price(payback)] };
    await db.query("insert into bev_sessions (id, client_session, stage, payload) values ($1, $2, $3, $4)", [`id${n}`, `cs${n}`, stage, JSON.stringify(payload)]);
  };
  for (let i = 0; i < 5; i++) await add("charging", 6, { facts: ["battery"], unclear: "payback", cohort: "i1", actions: ["share", "fold_why"], gaps: ["H2.2", "H3.1"], outcomes: ["settle-charging.done"] });
  for (let i = 0; i < 5; i++) await add("charging", 12);
  await add("trust", 12, { gaps: ["H5.5"] });
  for (let i = 0; i < 4; i++) await add("cost", null);
  await add("trips", 3, {}, true);
  await add("trips", 3, {}, false, "mid");
  const counts = (await db.query(DIGEST_SQL)).rows;
  const out = run(src("w5-digest.js"), counts)[0];
  assert.match(out.text, /charging \/ covered_within_8: 5/);
  assert.match(out.text, /charging \/ keep_or_later: 5/);
  assert.doesNotMatch(out.text, /cost \/ keep_or_later/);
  assert.doesNotMatch(out.text, /trips/);
  assert.match(out.text, /battery: 5/);
  assert.match(out.text, /share: 5/);
  assert.match(out.text, /i1: 5/);
  assert.match(out.text, /H2\.2: 5/);
  assert.doesNotMatch(out.text, /H5\.5/, "a gap held by fewer than 5 people is not listed");
  assert.match(out.text, /settle-charging\.done: 5/);
  assert.equal(out.hidden > 0, true);
  assert.doesNotMatch(out.text, /cs\d|id\d/);
});

test("W3: ElCom parse keeps sane values and turns bad answers into ok=false rows", () => {
  const queries = run(src("w3-elcom-query.js"));
  assert.equal(queries.length, 2);
  assert.equal(queries[1].year, queries[0].year + 1);
  assert.match(queries[0].query, /GROUP BY \?canton/);
  const bind = (n, avg, cnt) => ({ canton: { value: `https://ld.admin.ch/canton/${n}` }, avg: { value: String(avg) }, n: { value: String(cnt) } });
  const answers = [
    { statusCode: 200, body: { results: { bindings: [bind(1, 27.456, 160), bind(2, 999, 300)] } } },
    { statusCode: 500, body: null },
  ];
  const [{ rows }] = run(src("w3-elcom-parse.js"), answers, { "ElCom queries": queries });
  const zh = rows.find((r) => r.key === "ZH");
  assert.deepEqual([zh.ok, zh.value, zh.period], [true, 27.46, String(queries[0].year)]);
  assert.equal(rows.find((r) => r.key === "BE").ok, false);
  const failed = rows.find((r) => r.period === String(queries[1].year));
  assert.deepEqual([failed.ok, failed.value], [false, null]);
});

test("W3: BFE parse counts per postcode, ignores duplicates and bad postcodes, refuses a small file", () => {
  const rec = (id, plz, power) => ({ EvseID: id, Address: { PostalCode: plz }, ChargingFacilities: [{ power: String(power) }] });
  const many = Array.from({ length: 1200 }, (_, i) => rec(`CH*X*E${i}`, i % 2 ? "8001" : "3011", i % 10 === 0 ? 150 : 22));
  const ok = run(src("w3-bfe-parse.js"), [{ statusCode: 200, body: { EVSEData: [{ EVSEDataRecord: many }, rec("CH*X*E1", "8001", 22), rec("CH*X*Eold", "abc", 22)] } }])[0].rows[0];
  assert.equal(ok.ok, true);
  assert.equal(ok.value, 1200);
  const detail = JSON.parse(ok.detail);
  assert.equal(detail["8001"][0] + detail["3011"][0], 1200);
  assert.equal(detail["3011"][1] > 0, true);
  const flat = run(src("w3-bfe-parse.js"), [{ statusCode: 200, body: { EVSEData: many } }])[0].rows[0];
  assert.equal(flat.ok, true);
  const small = run(src("w3-bfe-parse.js"), [{ statusCode: 200, body: { EVSEData: many.slice(0, 5) } }])[0].rows[0];
  assert.equal(small.ok, false);
  assert.equal(run(src("w3-bfe-parse.js"), [{ statusCode: 404, body: null }])[0].rows[0].ok, false);
});

test("W3: BFS parse gives up instead of guessing; BFS branch stays idle until a URL is pasted", () => {
  assert.deepEqual(run(src("w3-bfs-url.js")), []);
  const refs = { "BFS file URL": [{ url: "https://example.org/x.xlsx" }] };
  const sheet = [
    { A: "Durchschnittspreise", B: "2026-07", C: "2026-08", D: "2026-09" },
    { A: "Bleifrei 95, Franken pro Liter", B: 1.79, C: 1.81, D: 1.8 },
    { A: "Diesel, Franken pro Liter", B: 1.93, C: 1.95, D: "1,96" },
  ];
  const rows = run(src("w3-bfs-parse.js"), sheet, refs)[0].rows;
  assert.deepEqual(rows.map((r) => [r.key, r.value, r.period, r.ok]), [["unleaded95", 1.8, "2026-09", true], ["diesel", 1.96, "2026-09", true]]);
  const noHeader = run(src("w3-bfs-parse.js"), sheet.slice(1), refs)[0].rows;
  assert.equal(noHeader.every((r) => r.ok === false), true);
  assert.equal(run(src("w3-bfs-parse.js"), [{}], refs)[0].rows.every((r) => r.ok === false), true);
});

test("W3: the insert accepts ok rows, keeps failed ones, and the latest view reads only ok rows", async () => {
  const db = await database();
  await db.exec("create table bev_reference_test2 (like bev_reference including all)");
  const sql = W3_INSERT.replace("bev_reference_test", "bev_reference");
  const row = (o) => ({ kind: "pump", key: "diesel", period: "2026-09", value: 1.96, unit: "CHF/l", detail: null, publisher: "BFS", source_url: "https://x", ok: true, note: "", ...o });
  await db.query(sql, [JSON.stringify([row({})])]);
  await db.query(sql, [JSON.stringify([row({ ok: false, value: null, note: "fetch failed" })])]);
  const latest = (await db.query("select value, unit from bev_reference_latest where kind = 'pump'")).rows;
  assert.deepEqual(latest, [{ value: 1.96, unit: "CHF/l" }]);
  assert.equal((await db.query("select count(*)::int n from bev_reference")).rows[0].n, 2);
  await assert.rejects(db.query(sql, [JSON.stringify([row({ value: null })])]), /check/);
  await assert.rejects(db.query("update bev_reference set note = 'x'"), /insert-only/);
  await assert.rejects(db.query("delete from bev_reference"), /insert-only/);
});

test("W4: only public https URLs are fetched; the comparison flags broken and changed pages", async () => {
  const urls = [
    { origin: "bev_facts", origin_key: "a", url: "https://www.tcs.ch/x" },
    { origin: "bev_dataset", origin_key: "b", url: "https://www.tcs.ch/x" },
    { origin: "bev_dataset", origin_key: "c", url: "http://insecure.example/x" },
    { origin: "bev_dataset", origin_key: "d", url: "https://localhost/x" },
    { origin: "bev_dataset", origin_key: "e", url: "https://192.168.1.5/x" },
    { origin: "bev_dataset", origin_key: "f", url: "https://user:pw@example.org/x" },
    { origin: "bev_dataset", origin_key: "g", url: "https://www.bfs.admin.ch/y" },
    { origin: "bev_dataset", origin_key: "h", url: "not a url" },
  ];
  const prev = [{ url: "https://www.bfs.admin.ch/y", content_hash: "old" }];
  const targets = run(src("w4-urls.js"), [{}], { "URLs to check": urls, "Previous checks": prev });
  assert.deepEqual(targets.map((t) => t.url), ["https://www.tcs.ch/x", "https://www.bfs.admin.ch/y"]);
  const pages = [{ statusCode: 200, body: "<html><script>var t=1</script><p>Same   text</p></html>" }, { statusCode: 404, body: "gone" }];
  const first = run(src("w4-compare.js"), pages, { "Unique URLs": targets })[0];
  assert.equal(first.broken, 1);
  assert.equal(first.rows[0].changed, false);
  assert.equal(first.rows[1].error, "HTTP 404");
  const again = run(src("w4-compare.js"), [pages[0], { statusCode: 200, body: "<p>New text</p>" }], { "Unique URLs": targets.map((t) => ({ ...t, previous_hash: t.url.includes("bfs") ? first.rows[0].content_hash : first.rows[0].content_hash })) })[0];
  assert.equal(again.rows[0].changed, false);
  assert.equal(again.rows[1].changed, true);
  const db = await database();
  await db.exec("create table bev_facts_x as select 1");
  const sql = W4_INSERT.replace("bev_source_checks_test", "bev_source_checks");
  await db.query(sql, [JSON.stringify(first.rows)]);
  const latest = (await db.query("select url, changed, error from bev_source_latest order by url")).rows;
  assert.equal(latest.length, 2);
  await assert.rejects(db.query("delete from bev_source_checks"), /insert-only/);
  assert.match(URLS_SQL, /bev_facts/);
  assert.match(PREVIOUS_SQL, /distinct on \(url\)/);
});

test("the checked-in JSON files are what the builders produce", () => {
  const same = (file, wf) => assert.equal(read(`n8n/${file}`), JSON.stringify(wf, null, 2) + "\n", `${file} is stale: run its builder`);
  same("w1-session-ingest.workflow.json", w1);
  same("w3-reference-refresh.workflow.json", w3);
  same("w4-source-freshness.workflow.json", w4);
  same("w5-analytics-digest.workflow.json", w5);
  same("w6-words-classifier.workflow.json", w6);
  same("w7-words-classifier-jev.workflow.json", w7);
  same("w8-picture-test-jev.workflow.json", w8);
});

test("W6: text in, one closed name out, no text anywhere, AI step off and falling back to rules", async () => {
  const words = "I rent a flat and there is no plug in the garage";
  const checked = run(src("w6-input.js"), [{ body: { words: `  ${words}  ` } }]);
  assert.equal(checked[0].words, words);
  assert.throws(() => run(src("w6-input.js"), [{ body: { words: "x" } }]), /Too short/);
  assert.throws(() => run(src("w6-input.js"), [{ body: { words: "y".repeat(281) } }]), /Too long/);
  assert.throws(() => run(src("w6-input.js"), [{ body: { words: 42 } }]), /Too short/);
  const ruled = run(src("w6-rules.js"), checked);
  assert.equal(ruled[0].rules.barrier, "charging");
  assert.equal(run(src("w6-flag.js"), ruled)[0].ai, false);
  const decide = (extract) => run(src("w6-decide.js"), [{}], { Rules: ruled, ...(extract ? { "Extract barrier": extract } : {}) })[0];
  const off = decide(null);
  assert.deepEqual([off.barrier, off.via], ["charging", "rules"]);
  assert.doesNotMatch(JSON.stringify(off), /plug|garage|rent/);
  assert.equal(decide([{ output: { barrier: "cost", confidence: 0.9 } }]).via, "ai");
  for (const bad of [{ barrier: "buy now", confidence: 0.9 }, { barrier: "cost", confidence: 1.4 }, { barrier: "cost", confidence: "high" }, { barrier: "cost", confidence: 0.4 }, null]) {
    const out = decide([{ output: bad }]);
    assert.deepEqual([out.barrier, out.via], ["charging", "rules"], JSON.stringify(bad));
  }
  assert.equal(run(src("w6-rules.js"), [{ words: "Please help me arrange a lease" }])[0].rules.barrier, "cost");
  assert.equal(run(src("w6-rules.js"), [{ words: "Please help me arrange it" }])[0].rules.barrier, "none");
});

test("W6: the workflow keeps no execution data, has no database node and starts with the AI nodes off", () => {
  assert.equal(w6.settings.saveDataErrorExecution, "none");
  assert.equal(w6.settings.saveManualExecutions, false);
  assert.equal(w6.nodes.filter((n) => /postgres|httpRequest/.test(n.type)).length, 0);
  for (const name of ["Extract barrier", "Chat model"]) assert.equal(w6.nodes.find((n) => n.name === name).disabled, true, name);
  assert.match(src("w6-flag.js"), /const ai = false;/);
  assert.equal(w6.connections["Chat model"].ai_languageModel[0][0].node, "Extract barrier");
  assert.ok(w6.nodes.find((n) => n.name === "Chat model").credentials === undefined);
  assert.equal(w6.connections["AI on?"].main[1][0].node, "Decide");
});

test("W6 evaluation: the rules stay above the floor on the fixed set", async () => {
  const run1 = (words) => {
    const [{ json }] = new Function("$input", `return (function(){${src("w6-rules.js")}})()`)({ first: () => ({ json: { words } }) });
    return { ...json.rules, via: "rules" };
  };
  const r = await evalWords(async (w) => run1(w));
  assert.ok(r.accuracy >= 0.8, `accuracy ${r.accuracy}`);
  assert.ok(r.sureAccuracy >= 0.95, `confident accuracy ${r.sureAccuracy}`);
});

test("jobs: every schedule goes through a switch that reads bev_jobs, and every job starts off", async () => {
  const { gateSql, runLogSql, JOBS } = await import("../n8n/lib/kit.mjs");
  const db = new PGlite();
  await db.exec(read("migrations/0026_classifier_log_and_jobs.sql"));
  const rows = (await db.query("select id, enabled from bev_jobs order by id")).rows;
  assert.deepEqual(rows.map((r) => r.id), [...JOBS].sort());
  assert.ok(rows.every((r) => r.enabled === false), "all jobs are registered switched off");
  for (const id of JOBS) assert.equal((await db.query(gateSql(id))).rows.length, 0, `${id}: the gate stops a run while the job is off`);
  await db.exec("update bev_jobs set enabled = true where id = 'source-freshness'");
  assert.equal((await db.query(gateSql("source-freshness"))).rows.length, 1);
  assert.equal((await db.query(gateSql("analytics-digest"))).rows.length, 0, "switching one job on leaves the others off");
  await db.query(runLogSql("source-freshness").replace("$1", "true").replace("$2", "3").replace("$3", "'ran on schedule'"));
  const status = (await db.query("select id, last_ok, last_summary from bev_job_status where id = 'source-freshness'")).rows[0];
  assert.equal(status.last_ok, true);
  assert.throws(() => gateSql("made-up-job"), /unknown job/);

  const byJob = { W3: [w3, "reference-refresh"], W4: [w4, "source-freshness"], W5: [w5, "analytics-digest"] };
  for (const [label, [wf, id]] of Object.entries(byJob)) {
    const gates = wf.nodes.filter((n) => n.parameters.query === gateSql(id));
    assert.ok(gates.length >= 1, `${label} has a switch`);
    for (const sched of wf.nodes.filter((n) => n.type.endsWith("scheduleTrigger"))) {
      const next = wf.connections[sched.name].main.flat().map((t) => t.node);
      assert.ok(next.length > 0 && next.every((n) => gates.some((g) => g.name === n)), `${label}: ${sched.name} must lead only into a switch`);
    }
    const manual = wf.nodes.find((n) => n.type.endsWith("manualTrigger"));
    const manualNext = wf.connections[manual.name].main.flat().map((t) => t.node);
    assert.ok(!manualNext.some((n) => gates.some((g) => g.name === n)), `${label}: running by hand skips the switch`);
    const log = wf.nodes.find((n) => n.parameters.query === runLogSql(id));
    assert.ok(log && log.disabled === true, `${label}: the run log exists and starts off`);
  }
});

test("W1: its stored payload has the same top-level keys as the app's own, and enum lists match the app's", async () => {
  // The keys saveSession writes (read from its source) minus the two nodes W1 fills in later (price, solutions are inside "nodes").
  const session = read("src/lib/navigator/session.ts");
  const start = session.indexOf("const payload = {");
  const block = session.slice(start, session.indexOf("const sql = await getSql();", start));
  const appKeys = [...block.matchAll(/^      (\w+)[:,]/gm)].map((m) => m[1]).sort();
  const sample = run(src("w1-sample-session.js"))[0];
  const [row] = run(src("switch-toggles.js"), run(src("code-price.js"), run(src("w1-typesafe-choice.js"), [sample])));
  assert.deepEqual(Object.keys(row.payload).sort(), appKeys, "W1 and saveSession must store the same fields");
  const { GAP_CODE_LIST } = await import("../src/lib/navigator/gapcodes.ts");
  const { ACTION_IDS, OUTCOME_KEYS } = await import("../src/lib/navigator/actions.ts");
  const { CHARGE_MAIN, CHARGE_BACKUP, CHARGE_STANDING } = await import("../src/lib/navigator/charging.ts");
  assert.deepEqual(ENUMS.gapCode, [...GAP_CODE_LIST]);
  assert.deepEqual(ENUMS.move, [...ACTION_IDS]);
  assert.deepEqual(ENUMS.outcome, [...new Set(OUTCOME_KEYS.map((k) => k.split(".")[1]))]);
  assert.deepEqual([ENUMS.chargeMain, ENUMS.chargeBackup, ENUMS.chargeStanding], [[...CHARGE_MAIN], [...CHARGE_BACKUP], [...CHARGE_STANDING]]);
  const oneOf = session.match(/const ONE_OF = \{([\s\S]*?)\n\} as const;/)[1];
  for (const k of ["settlement", "tenure"]) assert.deepEqual(JSON.parse(oneOf.match(new RegExp(`${k}: (\\[.*?\\])`))[1]), ENUMS[k]);
});

test("W8: the picture bench is hand-run, writes nothing, starts with both outside steps off, and refuses unsafe links", async () => {
  const { wf: w8 } = await import("../n8n/build-w8.mjs");
  assert.equal(w8.active, false);
  assert.ok(!w8.nodes.some((n) => n.type.endsWith("postgres") || n.type.endsWith("scheduleTrigger") || n.type.endsWith("webhook")), "no database, schedule or public entry");
  for (const n of w8.nodes.filter((x) => x.type.endsWith("httpRequest"))) assert.equal(n.disabled, true, n.name);
  assert.equal(w8.settings.saveManualExecutions, false);
  assert.doesNotMatch(src("w8-read-first.md"), /use the slides|copy the deck/i);
  assert.match(src("w8-read-first.md"), /Restricted/);
  // Pick pictures: an empty list stops with a message; unsafe links never pass.
  assert.throws(() => run(src("w8-pick.js")), /Add at least one/);
  const pick = (list) => run(src("w8-pick.js").replace(/const LIST = \[[\s\S]*?\n\];/, `const LIST = ${JSON.stringify(list)};`));
  const good = pick([{ url: "https://example.org/a.jpg", expect: "shared_garage" }, { url: "http://example.org/b.jpg" }, { url: "https://localhost/c.png" }, { url: "https://192.168.1.4/d.png" }, { url: "https://example.org/e.pdf" }, { url: "https://u:p@example.org/f.jpg" }, { url: "https://example.org/g.png", expect: "made-up" }]);
  assert.deepEqual(good.map((g) => g.url), ["https://example.org/a.jpg", "https://example.org/g.png"]);
  assert.equal(good[1].expect, null, "a label outside the closed list is dropped");
  // Build + Tally with a stubbed Jev answer.
  const [b] = run(src("w8-build.js"), [{ content: [{ text: "A shared underground garage with many bays. See https://x.example/secret" }] }], { "Pick pictures": [{ url: "https://example.org/a.jpg", expect: "shared_garage" }] });
  assert.doesNotMatch(b.request.state, /https?:|secret/);
  assert.deepEqual(Object.keys(b.request.questions), ["scene"]);
  assert.ok(b.request.questions.scene.criteria.not_a_parking_scene, "the closed list has a way out");
  const [tally] = run(src("w8-decide.js"), [{ answers: { scene: { type: "choice", choice: "shared_garage", confidence: 0.8 } } }, { answers: { scene: { type: "choice", choice: "made_up", confidence: 0.9 } } }], { "Build request": [{ expect: "shared_garage" }, { expect: "own_wallbox" }] });
  assert.equal(tally.pictures, 2);
  assert.equal(tally.answered, 1, "an answer outside the closed list counts as none");
  assert.equal(tally.agreeWithYourLabel, 1);
  assert.doesNotMatch(JSON.stringify(tally), /https?:/);
});
