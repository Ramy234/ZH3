// Builds n8n/w2-dataset-publish.workflow.json (inactive). Validation code lives in src/w2-validate.js.
//   node n8n/build-w2.mjs            targets bev_dataset_test (the copy table)
//   BEV_DATASET_TABLE=bev_dataset node n8n/build-w2.mjs   targets the real table, only after a test insert succeeded
import { readFileSync, writeFileSync } from "node:fs";
const here = new URL(".", import.meta.url);
const TABLE = process.env.BEV_DATASET_TABLE || "bev_dataset_test";
if (!/^bev_dataset(_test)?$/.test(TABLE)) throw new Error("BEV_DATASET_TABLE must be bev_dataset or bev_dataset_test");
export const SHEET_ID = "14KMwC_MWIkJeJbN5sNPONBxFVv3DcuO1K4g3nO7F8vo";
export const CURRENT_SQL = `select key, value, unit, status, publisher, published_on::text as published_on, source_url, note from ${TABLE} where dataset_version = (select dataset_version from ${TABLE} order by valid_from desc, dataset_version desc limit 1)`;
export const INSERT_SQL = `insert into ${TABLE} (dataset_version, key, value, unit, status, publisher, published_on, source_url, note) select $1, x.key, x.value, x.unit, x.status, x.publisher, x.published_on::date, x.source_url, coalesce(x.note, '') from json_to_recordset($2::json) as x(key text, value double precision, unit text, status text, publisher text, published_on text, source_url text, note text) returning key`;
const pg = { postgres: { id: "Tj1nxebs0zLxWTBj", name: "bev Postgres" } };
const wf = {
  name: "W2 BEV dataset publish",
  active: false,
  settings: { executionOrder: "v1", saveDataSuccessExecution: "none" },
  nodes: [
    { parameters: { content: readFileSync(new URL("src/w2-read-first.md", here), "utf8"), height: 360, width: 460 }, id: "w2-note", name: "Read first", type: "n8n-nodes-base.stickyNote", typeVersion: 1, position: [-40, -420] },
    { parameters: {}, id: "w2-manual", name: "Run by hand", type: "n8n-nodes-base.manualTrigger", typeVersion: 1, position: [0, 0] },
    { parameters: { rule: { interval: [{ field: "days", daysInterval: 1 }] } }, id: "w2-daily", name: "Daily", type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2, position: [0, 200], disabled: true },
    {
      parameters: { documentId: { __rl: true, value: SHEET_ID, mode: "id" }, sheetName: { __rl: true, value: "gid=0", mode: "id" }, options: {} },
      id: "w2-sheet", name: "Read sheet", type: "n8n-nodes-base.googleSheets", typeVersion: 4.5, position: [260, 100],
      // Attach your Google Sheets credential in n8n. No credential id is stored here.
    },
    { parameters: { operation: "executeQuery", query: CURRENT_SQL, options: {} }, id: "w2-current", name: "Current dataset", type: "n8n-nodes-base.postgres", typeVersion: 2.5, position: [520, 100], credentials: pg, alwaysOutputData: true },
    { parameters: { jsCode: readFileSync(new URL("src/w2-validate.js", here), "utf8") }, id: "w2-validate", name: "Validate dataset", type: "n8n-nodes-base.code", typeVersion: 2, position: [780, 100] },
    { parameters: { conditions: { options: { caseSensitive: true, typeValidation: "strict" }, combinator: "and", conditions: [
      { id: "c1", leftValue: "={{ $json.ok }}", rightValue: true, operator: { type: "boolean", operation: "equals" } },
      { id: "c2", leftValue: "={{ $json.changes }}", rightValue: 0, operator: { type: "number", operation: "gt" } } ] } }, id: "w2-if", name: "Valid and changed?", type: "n8n-nodes-base.if", typeVersion: 2.2, position: [1040, 100] },
    {
      parameters: { operation: "executeQuery", query: INSERT_SQL, options: { queryReplacement: "={{ [$json.version, JSON.stringify($json.rows)] }}" } },
      id: "w2-insert", name: "Insert new version", type: "n8n-nodes-base.postgres", typeVersion: 2.5, position: [1300, 0], credentials: pg,
      // Off until one test run has been checked by hand in the test table.
      disabled: true,
    },
    { parameters: {}, id: "w2-notify", name: "Send diff to team (wire a mail node)", type: "n8n-nodes-base.noOp", typeVersion: 1, position: [1560, 0] },
    { parameters: {}, id: "w2-stop", name: "Nothing to publish (see errors)", type: "n8n-nodes-base.noOp", typeVersion: 1, position: [1300, 220] },
  ],
  connections: {
    "Run by hand": { main: [[{ node: "Read sheet", type: "main", index: 0 }]] },
    Daily: { main: [[{ node: "Read sheet", type: "main", index: 0 }]] },
    "Read sheet": { main: [[{ node: "Current dataset", type: "main", index: 0 }]] },
    "Current dataset": { main: [[{ node: "Validate dataset", type: "main", index: 0 }]] },
    "Validate dataset": { main: [[{ node: "Valid and changed?", type: "main", index: 0 }]] },
    "Valid and changed?": { main: [[{ node: "Insert new version", type: "main", index: 0 }], [{ node: "Nothing to publish (see errors)", type: "main", index: 0 }]] },
    "Insert new version": { main: [[{ node: "Send diff to team (wire a mail node)", type: "main", index: 0 }]] },
  },
};
writeFileSync(new URL("w2-dataset-publish.workflow.json", here), JSON.stringify(wf, null, 2) + "\n");
