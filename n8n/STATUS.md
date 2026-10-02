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
