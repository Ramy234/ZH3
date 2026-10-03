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

## 3 October 2026 (later): current Swiss figures, desktop layout, transparency

- **Data version `v-2026-10-03-0001`, MODEL `2026-10-03-r4`.** Migration `0015_bev_dataset_v2026_10_03.sql` (generated by `scripts/gen-dataset-seed.mjs`) adds a new version, because 0010 is applied and insert-only. Four rows now carry a named source: petrol 2.14 and diesel 2.46 francs (TCS, 19 Sep 2026), home electricity 26.5 rappen (ElCom median 2027 via the Federal Council, 8 Sep 2026), plus the existing eight-year window. Public charging 59 rappen and plan 51 rappen follow the TCS averages 2026 but stay `placeholder`: the TCS page is undated, so the row cannot satisfy the "publisher + date + url" rule.
- **Spot price caveat.** The TCS pump price is one day, close to the year's high (petrol about 1.77 in late February). It moves verdicts towards switching. The tornado shows the effect (pump price ±15 %), the number sheet and `/method` state the date. W3 (BFS monthly average) is the planned replacement. Martin decides whether a spot price stays the default.
- Sample case moved from year 18 to year 14, hybrid SUV from 39 to 30. Goldens re-pinned; counterfactual and share tests now set a low pump price temporarily with `applyDataset` in `try/finally`.
- Migration `0016_public_tariff_fact.sql` rewrites the `public-tariff` fact with the TCS figures.
- **Desktop.** No phone frame at 1024 px and up: top bar, a left panel with the answers so far and the battery progress, and a wide card. The result is a two-column page (dark verdict panel, then chart and detail). Phones keep the single column. `scripts/overflow-check.mjs` now also walks 1280 px.
- **Visual language.** Cool white page, one dark spruce panel, one lime accent. Battery-cell progress (one cell per question), an icon on each answer, no streaks, points or rewards, and nothing that rewards switching.
- **How sure is this? (`sensitivity.ts`).** Moves one assumption at a time (pump ±15 %, home power ±25 %, public charging ±25 %, distance one band, electric car price ±10 %, resale ±25 %) and re-runs `evaluate()` through `withDataset`, which puts every number back. The "fast" and "slow" case move all of them together. The steps are our choice, not a measured spread. Not a forecast, no probability, no interactions.
- **Number sheets (`numbers.ts`).** Tap the yearly keep or switch cost, the extra money or the payback: the sum in words, the line-by-line francs the model already produced, and the dataset rows it read with status, publisher, date and link. Lookups only, no arithmetic of its own.
- **`/method` (public).** Five steps, every dataset row grouped, the "left out on purpose" list with the direction of each omission (`method.ts`). Read live from `bev_dataset`; falls back to the built-in seed.
- **Wording.** Plain everyday English, same interactive voice. Dropped "where the car sleeps", "not a Tuesday", "what stings", "cheque". Per-month figure added to the first verdict line. Structure is German-ready (copy still lives in code, to be lifted into a catalogue when German is done).
- The Google Sheet template in Drive is stale until Martin refreshes it from `n8n/sheet/bev-dataset-template.csv` (regenerated). W2 must not be switched on before that.
