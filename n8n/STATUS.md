# n8n status, 2 October 2026

The workspace is https://hsg-consultancy-project.app.n8n.cloud and the project is Martin's personal project. Move the workflow to "Project Zurich Insurance" when the team should see it.

| Item | State |
|---|---|
| Workflow | "ZurichProjectFristDraft" (id `01ebguVsWaalZaJY`). The same nodes as `bev-navigator.workflow.json`, plus a "Test by hand" path. **Not published** (inactive). |
| Postgres step | Credential "bev Postgres". Switched **off** after the test. It targets `bev_sessions_test`, both in n8n and in this repo. |
| Sync | `ZurichProjectFristDraft.live-export.json` is Martin's export from n8n. `node n8n/build.mjs --check` confirms that the repo's node code, parameters, credential, on/off state and connections match it. It was in sync on 2 Oct 2026. To build for the real table, use `BEV_TABLE=bev_sessions node n8n/build.mjs`, then import that file or paste it into n8n. |
| Database | Supabase project **ZH3**, project ref `xijjuxkqhahkotgmjlqv`, session pooler `aws-1-eu-central-1.pooler.supabase.com:5432`. Table `bev_sessions_test` has row-level security on. |
| Credential | "bev Postgres": SSL require, "Ignore SSL Issues" on (Supabase pooler certificate). The password is entered by Martin only. |
| Test | Execution 926 inserted one row. Execution 927 read it back: 1 row, `stage = final`, `annualSwap = 2081`, `claimsOpened = ["battery"]`. The junk that was sent (postcode, sentence, script tag) is **not** stored. |
| Cleanup | A stray empty table, `bev_sessions_test`, with one test row was created by mistake in the older Supabase project behind "Postgres_account_martin_leu". Martin to drop it: `drop table public.bev_sessions_test;` |

**Next steps:**

1. Create `bev_sessions` in ZH3, with the same columns and row-level security on.
2. Change the table name in the Postgres step.
3. Let the app post to `/webhook/bev-session`, keeping a fallback to `saveSession`.
4. Run a test from the app.
5. Publish.

## Step 3 files (3 Oct 2026). All inactive; nothing is imported into n8n yet.

| File | What | Writes to | State |
|---|---|---|---|
| `w1-session-ingest.workflow.json` | The live draft's checks plus 200 / 400 / 502 replies, so the app can fall back when n8n did not store a session. | `bev_sessions_test` | Insert step off. Add a Header Auth credential before publishing. |
| `w3-reference-refresh.workflow.json` | ElCom canton means (this year and next), BFE charging points per postcode, BFS pump prices. | `bev_reference_test` | Insert off. The BFS branch is idle until the current XLSX URL is pasted. ElCom and BFE endpoints could not be called from the build sandbox, so run each branch by hand once. |
| `w4-source-freshness.workflow.json` | Fetches each stored source URL weekly and records status and a text hash. | `bev_source_checks_test` | Insert off. Mail node is a placeholder. |
| `w5-analytics-digest.workflow.json` | Counts from the flat view; cells under 5 hidden; sample sessions excluded. | nothing (reads) | Mail node is a placeholder. |

Builders: `n8n/build-w1.mjs`, `build-w3.mjs`, `build-w4.mjs`, `build-w5.mjs`, sharing `n8n/lib/kit.mjs`. The closed value lists live in `n8n/lib/enums.mjs`; a test fails if W1's whitelist or the app's types drift from them. `scripts/n8n-workflows.test.mjs` runs every Code node and every SQL statement (PGlite).

| `w6-words-classifier.workflow.json` | Optional "say it in your own words" classifier. Rules answer; the AI step is off, with no credential. Keeps no execution data. | nothing | Needs Martin's decision before the AI step or the app box goes live. `node scripts/words-eval.mjs`. |

Database: migrations `0012` (reference, source checks, flat view over sessions, insert-only triggers, RLS) and `0013` (test copies). Not applied to Supabase ZH3 yet.
