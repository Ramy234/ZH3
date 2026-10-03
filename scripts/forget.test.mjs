// "Delete what is stored about this visit": the two statements in session.ts (forgetSession) are run on a real schema.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../", import.meta.url);

test("forgetSession removes this visit's session rows and postcode, and nobody else's", async () => {
  const db = new PGlite();
  for (const f of readdirSync(new URL("migrations/", root)).filter((n) => n.endsWith(".sql")).sort()) await db.exec(readFileSync(new URL(`migrations/${f}`, root), "utf8"));
  const source = readFileSync(new URL("src/lib/navigator/session.ts", root), "utf8");
  const block = source.slice(source.indexOf("export const forgetSession"), source.indexOf("export type PublicEvent"));
  const statements = [...block.matchAll(/sql<[^>]*>`(with d as \(delete from [\s\S]*?)`/g)].map((m) => m[1].replace(/\$\{id\}/g, "$1"));
  assert.equal(statements.length, 2, "forgetSession runs two deletes");
  assert.ok(statements.some((s) => /bev_locations/.test(s)) && statements.some((s) => /bev_sessions/.test(s)));
  const mine = "aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa";
  const other = "bbbbbbbb-2222-4bbb-8bbb-bbbbbbbbbbbb";
  for (const [i, cs] of [[1, mine], [2, mine], [3, other]]) await db.query("insert into bev_sessions (id, client_session, stage, payload) values ($1, $2, 'final', '{}')", [`id${i}`, cs]);
  await db.query("insert into bev_locations (client_session, postcode, canton, settlement) values ($1, '8001', 'ZH', 'city'), ($2, '3000', 'BE', 'city')", [mine, other]);
  const counts = [];
  for (const s of statements) counts.push((await db.query(s, [mine])).rows[0].n);
  assert.deepEqual(counts.sort(), [1, 2], "one postcode row and two session rows deleted");
  assert.equal((await db.query("select count(*)::int as n from bev_sessions where client_session = $1", [mine])).rows[0].n, 0);
  assert.equal((await db.query("select count(*)::int as n from bev_locations where client_session = $1", [mine])).rows[0].n, 0);
  assert.equal((await db.query("select count(*)::int as n from bev_sessions where client_session = $1", [other])).rows[0].n, 1, "another visit is untouched");
  assert.equal((await db.query("select count(*)::int as n from bev_locations where client_session = $1", [other])).rows[0].n, 1);
});
