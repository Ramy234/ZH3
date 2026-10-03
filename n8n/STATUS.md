# n8n status, 3 October 2026

Workspace: https://hsg-consultancy-project.app.n8n.cloud (Martin's personal project). **Nothing below is published.** Every workflow is
inactive, every schedule is switched off, every database write starts off, and a test table comes before any real table.

## What exists

| File | What it does | Writes | State |
|---|---|---|---|
| `bev-navigator.workflow.json` and `ZurichProjectFristDraft.live-export.json` | The first draft, kept in sync with Martin's live copy (`node n8n/build.mjs --check`). | `bev_sessions_test` | Inactive. Left untouched on purpose. |
| `w1-session-ingest.workflow.json` | Session intake with the app's current closed fields (charging check, next move and outcome, gap codes, canton, settlement, tenure). Refuses a postcode. A test fails if its stored keys drift from `saveSession`. | `bev_sessions_test` | Insert off. The app does not post here yet; it saves through its own server and Supabase. |
| `w2-dataset-publish.workflow.json` | Sheet to dataset: validates a Google Sheet and prepares an insert-only dataset version. | none until approved | Inactive. Template: `n8n/sheet/bev-dataset-template.csv` (regenerated from the dataset, with a test that fails if it goes stale). |
| `w3-reference-refresh.workflow.json` | ElCom, BFE and BFS reference figures. Never changes the dataset. | `bev_reference_test` | Insert off, schedule off, **job switch** `reference-refresh`. |
| `w4-source-freshness.workflow.json` | Fetches each source page once and notes if it is gone or changed. | `bev_source_checks_test` | Insert off, schedule off, **job switch** `source-freshness`. |
| `w5-analytics-digest.workflow.json` | Counts only; cells under 5 hidden. Now also lists gap codes, what people did with the next move, and the own-words box acceptance. | none | Mail node is a placeholder, schedule off, **job switch** `analytics-digest`. |
| `w6-words-classifier.workflow.json` | Own-words box, rules only, no AI. | none | Inactive. |
| `w7-words-classifier-jev.workflow.json` | Same box with Jev as the AI step. Scrub, rules, closed lists, confidence gates, injection check. Returns closed names only. | none | AI flag off, no credential. |
| `w8-picture-test-jev.workflow.json` | Bench: can a picture be sorted into a closed list (picture, then a vision model's two-sentence description, then Jev)? Test pictures only. | none | Run by hand only; both outside steps off. Not for Zurich deck material (Restricted, NDA). |

## Weekly checks are off, and how to turn one on

The three scheduled workflows read their own row in `bev_jobs` before they do anything. All three rows are registered `enabled = false`
(migration 0026). Running a workflow **by hand** skips that switch, because pressing the button is the switch.

To turn a check on later: (1) one update, `update bev_jobs set enabled = true where id = 'source-freshness';`
(2) in n8n, switch on that workflow's schedule node, switch on its "Log run" node, and activate the workflow.
To see what ran: `select * from bev_job_status;`. A run writes one short line to `bev_job_runs`.

## Import order (when you are ready; none of it is needed for the live app)

1. Apply migrations (Vercel's build does it). 2. Import W7, then W6 only if you want rules-only. 3. Import W3, W4, W5 and run each **by hand once**.
4. Import W1 only when the app should post to n8n. 5. W8 only for a lab session.

## Trying Jev (the AI step of the own-words box)

On your Mac, in Terminal inside the project folder (the key is typed into the command and is not saved to any file):

    node scripts/jev-smoke.mjs --dry                      # shows what would be sent, sends nothing
    node scripts/jev-smoke.mjs --rules                    # accuracy of the keyword rules alone
    JEV_API_KEY=your-key node scripts/jev-smoke.mjs       # the real test on the 37 + fixed sentences

It writes a counts-only report to `n8n/eval/last-smoke-*.json` (git-ignored). Read it before switching anything on. German and French sentences
are in the set, and their accuracy is not known until you run it. The keyword rules were written after the sentences were seen, so their
score is optimistic; Jev's score is the one that tells you something.

## Database (Supabase ZH3, project ref `xijjuxkqhahkotgmjlqv`)

Migrations 0001 to 0028 are in `migrations/`. The Vercel build runs them. 0026 adds `bev_classifier_log` (closed fields only, no text), `bev_classifier_stats`,
`bev_jobs`, `bev_job_runs`, `bev_job_status`. Row-level security is on for every table.

## Still open

- A stray test table `bev_sessions_test` in the older Supabase project behind "Postgres_account_martin_leu": drop it with `drop table public.bev_sessions_test;`.
- W3's ElCom and BFE endpoints could not be called from the build sandbox: run each branch by hand once.
- The BFS petrol and diesel branch is idle until the current XLSX link is pasted in "BFS file URL".
