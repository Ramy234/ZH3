import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const table = JSON.parse(readFileSync(new URL("./postcodes.json", import.meta.url), "utf8")) as { meta: Record<string, unknown>; plz: Record<string, [string, number, string, number?]> };
const session = readFileSync(new URL("./session.ts", import.meta.url), "utf8");
const CANTONS = "ZH BE LU UR SZ OW NW GL ZG FR SO BS BL SH AR AI SG GR AG TG TI VD VS NE GE JU".split(" ");

test("postcode table: Swiss postcodes only, known cantons, BFS numbers, no coordinates, the source named", () => {
  const codes = Object.keys(table.plz);
  assert.ok(codes.length > 3000);
  for (const [plz, [canton, bfs, name]] of Object.entries(table.plz)) {
    assert.match(plz, /^[1-9]\d{3}$/);
    assert.ok(CANTONS.includes(canton), `${plz} ${canton}`);
    assert.ok(Number.isInteger(bfs) && bfs > 0 && bfs < 7000, `${plz} ${bfs}`);
    assert.ok(name.length > 1);
  }
  assert.deepEqual(table.plz["8001"].slice(0, 3), ["ZH", 261, "Zürich"]);
  assert.equal(table.plz["3011"][0], "BE");
  assert.equal(table.plz["1000"][0], "VD");
  assert.equal(table.plz["9490"], undefined, "Liechtenstein is not in a Swiss-only check");
  assert.equal(table.meta.droppedRows, 20);
  assert.match(String(table.meta.url), /^https:\/\/opendata\.swiss\//);
  assert.doesNotMatch(JSON.stringify(table).slice(0, 5000), /2542001|1156759/, "no LV95 coordinates");
});

test("postcode lookup: the server function takes a municipality number, never a postcode", () => {
  assert.doesNotMatch(session, /openplzapi/);
  assert.match(session, /export const lookupMunicipality/);
  assert.doesNotMatch(session, /export const lookupPostcode/);
});
