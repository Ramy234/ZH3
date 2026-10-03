// Builds n8n/w6-words-classifier.workflow.json (inactive). Optional experiment, AI step off.
//   node n8n/build-w6.mjs
import { writeFileSync } from "node:fs";
import { code, node, note, src, wire, workflow } from "./lib/kit.mjs";

export const BARRIER_NAMES = ["charging", "cost", "trips", "trust", "unsure", "none"];
const reply = (name, position, status, body) =>
  node(name, "respondToWebhook", 1.1, position, { respondWith: "json", responseBody: body, options: { responseCode: status } });
const guarded = { onError: "continueErrorOutput" };

const DESCRIBE = [
  "Pick the one barrier that best matches what the person wrote about switching to an electric car.",
  "charging: nowhere to charge at home (rented flat, shared garage, no bay, landlord).",
  "cost: the price, financing, or resale value.",
  "trips: range on long trips, holidays, towing.",
  "trust: battery life, winter, reliability, new technology, used cars.",
  "unsure: the person says they do not know, or several barriers fit equally.",
  "none: the text is not about this.",
  "Give a confidence from 0 to 1. Return only the fields asked for. Do not give advice.",
].join(" ");

const wf = workflow(
  "W6 BEV words classifier (optional, AI off)",
  [
    note(src("w6-read-first.md"), [-40, -380], 520, 300),
    node("Webhook", "webhook", 2, [0, 0], { httpMethod: "POST", path: "bev-words", responseMode: "responseNode", options: {} }, { webhookId: "bev-words-w6" }),
    code("Check input", src("w6-input.js"), [240, 0], guarded),
    code("Rules", src("w6-rules.js"), [480, 0], guarded),
    code("AI flag", src("w6-flag.js"), [720, 0], guarded),
    node("AI on?", "if", 2.2, [960, 0], {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict" },
        conditions: [{ id: "ai-flag", leftValue: "={{ $json.ai }}", rightValue: "", operator: { type: "boolean", operation: "true", singleValue: true } }],
        combinator: "and",
      },
      options: {},
    }),
    {
      parameters: {
        text: "={{ $json.words }}",
        attributes: {
          attributes: [
            { name: "barrier", type: "string", description: `One of: ${BARRIER_NAMES.join(", ")}`, required: true },
            { name: "confidence", type: "number", description: "From 0 to 1", required: true },
          ],
        },
        options: { systemPromptTemplate: DESCRIBE },
      },
      id: "extract-barrier",
      name: "Extract barrier",
      type: "@n8n/n8n-nodes-langchain.informationExtractor",
      typeVersion: 1.2,
      position: [1200, -120],
      disabled: true,
      onError: "continueRegularOutput",
    },
    {
      parameters: { model: { __rl: true, mode: "list", value: "claude-sonnet-4-5" }, options: { temperature: 0 } },
      id: "chat-model",
      name: "Chat model",
      type: "@n8n/n8n-nodes-langchain.lmChatAnthropic",
      typeVersion: 1.3,
      position: [1200, 120],
      disabled: true,
    },
    code("Decide", src("w6-decide.js"), [1440, 0], guarded),
    reply("Reply 200", [1680, 0], 200, "={{ JSON.stringify($json) }}"),
    reply("Reply 400", [480, 240], 400, '={{ JSON.stringify({ ok: false, error: "rejected" }) }}'),
  ],
  [
    ["Webhook", "Check input"], ["Check input", "Rules"], ["Check input", "Reply 400", 1],
    ["Rules", "AI flag"], ["Rules", "Reply 400", 1],
    ["AI flag", "AI on?"], ["AI flag", "Reply 400", 1],
    ["AI on?", "Extract barrier"], ["AI on?", "Decide", 1],
    ["Extract barrier", "Decide"],
    ["Decide", "Reply 200"], ["Decide", "Reply 400", 1],
  ],
);
// Neither successful nor failed runs may keep the text. Manual runs are not saved either.
wf.settings.saveDataErrorExecution = "none";
wf.settings.saveManualExecutions = false;
wf.settings.saveExecutionProgress = false;
wf.connections["Chat model"] = { ai_languageModel: [[{ node: "Extract barrier", type: "ai_languageModel", index: 0 }]] };
export { wf };
if (import.meta.url === `file://${process.argv[1]}`) writeFileSync(new URL("w6-words-classifier.workflow.json", import.meta.url), JSON.stringify(wf, null, 2) + "\n");
