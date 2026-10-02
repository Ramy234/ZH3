// Tests for the n8n workflow files W1, W3, W4, W5 and the SQL they rely on (migrations 0012 and 0013).
// The Code nodes run here exactly as written in n8n/src; the SQL runs in PGlite.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { ENUMS, CANTONS } from "../n8n/lib/enums.mjs";
import { wf as w1, INSERT_SQL as W1_INSERT } from "../n8n/build-w1.mjs";
import { wf as w3, INSERT_SQL as W3_INSERT } from "../n8n/build-w3.mjs";
import { wf as w4, URLS_SQL, PREVIOUS_SQL, INSERT_SQL as W4_INSERT } from "../n8n/build-w4.mjs";
import { wf as w5 } from "../n8n/build-w5.mjs";
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

const MIGRATIONS = ["0002_bev.sql", "0008_row_level_security.sql", "0009_bev_dataset.sql", "0012_reference_sources_flat.sql", "0013_reference_sources_test.sql"];
async function database() {
  const db = new PGlite();
  for (const f of MIGRATIONS) await db.exec(read(`migrations/${f}`));
  await db.exec("create table bev_sessions_test (like bev_sessions including all)");
  return db;
}

test("closed lists: the app's types, W1's whitelist and the shared list agree", () => {
  const one = src("typesafe-choice.js").match(/const ONE_OF = (\{[\s\S]*?\n\});/)[1];
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
  for (const wf of [w1, w3, w4, w5]) {
    assert.equal(wf.active, false, wf.name);
    assert.equal(wf.settings.saveDataSuccessExecution, "none", wf.name);
    const names = wf.nodes.map((n) => n.name);
    assert.equal(new Set(names).size, names.length, wf.name);
    for (const [from, c] of Object.entries(wf.connections)) {
      assert.ok(names.includes(from), `${wf.name}: ${from}`);
      for (const out of c.main) for (const t of out) assert.ok(names.includes(t.node), `${wf.name}: ${t.node}`);
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
  const sample = run(src("sample-session.js"))[0];
  const a = run(src("typesafe-choice.js"), [sample]);
  const b = run(src("code-price.js"), a);
  const [row] = run(src("switch-toggles.js"), b);
  assert.doesNotMatch(JSON.stringify(row), /<script|postcode|8001/i);
  const db = await database();
  await db.query(W1_INSERT, [row.clientSession, row.stage, JSON.stringify(row.payload)]);
  await db.exec("insert into bev_sessions select * from bev_sessions_test");
  const flat = (await db.query("select * from bev_sessions_flat")).rows[0];
  assert.equal(flat.stage, "final");
  assert.equal(flat.from_sample, row.payload.fromSample);
  assert.equal(flat.barrier, row.payload.answers.barrier);
  assert.equal(flat.annual_swap, row.payload.nodes.find((n) => n.id === "price").output.annualSwap);
  assert.ok(["covered_within_8", "keep_or_later"].includes(flat.ending));
});

test("W1: unknown stage, session id and switch key are refused (the 400 path)", () => {
  const sample = run(src("sample-session.js"))[0];
  assert.throws(() => run(src("typesafe-choice.js"), [{ body: { ...sample.body, stage: "other" } }]), /Bad stage/);
  assert.throws(() => run(src("typesafe-choice.js"), [{ body: { ...sample.body, clientSession: "x" } }]), /Bad session/);
  const a = run(src("typesafe-choice.js"), [sample]);
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
    const payload = { stage, fromSample: sample, claimsOpened: extra.facts ?? [], answers: { barrier, unclear: extra.unclear ?? null, keepYears: extra.keepYears ?? null }, nodes: [price(payback)] };
    await db.query("insert into bev_sessions (id, client_session, stage, payload) values ($1, $2, $3, $4)", [`id${n}`, `cs${n}`, stage, JSON.stringify(payload)]);
  };
  for (let i = 0; i < 5; i++) await add("charging", 6, { facts: ["battery"], unclear: "payback" });
  for (let i = 0; i < 5; i++) await add("charging", 12);
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
});
