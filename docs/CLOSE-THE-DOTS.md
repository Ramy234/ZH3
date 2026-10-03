# Closing the dots: from a tap to a decision about what to build

Written 3 October 2026. This is the architecture of how what people do in the check turns into what we publish next, and where the classifier, n8n and the database sit in that loop. Nothing here collects a name, an address, a coordinate or a sentence.

## The loop, in one line

barrier (what would still stop you) → the move we showed → what the person did with it (done, not for me, unclear) → the gap code that is still open → a backlog of gaps with counts → the next sheet, source or link we add → the page changes → the counts move.

Every step is a closed list, so every step can be counted, and every count is hidden below 5 people (internal) or 10 (outside the team).

## What exists, and what each piece answers

| Piece | Where | Question it answers |
|---|---|---|
| Barrier tap, or the optional words box | `Navigator.tsx`, `words-rules.ts`, `classifier.ts` | What is in the way, in the person's own order of worry? |
| Gap codes | `gapcodes.ts` (26 INFRAS sub-barriers plus our X1) | Which named gap did this sitting touch? Comparable with the INFRAS report for the canton of Zurich. |
| Charging check | `charging.ts` | Is a plug at the place the car sleeps the real obstacle, or something that can be solved? |
| Next move shown and its outcome | `actions.ts`, `bev_action_stats` | Did the suggestion help? A "not for me" or "unclear" is a signal about the suggestion, not about the person. |
| Fact sheets opened | `facts.ts`, `FACT_CODES` | Which explanation did people reach for? |
| Place (canton, settlement, tenure; postcode optional) | `bev_locations`, `session.ts` | Where is information missing, in groups of at least 10? |
| Classifier log | `bev_classifier_log`, `bev_classifier_stats` | How often did the box suggest something people accepted, by route (device, rules, AI) and language? |
| Weekly digest | W5 | The counts, in one message to the team. |
| Source freshness, reference refresh | W4, W3 | Is a source still there? Did an official price change? (Both off by default; see `n8n/STATUS.md`.) |

## Reading the counts as a backlog, not a score

`bev_gap_backlog` lists gap codes by week, with at least 5 people per cell. The rule for using it:

1. A gap with many people and **no sheet** is a content gap. Find the primary source first, then write the sheet (a dated publisher and a link, or it does not go in; `source-audit.test.ts` enforces this).
2. A gap with many people **and** a sheet, but a high share of "unclear" or "not for me" on the move, is a wording or relevance gap. Rewrite the move. Do not add more.
3. A gap with few people is not evidence that it does not exist. The check reaches people who started it; it says nothing about people who did not.

None of this changes the francs. The money model is fixed and deterministic. Analytics decide what we explain, never what we compute.

## Where the classifier fits, and where it must not

The own-words box is **optional**, one short sentence, and always runs through the same order:

1. Keyword rules on the device (`words-rules.ts`). Nothing leaves the phone.
2. Only if the person ticks a visible box, and the server flag is on, the sentence is cleaned (emails, links, phone numbers, long digit runs removed) and sent to W7. W7 asks Jev closed questions (concern, parking, tenure, language, injection, personal data). It returns closed names and a confidence band, never text.
3. A confidence over 0.9 pre-fills a tap, 0.5 to 0.9 asks the person to confirm, under 0.5 asks them to pick. The person always makes the final tap.
4. The app stores only the closed outcome (`bev_classifier_log`): which list name, how sure, what the rules said, whether the person agreed. No sentence, no session id.

The classifier may sort a sentence into one of five concerns. It may not write a verdict, a step, a figure or a source. If it fails, the rules answer. If both fail, the taps are all still there.

## Calibration, and why the first accuracy numbers are soft

`scripts/jev-smoke.mjs` runs the fixed sentences through the keyword rules or Jev and writes a counts-only report. Two cautions:

- The keyword rules were written after the sentences were read, so the rules score is optimistic. Jev's score on the same set is the first honest number.
- German and French accuracy is **not known** until the smoke test is run with the key. The set contains both languages; read those rows first.

After launch, the real measure is `accepted_pct` per route and language in `bev_classifier_stats`. A route below an agreed floor (suggested: under 60 % accepted over at least 50 suggestions) goes back to taps only.

## Personas from what we observe, not from what we guess

The six situations in the app (urban renter, family with a home, long distance, cost-driven, sceptic, occasional driver) are starting guesses. Once there are enough final sessions, group sittings by their closed answers (parking, class, km band, barrier, move outcome) and compare with the six. A persona is published only when a group has at least 10 sittings and is described by what its members answered, never by who they are.

## What is deliberately not connected

- No link from the words box to the session id. The log row cannot be tied to a sitting.
- No postcode in any counting view. The postcode lives in `bev_locations` for 12 months and is shown outside the team only in groups of 10 or more.
- No free-text sentence in any table or workflow execution (W7 keeps no execution data, manual runs are not saved).
- No picture is stored or collected from visitors. W8 is a lab bench for our own test pictures only.

## Open for Martin

- Whether and when to switch the Jev step on. Needs the smoke report and a decision about US hosting (Jev is US-hosted, does not train on inputs; zero retention is enterprise only).
- Whether the app should post sessions to W1 or keep saving through its own server. Today it saves through its own server. W1 exists so n8n can take over without a schema change.
