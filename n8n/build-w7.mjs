// Builds n8n/w7-words-classifier-jev.workflow.json (inactive). The AI call is off until the flag in "AI flag" is set.
//   node n8n/build-w7.mjs
import { writeFileSync } from "node:fs";
import { code, node, note, src, wire, workflow } from "./lib/kit.mjs";
import { w7src } from "./lib/w7-source.mjs";

const reply = (name, position, status, body) =>
  node(name, "respondToWebhook", 1.1, position, { respondWith: "json", responseBody: body, options: { responseCode: status } });
const guarded = { onError: "continueErrorOutput" };

const wf = workflow(
  "W7 BEV words classifier (Jev, AI off)",
  [
    note(w7src("w7-read-first.md"), [-40, -420], 560, 360),
    node("Webhook", "webhook", 2, [0, 0], { httpMethod: "POST", path: "bev-words-jev", responseMode: "responseNode", options: {} }, { webhookId: "bev-words-w7" }),
    code("Check input", src("w6-input.js"), [240, 0], guarded),
    code("Scrub", w7src("w7-scrub.js"), [480, 0], guarded),
    code("Rules", src("w6-rules.js"), [720, 0], guarded),
    code("Build request", w7src("w7-build.js"), [960, 0], guarded),
    code("AI flag", src("w7-flag.js"), [1200, 0], guarded),
    node("AI on?", "if", 2.2, [1440, 0], {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict" },
        conditions: [{ id: "ai-flag", leftValue: "={{ $json.ai }}", rightValue: "", operator: { type: "boolean", operation: "true", singleValue: true } }],
        combinator: "and",
      },
      options: {},
    }),
    node(
      "Jev",
      "httpRequest",
      4.2,
      [1680, -120],
      {
        method: "POST",
        url: "https://api.typesafe.ai/v1/systemone",
        authentication: "genericCredentialType",
        genericAuthType: "httpHeaderAuth",
        sendBody: true,
        specifyBody: "json",
        jsonBody: "={{ JSON.stringify($json.request) }}",
        options: { timeout: 12000 },
      },
      { retryOnFail: true, maxTries: 2, waitBetweenTries: 800, onError: "continueRegularOutput" },
    ),
    code("Decide", w7src("w7-decide.js"), [1920, 0], guarded),
    reply("Reply 200", [2160, 0], 200, "={{ JSON.stringify($json) }}"),
    reply("Reply 400", [720, 240], 400, '={{ JSON.stringify({ ok: false, error: "rejected" }) }}'),
  ],
  [
    ["Webhook", "Check input"], ["Check input", "Scrub"], ["Check input", "Reply 400", 1],
    ["Scrub", "Rules"], ["Scrub", "Reply 400", 1],
    ["Rules", "Build request"], ["Rules", "Reply 400", 1],
    ["Build request", "AI flag"], ["Build request", "Reply 400", 1],
    ["AI flag", "AI on?"], ["AI flag", "Reply 400", 1],
    ["AI on?", "Jev"], ["AI on?", "Decide", 1],
    ["Jev", "Decide"],
    ["Decide", "Reply 200"], ["Decide", "Reply 400", 1],
  ],
);
// Neither successful nor failed runs may keep the text. Manual runs are not saved either.
wf.settings.saveDataErrorExecution = "none";
wf.settings.saveManualExecutions = false;
wf.settings.saveExecutionProgress = false;
export { wf };
if (import.meta.url === `file://${process.argv[1]}`) writeFileSync(new URL("w7-words-classifier-jev.workflow.json", import.meta.url), JSON.stringify(wf, null, 2) + "\n");
