# Workshop notes (Roman and Achim) against the app, 3 October 2026

Status words: **Done** means it is in the app and covered by a test or a screen check. **Partly** says what is missing. **Not yet** says why.

| Note | Status | Where it is, and what is left |
|---|---|---|
| Barrier first. Start from what stops the person, not from the car. | Done | The first tap is the barrier (charging, cost, trips, trust, unsure). Everything after it is ordered by that answer. |
| Minimal typing. | Done | The journey is six taps. The only typing anywhere is an optional postcode (four digits) on the result page and the optional own-words box, which is closed until opened. `flow-check.mjs` asserts the start page has no text field. |
| AI supports the person and does not drive. | Done | AI may only sort one sentence into a closed list, with a confidence, and the person makes the final tap. No model writes the verdict, steps or sources. Hard rule in `CLAUDE.md`. |
| Rules and AI side by side. | Done | Keyword rules run on the device first (`words-rules.ts`), with a parity test against the n8n copy. The AI step is off by default and needs a visible tick plus a server flag. |
| A classifier "like Jev". | Done, not yet measured | W7 plus `scripts/jev-smoke.mjs` (`--dry`, `--rules`, or with the key). Jev's accuracy, and German and French accuracy in particular, is unknown until Martin runs it. |
| Stronger models first. | Partly | The request names the model in one place (`classifier-spec.json`), so a stronger one is a one-line change and the smoke test compares like with like. Which model to pick is not decided and needs the smoke numbers. |
| Personas from observed groups, not invented ones. | Partly | The app still shows six starting situations. How to replace them with observed groups, and the rule (at least 10 sittings, described by answers only), is in `CLOSE-THE-DOTS.md`. Needs real sittings before it can be built. |
| Approximate location only. | Done | Canton, settlement and own or rent are closed taps. The postcode is optional, asked only on the result page, matched to a municipality **on the device** with swisstopo's official table (the server gets only the municipality number and canton for the electricity price), stored apart from the answers for 12 months, shown outside the team only for groups of 10 or more. |
| Analytics anonymised and delayed. | Partly | Counts only, cells under 5 hidden internally and under 10 outside. The session id is pseudonymous, not anonymous, and the method note says so. "Delayed": there is no live view; the weekly digest (W5) is built but off. A "delete what is stored about this visit" button now exists. |
| n8n for the MVP. | Partly | Eight workflows are built and tested (W1 to W8). None is published, every database write starts off, and every weekly check sits behind a switch in `bev_jobs` (all off). The app still saves through its own server and Supabase; W1 can take over without a schema change. |
| MVP focus: barrier identification. | Done | Barrier tap, gap codes, optional words box. |
| MVP focus: charging. | Done | Charging set-up check on "My place" (three taps), shared-garage and mobile-charger sheets, tenant-right sheet, link to the building-owner page. |
| MVP focus: affordability. | Done | Monthly and yearly framing, two paybacks (what you save versus what you pay back), value-loss sheet, leasing sheet, used-car price ceiling for the "keep" ending. |
| MVP focus: used electric cars. | Done | Battery certificate sheet, used price ceiling, used-car lever. The certificate field list is in the decision file. |
| MVP focus: exceptional mobility (the few days a year a small car cannot do). | Done | The 2:1 idea sheet: days-per-year picture, an interactive "build your own" number, and a written question to ask. The 48-hour test-drive sheet. Rental days in the model. |
| Keep processing on the device. | Mostly done | The money model, the rules, the postcode match and the delete are on the device. Server contact: the electricity price (municipality number and canton), the final session save (closed bands), and the words box only after a tick. |

## What this table does not claim

It does not say the workshop's intent is met just because a feature exists. Three things need a person, not code: whether the six starting situations should be kept, which stronger model to try first, and whether the weekly checks should ever go live. Each is in the final summary as a question.
