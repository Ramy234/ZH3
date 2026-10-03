// Writes n8n/sheet/bev-dataset-template.csv: the rows to paste into the Google Sheet "BEV dataset".
// Run: node --experimental-strip-types scripts/gen-dataset-csv.mjs
import { writeFileSync } from "node:fs";
import { seedRows } from "../src/lib/navigator/dataset.ts";

export const COLUMNS = ["key", "value", "unit", "status", "publisher", "published_on", "source_url", "note"];
/** @param {unknown} v */
const cell = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
export function csv() {
  return [COLUMNS.join(","), ...seedRows().map((r) => COLUMNS.map((c) => cell(/** @type {Record<string, unknown>} */ (/** @type {unknown} */ (r))[c])).join(","))].join("\n") + "\n";
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) writeFileSync(new URL("../n8n/sheet/bev-dataset-template.csv", import.meta.url), csv());
