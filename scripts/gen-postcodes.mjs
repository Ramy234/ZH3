#!/usr/bin/env node
// Builds src/lib/navigator/postcodes.json from swisstopo's official directory of localities (AMTOVZ_CSV_LV95.csv).
//   node scripts/gen-postcodes.mjs /path/to/AMTOVZ_CSV_LV95.csv
// One entry per 4-digit postcode: [canton, BFS municipality number, municipality name, number of other municipalities].
// A postcode can span several municipalities; the one with the largest share of addresses is kept, and the page says so.
// Coordinates are dropped on purpose. Liechtenstein rows (no canton) are dropped: the check is for Switzerland.
// Source: Federal Office of Topography swisstopo, free to use including commercially, with the source named.
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/gen-postcodes.mjs /path/to/AMTOVZ_CSV_LV95.csv");
  process.exit(2);
}
const CANTONS = new Set("ZH BE LU UR SZ OW NW GL ZG FR SO BS BL SH AR AI SG GR AG TG TI VD VS NE GE JU".split(" "));
const lines = readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
const head = lines[0].split(";");
const col = (n) => {
  const i = head.indexOf(n);
  if (i < 0) throw new Error(`column ${n} not found in ${head.join(", ")}`);
  return i;
};
const C = { plz: col("PLZ4"), muni: col("Gemeindename"), bfs: col("BFS-Nr"), canton: col("Kantonskürzel"), share: col("Adressenanteil"), valid: col("Validity") };
const byPlz = new Map();
let newest = "";
let dropped = 0;
for (const line of lines.slice(1)) {
  const f = line.split(";");
  if (!CANTONS.has(f[C.canton])) {
    dropped += 1;
    continue;
  }
  newest = f[C.valid] > newest ? f[C.valid] : newest;
  const share = Number(String(f[C.share]).replace(/[^\d.]/g, "")) || 0;
  const list = byPlz.get(f[C.plz]) ?? new Map();
  const key = f[C.bfs];
  const prev = list.get(key);
  list.set(key, { canton: f[C.canton], bfs: Number(key), name: f[C.muni], share: (prev?.share ?? 0) + share });
  byPlz.set(f[C.plz], list);
}
const plz = {};
for (const [code, list] of [...byPlz].sort((a, b) => a[0].localeCompare(b[0]))) {
  const ranked = [...list.values()].sort((a, b) => b.share - a.share || a.bfs - b.bfs);
  const top = ranked[0];
  plz[code] = ranked.length > 1 ? [top.canton, top.bfs, top.name, ranked.length - 1] : [top.canton, top.bfs, top.name];
}
const meta = {
  source: "Official directory of localities (AMTOVZ), Federal Office of Topography swisstopo",
  url: "https://opendata.swiss/en/dataset/amtliches-ortschaftenverzeichnis-mit-postleitzahl-und-perimeter",
  newestValidity: newest,
  downloaded: new Date().toISOString().slice(0, 10),
  postcodes: Object.keys(plz).length,
  droppedRows: dropped,
};
writeFileSync(new URL("../src/lib/navigator/postcodes.json", import.meta.url), JSON.stringify({ meta, plz }) + "\n");
console.log(meta);
