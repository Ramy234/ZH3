// Builds bev-navigator.workflow.json from the node sources in ./src. It mirrors the live n8n workflow
// "ZurichProjectFristDraft" (export: ZurichProjectFristDraft.live-export.json).
//   node n8n/build.mjs            write bev-navigator.workflow.json
//   node n8n/build.mjs --check    compare node code/params with the live export, exit 1 on drift
//   BEV_TABLE=bev_sessions node n8n/build.mjs   build for the real table (default: bev_sessions_test)
import { readFileSync, writeFileSync } from "node:fs";
const here = new URL(".", import.meta.url);
const code = (f) => readFileSync(new URL(`src/${f}`, here), "utf8");
const TABLE = process.env.BEV_TABLE || "bev_sessions_test";
if (!/^bev_sessions(_test)?$/.test(TABLE)) throw new Error("BEV_TABLE must be bev_sessions or bev_sessions_test");
export const INSERT_SQL = `insert into ${TABLE} (id, client_session, stage, payload) values (gen_random_uuid()::text, $1, $2, $3) returning id`;
const NOTE = readFileSync(new URL("src/read-first.md", here), "utf8");
const wf = {
  name: "ZurichProjectFristDraft",
  active: false,
  settings: { executionOrder: "v1" },
  nodes: [
    {
      parameters: {
        content: NOTE,
        height: 400,
        width: 460,
      },
      id: "note",
      name: "Read first",
      type: "n8n-nodes-base.stickyNote",
      typeVersion: 1,
      position: [-40, -380],
    },
    {
      parameters: { httpMethod: "POST", path: "bev-session", options: {} }, // responds when received (n8n default)
      id: "a1-webhook",
      name: "Form trigger",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [0, 0],
      webhookId: "bev-session",
    },
    { parameters: { jsCode: code("typesafe-choice.js") }, id: "a2-check", name: "TypeSafe choice", type: "n8n-nodes-base.code", typeVersion: 2, position: [280, 0] },
    { parameters: { jsCode: code("code-price.js") }, id: "a3-price", name: "Code", type: "n8n-nodes-base.code", typeVersion: 2, position: [560, 0] },
    { parameters: { jsCode: code("switch-toggles.js") }, id: "a4-switch", name: "Switch", type: "n8n-nodes-base.code", typeVersion: 2, position: [840, 0] },
    { parameters: {}, id: "t1-manual", name: "Test by hand", type: "n8n-nodes-base.manualTrigger", typeVersion: 1, position: [0, 260] },
    { parameters: { jsCode: code("sample-session.js") }, id: "t2-sample", name: "Sample session", type: "n8n-nodes-base.code", typeVersion: 2, position: [220, 260] },
    {
      parameters: {
        operation: "executeQuery",
        query: INSERT_SQL,
        options: {
          // An array, not a comma-separated string: the JSON payload contains commas.
          queryReplacement: "={{ [$json.clientSession, $json.stage, JSON.stringify($json.payload)] }}",
        },
      },
      id: "a5-postgres",
      name: "Postgres",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.5,
      position: [1120, 0],
      credentials: { postgres: { id: "Tj1nxebs0zLxWTBj", name: "bev Postgres" } },
      // Off until the app posts here. Switch on only for a test run, then off again.
      disabled: true,
    },
  ],
  connections: {
    "Form trigger": { main: [[{ node: "TypeSafe choice", type: "main", index: 0 }]] },
    "TypeSafe choice": { main: [[{ node: "Code", type: "main", index: 0 }]] },
    Code: { main: [[{ node: "Switch", type: "main", index: 0 }]] },
    Switch: { main: [[{ node: "Postgres", type: "main", index: 0 }]] },
    "Test by hand": { main: [[{ node: "Sample session", type: "main", index: 0 }]] },
    "Sample session": { main: [[{ node: "TypeSafe choice", type: "main", index: 0 }]] },
  },
};
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  if (process.argv.includes("--check")) {
    const live = JSON.parse(readFileSync(new URL("ZurichProjectFristDraft.live-export.json", here), "utf8"));
    const drift = [];
    for (const n of wf.nodes) {
      const l = live.nodes.find((x) => x.name === n.name);
      if (!l) { drift.push(`missing in n8n: ${n.name}`); continue; }
      if (JSON.stringify(n.parameters) !== JSON.stringify(l.parameters)) drift.push(`parameters differ: ${n.name}`);
      if (Boolean(n.disabled) !== Boolean(l.disabled)) drift.push(`on/off differs: ${n.name}`);
      if (JSON.stringify(n.credentials ?? null) !== JSON.stringify(l.credentials ?? null)) drift.push(`credential differs: ${n.name}`);
    }
    for (const l of live.nodes) if (!wf.nodes.find((n) => n.name === l.name)) drift.push(`only in n8n: ${l.name}`);
    if (JSON.stringify(wf.connections) !== JSON.stringify(live.connections)) drift.push("connections differ");
    console.log(drift.length ? drift.join("\n") : "in sync with the live export");
    process.exit(drift.length ? 1 : 0);
  }
  writeFileSync(new URL("bev-navigator.workflow.json", here), JSON.stringify(wf, null, 2) + "\n");
  console.log(`written (table ${TABLE})`);
}
export default wf;
