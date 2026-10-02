// Builds n8n/w1-session-ingest.workflow.json (inactive): the live draft's checks, plus 200/400/502 replies for the app's fallback.
// The live draft (n8n/build.mjs, kept in sync with ZurichProjectFristDraft) is left untouched.
//   node n8n/build-w1.mjs
//   BEV_TABLE=bev_sessions node n8n/build-w1.mjs   only after a test insert succeeded
import { writeFileSync } from "node:fs";
import { code, node, note, postgres, src, pickTable, workflow } from "./lib/kit.mjs";

export const TABLE = pickTable(process.env.BEV_TABLE, "bev_sessions", "bev_sessions_test");
export const INSERT_SQL = `insert into ${TABLE} (id, client_session, stage, payload) values (gen_random_uuid()::text, $1, $2, $3) returning id`;
const reply = (name, position, status, body) =>
  node(name, "respondToWebhook", 1.1, position, { respondWith: "json", responseBody: body, options: { responseCode: status } });
const guarded = { onError: "continueErrorOutput" };

export const wf = workflow(
  "W1 BEV session ingest",
  [
    note(src("w1-read-first.md"), [-40, -440], 480, 380),
    node("Webhook", "webhook", 2, [0, 0], { httpMethod: "POST", path: "bev-session", responseMode: "responseNode", options: {} }, { webhookId: "bev-session-w1" }),
    node("Test by hand", "manualTrigger", 1, [0, 220]),
    code("Sample session", src("sample-session.js"), [240, 220]),
    code("TypeSafe choice", src("typesafe-choice.js"), [260, 0], guarded),
    code("Code", src("code-price.js"), [500, 0], guarded),
    code("Switch", src("switch-toggles.js"), [740, 0], guarded),
    postgres("Insert session", INSERT_SQL, [980, 0], { replacement: "={{ [$json.clientSession, $json.stage, JSON.stringify($json.payload)] }}", off: true }),
    reply("Reply 200", [1220, -60], 200, '={{ JSON.stringify({ ok: true }) }}'),
    reply("Reply 400", [740, 240], 400, '={{ JSON.stringify({ ok: false, error: "rejected" }) }}'),
    reply("Reply 502", [1220, 120], 502, '={{ JSON.stringify({ ok: false, error: "not stored" }) }}'),
  ],
  [
    ["Webhook", "TypeSafe choice"], ["Test by hand", "Sample session"], ["Sample session", "TypeSafe choice"],
    ["TypeSafe choice", "Code"], ["TypeSafe choice", "Reply 400", 1],
    ["Code", "Switch"], ["Code", "Reply 400", 1],
    ["Switch", "Insert session"], ["Switch", "Reply 400", 1],
    ["Insert session", "Reply 200"], ["Insert session", "Reply 502", 1],
  ],
);
if (import.meta.url === `file://${process.argv[1]}`) writeFileSync(new URL("w1-session-ingest.workflow.json", import.meta.url), JSON.stringify(wf, null, 2) + "\n");
