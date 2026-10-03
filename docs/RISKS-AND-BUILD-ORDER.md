# Risks and build order, 3 October 2026

## Risk register

| Risk | What could go wrong | What holds it | Residual |
|---|---|---|---|
| Money model drift | A sentence on the page says one number and the model another | Page sentences read the dataset (`dataNote`, `DATA_NOTES`); a guard test fails on a hard-coded figure; golden tests for the model | Low |
| Unsourced statement | A fact appears with no publisher | `source-audit.test.ts` requires publisher, date and link; known gaps are listed by name | One known gap: winter (no stable public link to the gfs.bern PDF) |
| Stale figure | A price or rule moves while the page says the old one | Dataset versions are insert-only with an as-of date; the Sheet template test fails when stale; W3 and W4 exist but are off | Medium until someone switches them on or checks by hand |
| Classifier error | A wrong suggestion steers someone | Closed lists, a confidence gate, the person confirms; rules fallback; log of accepted share | Unmeasured until the smoke test is run |
| Prompt injection in the words box | Text tries to instruct the model | Scrub step, injection regex in rules, a Jev injection question, closed output only, no text returned | Low |
| Personal data in a sentence | Someone types a name or address | Scrub removes emails, links, phones, long numbers; Jev flags personal text; nothing is stored; the sentence is never logged | Names in plain words are not removed. Hence the tick, the notice, and no storage |
| US processing | Jev is US-hosted | Off by default; visible tick; no storage; no training on inputs; zero retention is enterprise only | Martin's decision |
| Re-identification | A small cell reveals a person | Cells under 5 hidden internally, under 10 outside; postcode apart from answers; 12-month deletion | Low; the session id is pseudonymous |
| Looking like Zurich marketing | Neutrality is lost | No dealer, insurer offer or model picker; company links only in labelled lists, never first, never next to a price (`links.test.ts`) | Depends on how Zurich is shown. Open question below |
| NDA | Restricted Zurich material leaks into the app or a service | The 2:1 deck is used as an idea only: no slides, images or wording; W8 forbids it in its notes; Renault is not named | Christian to confirm any naming |
| Outage of a source | A linked page moves | Links were all opened on 3 Oct 2026; W4 can check weekly | Medium |
| Scope creep | A new feature adds a barrier on the start page | The start page stays at six taps; everything new sits behind a tap | Low |

## Build order from here

1. Run the Jev smoke test with the key (`--rules` and `--dry` first). Read the German and French rows. Decide yes or no on the AI step.
2. Push, let Vercel run the migrations (0026 to 0028), open the live site, run the layout and flow checks against it.
3. Real sittings with the six situations; read `bev_gap_backlog` and `bev_action_stats` once there are cells of 5 or more.
4. Content: sheets for the gap codes with the most people and no sheet (see `ZURICH-RESEARCH-PLAN.md` section 6).
5. German, then French (see `WORDING-DE-FR.md`), after the English wording has settled.
6. Only then: switch on one weekly check (source freshness first, it is read-only), watch it for two weeks, then the digest.
7. Observed personas, if the data supports them.
