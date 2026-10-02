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
