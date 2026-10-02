// Builds n8n/w3-reference-refresh.workflow.json (inactive), targeting bev_reference_test.
//   node n8n/build-w3.mjs
//   BEV_REFERENCE_TABLE=bev_reference node n8n/build-w3.mjs   only after a test insert succeeded
import { writeFileSync } from "node:fs";
import { code, node, note, postgres, src, pickTable, workflow } from "./lib/kit.mjs";

export const TABLE = pickTable(process.env.BEV_REFERENCE_TABLE, "bev_reference", "bev_reference_test");
export const INSERT_SQL = `insert into ${TABLE} (kind, key, period, value, unit, detail, publisher, source_url, ok, note) select x.kind, x.key, x.period, x.value, x.unit, x.detail, x.publisher, x.source_url, x.ok, coalesce(x.note, '') from json_to_recordset($1::json) as x(kind text, key text, period text, value double precision, unit text, detail text, publisher text, source_url text, ok boolean, note text) returning id`;

const fetchJson = (name, position, parameters, timeout) =>
  node(name, "httpRequest", 4.2, position, { ...parameters, options: { timeout, response: { response: { fullResponse: true, neverError: true, responseFormat: "json" } } } }, { onError: "continueRegularOutput" });

export const wf = workflow(
  "W3 BEV reference refresh",
  [
    note(src("w3-read-first.md"), [-40, -460], 520, 420),
    node("Run by hand", "manualTrigger", 1, [0, 100]),
    node("Monthly", "scheduleTrigger", 1.2, [0, 300], { rule: { interval: [{ field: "months", monthsInterval: 1 }] } }, { disabled: true }),
    node("Weekly", "scheduleTrigger", 1.2, [0, 500], { rule: { interval: [{ field: "weeks", weeksInterval: 1 }] } }, { disabled: true }),

    code("ElCom queries", src("w3-elcom-query.js"), [260, 0]),
    fetchJson("ElCom fetch", [500, 0], {
      method: "POST", url: "https://ld.admin.ch/query", sendHeaders: true, specifyHeaders: "keypair",
      headerParameters: { parameters: [{ name: "Accept", value: "application/sparql-results+json" }] },
      sendBody: true, contentType: "raw", rawContentType: "application/sparql-query", body: "={{ $json.query }}",
    }, 30000),
    code("Parse ElCom", src("w3-elcom-parse.js"), [740, 0]),

    fetchJson("BFE fetch", [260, 500], { method: "GET", url: "https://data.geo.admin.ch/ch.bfe.ladestellen-elektromobilitaet/data/oicp/ch.bfe.ladestellen-elektromobilitaet.json" }, 120000),
    code("Parse BFE", src("w3-bfe-parse.js"), [500, 500]),

    code("BFS file URL", src("w3-bfs-url.js"), [260, 250]),
    node("BFS fetch", "httpRequest", 4.2, [500, 250], { method: "GET", url: "={{ $json.url }}", options: { timeout: 60000, response: { response: { responseFormat: "file" } } } }, { onError: "continueRegularOutput" }),
    node("Read XLSX", "extractFromFile", 1, [740, 250], { operation: "xlsx", options: { headerRow: false } }),
    code("Parse BFS", src("w3-bfs-parse.js"), [980, 250]),

    postgres("Insert reference", INSERT_SQL, [1240, 250], { replacement: "={{ [JSON.stringify($json.rows)] }}", off: true }),
  ],
  [
    ["Run by hand", "ElCom queries"], ["Run by hand", "BFE fetch"], ["Run by hand", "BFS file URL"],
    ["Monthly", "ElCom queries"], ["Monthly", "BFS file URL"], ["Weekly", "BFE fetch"],
    ["ElCom queries", "ElCom fetch"], ["ElCom fetch", "Parse ElCom"], ["Parse ElCom", "Insert reference"],
    ["BFE fetch", "Parse BFE"], ["Parse BFE", "Insert reference"],
    ["BFS file URL", "BFS fetch"], ["BFS fetch", "Read XLSX"], ["Read XLSX", "Parse BFS"], ["Parse BFS", "Insert reference"],
  ],
);
if (import.meta.url === `file://${process.argv[1]}`) writeFileSync(new URL("w3-reference-refresh.workflow.json", import.meta.url), JSON.stringify(wf, null, 2) + "\n");
