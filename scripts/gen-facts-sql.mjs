// Prints "insert ... on conflict do update" for the named fact keys, from src/lib/navigator/facts.ts.
// Usage: node --experimental-strip-types scripts/gen-facts-sql.mjs wait-or-not car-data
import { FACTS } from "../src/lib/navigator/facts.ts";

const keys = process.argv.slice(2);
if (!keys.length) throw new Error("name at least one fact key");
const q = (v) => {
  if (v == null) return "null";
  if (String(v).includes("$tq$")) throw new Error("text contains the quote tag");
  return `$tq$${v}$tq$`;
};
const rows = keys.map((k) => {
  const f = FACTS[k];
  if (!f) throw new Error(`unknown fact ${k}`);
  return `(${q(f.key)}, ${q(f.title)}, ${q(f.body)}, ${q(f.source)}, ${q(f.url ?? null)}, '${f.as_of}', ${q(f.status)})`;
});
console.log(`insert into bev_facts (key, title, body, source, url, as_of, status) values\n${rows.join(",\n")}\non conflict (key) do update set\n  title = excluded.title, body = excluded.body, source = excluded.source, url = excluded.url, as_of = excluded.as_of, status = excluded.status;`);
