# How the decision model grows: facts, local rules, model, and where classifiers fit

Written 3 October 2026 for Martin. Status: proposal, nothing here is built beyond what is marked "exists".

## The idea in one paragraph

The maths (`model.ts`) changes rarely and only by hand. Everything that changes often, such as prices, tariffs, local rules, links and new learnings, lives in rows that carry a source, a date and a version. n8n may fetch, check and propose rows. A person approves them. The browser applies the approved rows and runs the same deterministic sum. A new fact therefore never needs a code change, and a code change never silently changes a fact.

## Three layers

1. **Facts (exists, `bev_dataset`).** One number per row: key, value, unit, status (placeholder, sourced, official, live), publisher, published date, link. Insert-only, the newest `valid_from` wins, a sourced row without publisher, date and link is refused. Today these are national figures and class placeholders.
2. **Local rules (proposed, `bev_local_rules`).** Rows keyed by canton or commune (BFS number): kind (tax, grant, charging-in-rented-building rule, tariff note), a short plain sentence, a link to the official page, valid from and to, publisher and date. A rule never enters the francs. It appears as a line and a link in "Make it local" and in the next steps, because grants and levies are explicitly outside the sum. The postcode now optionally collected is the key that selects these rows. Start with the 26 cantons (tax and incentive pages), then add communes only where a commune page exists.
3. **Model (exists, `model.ts`, `MODEL` version).** Reads facts, ignores local rules. Every stored result carries `model` and `dataset`, so any past result can be re-run against the data it saw.

## Making new learnings flow in

- **Freshness.** Every fact gets an expected refresh interval (pump price monthly, tariffs yearly, studies on release). A row older than its interval is shown as "older than usual" on its number sheet, and its range in "How sure is this?" widens. This is a display rule, not a change to the sum. (Not built.)
- **Row-level uncertainty.** The sensitivity view currently moves each assumption by a fixed share (15 or 25 percent). Better: each row carries its own low and high from its source, for example the spread between providers for public charging. Then the tornado reflects the evidence, not our choice. (Not built; needs `low` and `high` columns on `bev_dataset`.)
- **Gap backlog (proposed, `bev_gaps`).** Counts from `bev_sessions_analytics`: which "What was unclear?" taps, which barrier, which opened fact sheets, by canton, settlement and week, only for cells of at least 10 people. Each week it ranks "where people are missing information". A person turns the top entries into new facts or local rules. This is how the analytics become content, and it is the reason for storing a place.
- **Replay and impact (proposed).** Before a new dataset version goes live, a job re-runs the last N stored results (they hold banded answers) against old and new data and reports how many endings change. A version that flips more than a set share of endings needs a second look. The stored rounding means replay is approximate, so it flags, it does not prove.
- **Versioning rule.** `MODEL` changes only when a formula changes. `DATASET` changes when any row changes. Local rules have their own version. Results store all three.

## Where n8n fits (workflows stay inactive until a `*_test` insert has succeeded)

- W2 reads the maintained Sheet and proposes dataset rows (exists, inactive).
- W3 reference sources (exists, inactive). Planned feed: BFS monthly fuel prices once the file is wired; ElCom tariffs through LINDAS.
- W4 source watcher (exists, inactive): hash of each cited page. Proposed upgrade below.
- W5 weekly digest (exists, inactive): counts only, closed columns.
- **W7 (proposed) local-rule checker.** Reads the link of every local rule and flags dead or changed pages.
- **W8 (proposed) gap backlog.** Writes the weekly ranking from the analytics view.
- Rule for all of them: n8n writes proposals into a `proposed` status. Only a person promotes a row to `sourced`. n8n never writes a verdict, a step or a figure the model uses.

## Classifiers: what is worth using, and where

Honest starting point: the app collects no free text, so most "classification" is already a lookup. A language model adds nothing to six closed taps. Use the cheapest tool that is explainable, in this order.

1. **Situation from the six taps (exists).** Deterministic weights, explainable, free. Keep. If real outcome data ever exists, the next step is a penalised logistic regression on the closed taps (the Bank of England working paper on small models plus logistic regression found it matches large models in few-shot text tasks, with better cost, privacy and explainability). It would still only choose among the six situations, with a probability, and the rules stay as fallback. It never touches francs.
2. **Source-change triage (W4 upgrade, where a model earns its place).** The hash only says "something changed", and most changes are layout noise. Diff the extracted content, not the HTML. If the content differs, send the changed passage to n8n's Text Classifier node with a closed list: `no_effect`, `figure_changed`, `rule_changed`, `link_dead`, `restructured`, and the node's "Other" branch routed to a person. For `figure_changed`, extract the number with a plain pattern first and let the model only confirm. The result is a proposal row with the old value, new value, link and a confidence, never an automatic write. Use a small, cheap model, a low temperature and the node's auto-fix for the output schema.
3. **Gap-tap clustering.** Not needed. The taps are closed, so counts do the job.
4. **Later, only if free text is ever added (not planned).** Embeddings plus logistic regression, run privately, before any large model. It would need a new privacy decision from Martin first.

Constraints that hold for every classifier (from CLAUDE.md): a closed list, a confidence, a rules fallback, no verdict or source written by a model, nothing a model returns enters the francs.

## Order of work

1. Local-rules table and the 26 canton rows (uses the postcode just added).
2. Freshness interval on every row and the "older than usual" label.
3. `low` and `high` per row, tornado reads them.
4. W8 gap backlog on the analytics view (cells of 10 or more).
5. W4 triage with the Text Classifier node, proposals only.
6. Replay and impact check before a dataset version goes live.
7. Logistic regression for the situation only when there is outcome data to learn from.
