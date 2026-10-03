// Builds n8n/w8-picture-test-jev.workflow.json (inactive, hand-run only, writes nothing).
//   node n8n/build-w8.mjs
import { writeFileSync } from "node:fs";
import { code, node, note, src, workflow } from "./lib/kit.mjs";

export const wf = workflow(
  "W8 BEV picture test (Jev, off)",
  [
    note(src("w8-read-first.md"), [-40, -440], 560, 400),
    node("Run by hand", "manualTrigger", 1, [0, 0]),
    code("Pick pictures", src("w8-pick.js"), [240, 0]),
    // The vision step is off and has no credential. Switch it on only for your own or public test pictures.
    node("Describe (vision model, off)", "httpRequest", 4.2, [480, 0], {
      method: "POST",
      url: "https://api.anthropic.com/v1/messages",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      sendHeaders: true,
      specifyHeaders: "keypair",
      headerParameters: { parameters: [{ name: "anthropic-version", value: "2023-06-01" }] },
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 200, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'url', url: $json.url } }, { type: 'text', text: 'Describe in two plain sentences only what is visible about parking and charging: the kind of place, whether a charging point can be seen. Do not describe people, number plates or addresses.' }] }] }) }}",
      options: { timeout: 30000 },
    }, { disabled: true, onError: "continueRegularOutput" }),
    code("Build request", src("w8-build.js"), [720, 0]),
    node("Jev (off)", "httpRequest", 4.2, [960, 0], {
      method: "POST", url: "https://api.typesafe.ai/v1/systemone", authentication: "genericCredentialType", genericAuthType: "httpHeaderAuth",
      sendBody: true, specifyBody: "json", jsonBody: "={{ JSON.stringify($json.request) }}", options: { timeout: 12000 },
    }, { disabled: true, onError: "continueRegularOutput" }),
    code("Tally", src("w8-decide.js"), [1200, 0]),
  ],
  [["Run by hand", "Pick pictures"], ["Pick pictures", "Describe (vision model, off)"], ["Describe (vision model, off)", "Build request"], ["Build request", "Jev (off)"], ["Jev (off)", "Tally"]],
);
wf.settings.saveDataErrorExecution = "none";
wf.settings.saveManualExecutions = false;
wf.settings.saveExecutionProgress = false;
if (import.meta.url === `file://${process.argv[1]}`) writeFileSync(new URL("w8-picture-test-jev.workflow.json", import.meta.url), JSON.stringify(wf, null, 2) + "\n");
