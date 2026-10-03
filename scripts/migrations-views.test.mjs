// Applies every migration in order on an in-memory Postgres (PGLite), then checks the views that count gaps and next moves.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { projectRoot } from "./with-app-env.mjs";

const dir = join(projectRoot(), "migrations");
const files = readdirSync(dir).filter((f) => /^\d{4}_.*\.sql$/.test(f) && !f.startsWith("0001_")).sort();

async function fresh() {
  const db = new PGlite();
  for (const f of files) {
    try {
      await db.exec(readFileSync(join(dir, f), "utf8"));
    } catch (e) {
      throw new Error(`${f}: ${e.message}`);
    }
  }
  return db;
}

function session(i, over = {}) {
  const payload = {
    workflow: "bev-navigator",
    stage: "final",
    clientSession: `aaaaaaaa-0000-4000-8000-0000000000${String(i).padStart(2, "0")}`,
    nodes: [{ id: "price", output: { canton: "ZH", paybackYears: 9, ending: "keep_or_later" } }],
    claimsOpened: ["tenant-right"],
    gapCodes: ["H2.1", "H2.2", "H3.3"],
    chargeSetup: { main: "no", backup: "yes", standing: "yes", level: "missing" },
    nextMove: { shown: "ask-building", outcomes: ["ask-building.done"] },
    answers: { barrier: "charging" },
    ...over,
  };
  return payload;
}

test("migrations: all of them apply in order, and the watch table has its two seed rows with row-level security on", async () => {
  const db = await fresh();
  const watch = await db.query("select id, stage from bev_watch order by id");
  assert.deepEqual(watch.rows.map((r) => r.id), ["ev-levy-2030", "right-to-charge"]);
  const rls = await db.query("select relrowsecurity from pg_class where relname = 'bev_watch'");
  assert.equal(rls.rows[0].relrowsecurity, true);
  const facts = await db.query("select key from bev_facts where key in ('wait-or-not', 'car-data') order by key");
  assert.deepEqual(facts.rows.map((r) => r.key), ["car-data", "wait-or-not"]);
  await db.close();
});

test("gap views: a cell under five people is hidden, five or more shows, and the latest save per session is the one counted", async () => {
  const db = await fresh();
  for (let i = 1; i <= 5; i++) {
    const p = session(i);
    // An earlier save of the same sitting must not be counted twice.
    await db.query("insert into bev_sessions (id, client_session, stage, payload, created_at) values ($1, $2, 'final', $3, now() - interval '1 hour')", [`old-${i}`, p.clientSession, JSON.stringify({ ...p, gapCodes: ["H5.1"] })]);
    await db.query("insert into bev_sessions (id, client_session, stage, payload) values ($1, $2, 'final', $3)", [`new-${i}`, p.clientSession, JSON.stringify(p)]);
  }
  const lone = session(9, { gapCodes: ["H7.3"], nextMove: { shown: null, outcomes: ["keep-valid.unclear"] } });
  await db.query("insert into bev_sessions (id, client_session, stage, payload) values ('lone', $1, 'final', $2)", [lone.clientSession, JSON.stringify(lone)]);

  const backlog = await db.query("select code, canton, people from bev_gap_backlog where canton is null order by code");
  assert.deepEqual(backlog.rows.map((r) => [r.code, r.people]), [["H2.1", 5], ["H2.2", 5], ["H3.3", 5]]);
  assert.ok(!backlog.rows.some((r) => r.code === "H5.1" || r.code === "H7.3"));
  const zh = await db.query("select code, people from bev_gap_backlog where canton = 'ZH' and code = 'H2.2'");
  assert.equal(zh.rows[0].people, 5);

  const stats = await db.query("select action_id, outcome, people from bev_action_stats");
  assert.deepEqual(stats.rows.map((r) => [r.action_id, r.outcome, r.people]), [["ask-building", "done", 5]]);

  const cols = (await db.query("select column_name from information_schema.columns where table_name = 'bev_gap_sessions'")).rows.map((r) => r.column_name);
  assert.ok(!cols.includes("id") && !cols.includes("postcode") && !cols.includes("created_at"));
  await db.close();
});
