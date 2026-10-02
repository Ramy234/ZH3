// Builds n8n/w4-source-freshness.workflow.json (inactive), targeting bev_source_checks_test.
//   node n8n/build-w4.mjs
//   BEV_CHECKS_TABLE=bev_source_checks node n8n/build-w4.mjs   only after a test insert succeeded
import { writeFileSync } from "node:fs";
import { code, node, noop, note, postgres, src, pickTable, workflow } from "./lib/kit.mjs";

export const TABLE = pickTable(process.env.BEV_CHECKS_TABLE, "bev_source_checks", "bev_source_checks_test");
export const URLS_SQL = `select 'bev_facts' as origin, key as origin_key, url from bev_facts where url is not null and url <> ''
union all
select 'bev_dataset', key, source_url from bev_dataset where source_url is not null and dataset_version = (select dataset_version from bev_dataset order by valid_from desc, dataset_version desc limit 1)`;
export const PREVIOUS_SQL = `select distinct on (url) url, content_hash from ${TABLE} order by url, checked_at desc, id desc`;
export const INSERT_SQL = `insert into ${TABLE} (origin, origin_key, url, http_status, content_hash, changed, error) select x.origin, x.origin_key, x.url, x.http_status, x.content_hash, x.changed, x.error from json_to_recordset($1::json) as x(origin text, origin_key text, url text, http_status integer, content_hash text, changed boolean, error text) returning id`;

export const wf = workflow(
  "W4 BEV source freshness",
  [
    note(src("w4-read-first.md"), [-40, -420]),
    node("Run by hand", "manualTrigger", 1, [0, 0]),
    node("Weekly", "scheduleTrigger", 1.2, [0, 200], { rule: { interval: [{ field: "weeks", weeksInterval: 1 }] } }, { disabled: true }),
    postgres("URLs to check", URLS_SQL, [260, 100], { always: true }),
    postgres("Previous checks", PREVIOUS_SQL, [500, 100], { always: true }),
    code("Unique URLs", src("w4-urls.js"), [740, 100]),
    node("Fetch page", "httpRequest", 4.2, [980, 100], {
      method: "GET", url: "={{ $json.url }}", sendHeaders: true, specifyHeaders: "keypair",
      headerParameters: { parameters: [{ name: "User-Agent", value: "BEV-Navigator-source-check (HSG student project; contact via project team)" }] },
      options: { timeout: 20000, batching: { batch: { batchSize: 1, batchInterval: 1500 } }, redirect: { redirect: { maxRedirects: 5 } }, response: { response: { fullResponse: true, neverError: true, responseFormat: "text" } } },
    }, { onError: "continueRegularOutput" }),
    code("Compare", src("w4-compare.js"), [1220, 100]),
    postgres("Insert checks", INSERT_SQL, [1460, 0], { replacement: "={{ [JSON.stringify($json.rows)] }}", off: true }),
    noop("Send list to team (wire a mail node)", [1460, 200]),
  ],
  [
    ["Run by hand", "URLs to check"], ["Weekly", "URLs to check"], ["URLs to check", "Previous checks"], ["Previous checks", "Unique URLs"],
    ["Unique URLs", "Fetch page"], ["Fetch page", "Compare"], ["Compare", "Insert checks"], ["Compare", "Send list to team (wire a mail node)"],
  ],
);
if (import.meta.url === `file://${process.argv[1]}`) writeFileSync(new URL("w4-source-freshness.workflow.json", import.meta.url), JSON.stringify(wf, null, 2) + "\n");
