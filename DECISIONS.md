# Departures from the brief

- Branch is `claude/handover-step-0-t24lvd`, not `redesign-2026-10`. The session environment fixes the branch name.
- n8n is handled through JSON files in `n8n/`, not the REST API (Martin, 2 Oct 2026). No `N8N_API_KEY` needed for now.
- `DATABASE_URL` is deferred; the app stays on PGLite until Martin adds it to `.env.local`.
- Golden tests pin the current model output (characterisation), not independently derived values. Re-pin deliberately and bump `MODEL` when the arithmetic changes.
- The 9 Grok-script tests that failed on arrival are fixed: `grok-pwa-plugin.test.mjs` now runs in an empty temp cwd (it read this app's `site.json` and `og.jpg`), and the migration test no longer expects `migrations/` to hold only `auth/`. `npm test` is green end to end (197 + 86).
- Step 2 dataset scope: `bev_dataset` holds `RATES`, `SPECS` and `PUMP` from `model.ts` (70 rows, all `placeholder` except `rate.horizon`, `sourced` from the federal study). Not yet in the dataset: persona km, TCS canton tax table, persona weights (`bev_rules_version`, later). Reason: weights must not be retuned, and tax is a yearly manual update.
- `bev_dataset` is insert-only (trigger), and a non-placeholder row must carry publisher, date and url (check constraint). The seed migration `0010` is generated from `model.ts` by `scripts/gen-dataset-seed.mjs`; a test fails if it drifts.
- Dataset versions are named `v-YYYY-MM-DD-hhmm` (lowercase, to pass the existing n8n `dataset` pattern). The seed version stays `placeholder-2026-10-02`.
- W2 is a JSON file (`n8n/w2-dataset-publish.workflow.json`), inactive, targeting `bev_dataset_test`. The Google Sheets credential is not stored; Martin attaches it in n8n.
- Google Sheet "BEV dataset" was created in the connected Drive from `n8n/sheet/bev-dataset-template.csv`.
- Step 3: W1 v2, W3, W4, W5 are JSON files built from `n8n/build-w*.mjs`; the live-synced draft (`build.mjs`) is untouched. Shared shape lives in `n8n/lib/`.
- Stored sessions are read through the view `bev_sessions_flat` (migration 0012). No other code parses the payload text. The ending is derived from `paybackYears <= 8`, not from `withinHorizon`.
- BFE charging data has postcodes, not cantons, so `bev_reference` holds counts per postcode (one JSON text row per refresh). The app does not read it yet.
- BFS pump-price file: layout not confirmed; the parser refuses to guess, and the branch stays idle until a URL is pasted.
- Not done: cohort in the digest (the app sends none yet), a mail node for W2/W4/W5 (placeholders), the 3-layer redesign.

## 3 October 2026: cohort, actions, words box, ordinary week

- Hybrid pump price: a hybrid pays the petrol litre price. The `PUMP.hybrid` cell is kept at 1.79 only so the sheet row exists. `pumpFor()` is the one place that decides. MODEL `2026-10-03-r3`; the hybrid SUV golden was re-pinned deliberately (keep 4844, swap 3697, saving 1147).
- Winter range fact corrected to 79 % of non-buyers, with the commissioner named. Migration 0014 updates the stored fact (apply after 0010 and the facts table exist).
- Battery sizes (kWh per class: 40, 58, 66, 77, 75) are placeholders in `SPECS`/the dataset. The ordinary-week strip uses them. Martin or the team confirm them in the sheet.
- Cohort code: `?s=i1` in the link, letters then one or two digits, stored as `cohort`. It names a sitting, never a person. Anything else is dropped.
- Actions: a closed list of six things done on the result page (`ACTIONS`), stored as a set. No timing, no order, no text.
- W1 has its own whitelist copy (`n8n/src/w1-typesafe-choice.js`) and sample (`w1-sample-session.js`) so the live draft's files stay identical to Martin's export (`node n8n/build.mjs --check`).
- `bev_sessions_flat` now returns one row per client session and stage (the latest). The app saves again whenever the result page changes and the table is insert-only, so counting raw rows would have counted people several times (W5 included). New columns: cohort, actions, barrier_via, list_price, resale_price.
- `/sittings` is internal: off unless `SITTINGS_KEY` is set on the server, key sent in the request body, counts only, cells under 5 hidden, `noindex`. The checklist ticks stay in the browser.
- W6 (words classifier) is built, inactive, with the AI step off (`ai = false` in "AI flag", AI nodes disabled, no credential). The rules answer alone. The app box appears only with `WORDS_BOX=on` and `WORDS_URL`. The text is never stored (no table, no execution data, not in the reply), and only `barrierVia: "words"` is kept, after the person confirms by tap. Evaluation: `node scripts/words-eval.mjs`, 49 synthetic sentences, rules 82 % overall and 100 % when confident (optimistic: same author). Martin decides whether it goes live.
- Short step transition (180 ms, off for reduced motion).
