// Builds n8n/w5-analytics-digest.workflow.json (inactive). Reads only; nothing to point at a real table.
//   node n8n/build-w5.mjs
import { writeFileSync } from "node:fs";
import { code, jobGate, jobLog, node, noop, note, postgres, src, workflow } from "./lib/kit.mjs";
import { DIGEST_SQL } from "./lib/w5-sql.mjs";

export const wf = workflow(
  "W5 BEV analytics digest",
  [
    note(src("w5-read-first.md"), [-40, -420]),
    node("Run by hand", "manualTrigger", 1, [0, 0]),
    node("Weekly", "scheduleTrigger", 1.2, [0, 200], { rule: { interval: [{ field: "weeks", weeksInterval: 1 }] } }, { disabled: true }),
    jobGate("Job switch", "analytics-digest", [130, 200]),
    postgres("Counts", DIGEST_SQL, [280, 100]),
    code("Digest", src("w5-digest.js"), [540, 100]),
    noop("Send digest to team (wire a mail node)", [800, 100]),
    jobLog("Log run", "analytics-digest", [1040, 100]),
  ],
  [["Run by hand", "Counts"], ["Weekly", "Job switch"], ["Job switch", "Counts"], ["Counts", "Digest"], ["Digest", "Send digest to team (wire a mail node)"], ["Digest", "Log run"]],
);
if (import.meta.url === `file://${process.argv[1]}`) writeFileSync(new URL("w5-analytics-digest.workflow.json", import.meta.url), JSON.stringify(wf, null, 2) + "\n");
