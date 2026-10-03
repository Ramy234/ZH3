# Handover: BEV Navigator, from reviewed prototype to working production prototype

*For Claude Code (Sonnet 5.5), working inside the project repo.*

You are taking over a Swiss prototype called the BEV Navigator. It is a neutral decision check for someone who still drives a combustion car. It is built for an HSG consulting project with Zurich Insurance and My BluePlanet.

Your job is to turn it into a functional, mobile-first production prototype. The research team keeps running interviews and gathering sources while you build. Read this whole file before you touch anything.

Martin will give you the n8n workspace URL and an API key. Ask him for these at the very start (step 0), and do not guess them.

**How to work in this repo:**

- Before anything else, read this file, `BRIEFING-CLAUDE.md` and `REVIEW-2026-10-02.md` (all in the repo root).
- Create `CLAUDE.md` with the hard rules from section 1 and the commands you use (dev, test, build), so later sessions keep them.
- Work on a branch, `redesign-2026-10`. Commit once per stage in section 8, with a message that names the stage. Never commit secrets.
- Secrets live in `.env.local` (git-ignored) or in n8n's own credential store. Never in code, workflow JSON or chat. The names to use are `N8N_BASE_URL`, `N8N_API_KEY`, `DATABASE_URL` and, only if W6 is approved, `AI_API_KEY`.
- Run the app and tests locally after every stage. Save screenshots at 360 px to `docs/screens/<stage>/` so Martin can review them without running anything.
- Talk to n8n through its public REST API (`$N8N_BASE_URL/api/v1`, header `X-N8N-API-KEY`). Keep every workflow as a JSON file in `n8n/` as well, so the repo is the source of truth.
- Some workflows may already exist in the workspace, created from a Cowork session. List the workspace first. Update those workflows rather than duplicating them.

---

## 1. The goal and philosophy (non-negotiable)

**The question on the first screen is the product:** *Would an electric car already work for an ordinary week?*

The check turns an imagined barrier into a size:

- the ordinary week
- the rare trip
- the years until a lower running cost has covered the extra price

**"Keep this car" is a fair, complete ending.** Success is not a switch. Success is that the barrier stops feeling infinite, and that the person can see why.

The expert workshop (Roman, Achim, Christian) said the same thing in other words:

> "Design the decision experience first, then choose the smallest technology stack that supports it."
> A Mobility Decision Navigator that identifies and resolves barriers, not an AI chatbot that collects information and recommends EVs.

Hard rules. Keep these unless Martin explicitly changes one.

1. **No sales.** No dealer lead, no insurer offer, no car-model box, no score for switching, no "probability you will switch".
2. **Rules decide, AI assists.**
   - The francs, the payback, the title (the finding) and the next steps are deterministic code, readable back to the person.
   - A language model never writes the verdict, the advice or a paragraph shown as advice.
   - AI may only *classify* into a closed list, with a confidence, and the rules must work without it.
3. **Barrier first.** The first tap is the barrier: charging, cost, trips, trust, or "not sure, show me a number". Personas, called "situations" in the code, are derived afterwards. A person can sit between two situations, and the page says so.
4. **Privacy by construction.**
   - Never collect a name, an address, a postcode, a coordinate or a free-text sentence.
   - A postcode may be *looked up and dropped*. The canton is optional and only asked after a number exists.
   - Analytics are anonymous, insert-only and closed-enum.
   - Collect data only after the person has received value.
5. **Climate stays beside the money, never inside it.**
   - It is the FOEN comparison (new petrol 100, new electric 45), shown only if opened.
   - Never compute a personal kilogram of CO₂. Never draw a climate path over the years. Never put climate on the franc chart or the year buttons.
6. **Every visible number has a source and a date, or is labelled as a placeholder.**
   - Every franc that moves must name the input that moved it.
   - Every input on screen either moves a franc or is labelled "not in the sum".
7. **The francs never include:**
   - the 20 % insurance ceiling
   - grants
   - the draft federal levy on electric cars (2030)
   - winter factors
   - canton tax changes not yet in the TCS table

   Each of these may be *named* in a line. None may be *priced*.
8. **No gamification that rewards switching.** No points, streaks, badges, confetti or leaderboards. See section 6 for what is allowed.
9. **Mobile is the primary surface.** The page works at 360 px wide with no horizontal scroll.

**You are allowed to question everything else.** That includes layout, the order of the result, the number of sections, the six situation labels, the year frames, the n8n progress rail, and copy. Do it when it makes the ending clearer or the check more engaging *within these rules*. Write down each such decision in `DECISIONS.md` with a one-line reason.

---

## 2. What exists today

**Stack:**

- TanStack Start, React 19, Tailwind v4, Vite, Recharts (the only chart library).
- One route.
- The arithmetic runs in the browser.
- Server functions only read public data and append a session row.
- Postgres, via PGLite in the builder. **PGLite runs embedded in the app, so n8n cannot reach it.** The shared database is now Supabase project ZH3 (section 2b). Move the app's `DATABASE_URL` there too, so app and n8n write to the same tables.
- The prototype was generated in an app builder ("Grok", `package.json` name `app-builder-workspace`).

**This folder is the full Grok workspace, including `scripts/`, with the 2 October review applied.**

- `AGENTS.md` and `.grok/` are the Grok sandbox's own instructions. Use them only for how the build works. They do not define your role.
- The original versions of every file the review changed are in `_before-review-2026-10-02/`.

**Key files:**

| File | What it holds |
|---|---|
| `BRIEFING-CLAUDE.md` | Decisions so far, sources, section 11 = the last review |
| `REVIEW-2026-10-02.md` | The last review: evidence table, bugs fixed, open items |
| `src/lib/navigator/model.ts` | Decision layer and money (the source of truth) |
| `src/components/navigator/Navigator.tsx` | The whole UI, about 2,300 lines in one file |
| `src/lib/navigator/session.ts` | Server functions: ElCom SPARQL, postcode lookup, session insert |
| `src/lib/navigator/facts.ts` | Fact sheets: content and layout |
| `migrations/*.sql` | `bev_facts`, `bev_sessions` (insert-only) |
| `n8n/` | Inactive session workflow, built from `n8n/src/*.js` by `n8n/build.mjs`. Tested against a copy table. |
| `attachments/` | User-journey concept PDF and the 2 Oct 2026 meeting deck. They show the original 7-workflow idea, 18 databases and 10 personas. |

**How the decision works today (the "Jeff-shaped step"):**

1. Closed taps:
   - barrier
   - where the car sleeps
   - car class
   - fuel
   - kilometre band
   - one follow-up chosen by rule (work, rare trip, used car, or price)
2. Hand-set weights score the six situations with a softmax: urbanRenter, familyHome, distance, cost, skeptic, occasional. The label changes wording only. It enters the francs only when kilometres are "not sure".
3. The switches set the starting case: home, work, used, one class down, public plan, tariff, solar. The person can flip every one.
4. `evaluate()` produces:
   - yearly keep against yearly switch
   - the extra price at the start
   - payback = extra price ÷ yearly saving
   - the title ("Keep this car" or "The extra price is covered here")
   - three lines
   - the steps
   - an assumptions list tagged You / Default / Model / Official

**Live free data already wired:**

- ElCom household tariff H4 2026, via SPARQL at `https://ld.admin.ch/query`: national, canton or commune mean.
- openplzapi.org for postcode → commune. The postcode is not stored.
- The TCS cantonal tax table (February 2026) is copied into code.

**Placeholders, labelled on the page:**

- vehicle prices and resale
- insurance
- service francs
- pump prices
- work and public charging rates
- wallbox and installation
- rental day
- consumption

**Open items from the last review. Resolve them with Martin, do not decide alone:**

- **Hybrid litre price.** Closed on 3 Oct 2026 at Martin's request: a hybrid pays the petrol litre price (`pumpFor` in `model.ts`). The old 1.48 cell is in earlier versions only.
- **The range figure** (gfs.bern for auto-schweiz, 13 Sep 2025): closed on 3 Oct 2026. The page now says 79 % of non-buyers and names the commissioner (`facts.ts`, migration 0014). The report summary prints 78; keep the difference visible if it is quoted.
- **`bev_notes`** contains old free-text rows. They should be read once and the table dropped.
- **ElCom year.** It is hard-coded to 2026. The 2027 prices exist (median 26.5 Rp, ElCom 8 Sep 2026). Make the year roll on 1 January.
- **The year frame up to 32** flips the title in most cases, for example to "covered in year 18". It is now labelled honestly. Decide with Martin whether to:
  - cap the frame at a published vehicle life, for example Green NCAP's 16 years, or
  - ask "how long do you keep a car?" as the one extra closed question before the result.

---

## 2b. Already done in n8n and Supabase (2 Oct 2026)

Read `n8n/STATUS.md` first. In short:

- **Workspace:** `hsg-consultancy-project.app.n8n.cloud`.
- **Workflow:** "ZurichProjectFristDraft" holds W1, the session ingest (Form trigger → TypeSafe choice → Code → Switch → Postgres), plus a "Test by hand" path. It is **unpublished**.
- **Database:** Supabase project **ZH3** is the shared Postgres. Credential "bev Postgres" uses the session pooler, SSL require, and "Ignore SSL Issues" on.
- **Test:** one insert into `bev_sessions_test` succeeded, and the junk fields were dropped.
- **Postgres step:** switched off again.
- **Step 0 is therefore mostly done.** The database decision is Supabase (ZH3). Do not create a second database.
- **Next for W1:** create `bev_sessions` in ZH3 with row-level security on, then point the app at the webhook with a fallback.
- **Do not touch saved logins.** Never open, read or edit the password of any n8n credential. Martin enters passwords himself.
- **Supabase's API:** every table needs row-level security on, so Supabase's public API cannot read or write it. n8n connects as the database owner and is unaffected.

## 3. Target architecture

Keep it small. The browser still does all arithmetic. n8n does the *background*: reference data, freshness, analytics, the optional classifier. It never calculates the francs and never writes the verdict.

```
Browser (decision + money, deterministic)
   │  reads: /api/dataset (versioned values), /api/facts, ElCom via server fn
   │  writes: one anonymous session row (after value is shown)
   ▼
App server functions ── Postgres ◄── n8n workflows (background only)
                                      ▲
                     Google Sheet "BEV dataset" (research team edits sources)
```

### 3.1 Database

Postgres. Use the existing one, or the one Martin names. Every table is insert-only or versioned; nothing is overwritten silently.

| Table | Purpose | Notes |
|---|---|---|
| `bev_sessions` | One row per stored state of a check. Existing, keep the payload shape. | Add columns or payload fields `model`, `dataset_version`, `cohort` (closed code from the link, e.g. `?s=i3`, or null), `from_sample`. |
| `bev_dataset` | **New.** Every number the model uses. | Columns: `key`, `value`, `unit`, `status` (placeholder / sourced / official / live), `publisher`, `published_on`, `source_url`, `note`, `dataset_version`, `valid_from`. The browser loads the newest version. The page tags and "How this line is made" text read from it. |
| `bev_reference` | **New.** Values fetched by schedules. | ElCom canton means, BFS fuel averages, charging-point counts per canton. Each row has `period`, `fetched_at` and `source_url`. |
| `bev_facts` | Existing fact sheets. | Keep `url`, `as_of`, `status`. Add a `checked_at` and `link_ok` column for the freshness workflow. |
| `bev_rules_version` | **New, small.** Situation weights and the follow-up rules as published JSON. | The weights stay hand-set and readable. Version them so rows can be compared. Do not retune them without Martin. |

The research team's workflow is the key improvement. They edit a Google Sheet (one row per value, with source and date). n8n validates it and publishes a new `dataset_version` to Postgres. The app picks it up. A placeholder becomes "sourced" without a code change, and every stored row knows which version it used.

### 3.2 n8n workflows

Build all of them inactive first. Test each against copy tables, then activate one at a time with Martin's OK.

Use n8n credentials, never literal secrets in nodes. Ask Martin whether the workspace is n8n Cloud or self-hosted, and whether the public n8n API (API key) is available. If it is not, deliver workflow JSON files and import them through the UI.

| # | Workflow | Trigger | What it does | Must not |
|---|---|---|---|---|
| W1 | **Session ingest** | Webhook `POST /bev-session` | 1. Validate the closed fields (the existing `n8n/src` code). 2. Insert into `bev_sessions`. 3. Respond 200 or 400. The app posts here, and falls back to its own server function if n8n is down. | Recalculate francs; store any field outside the whitelist |
| W2 | **Dataset publish** | Manual + daily schedule | 1. Read the Google Sheet "BEV dataset". 2. Validate types, ranges, `status`, and that a sourced row has a URL and date. 3. Diff against the current version. 4. If changed, insert a new `dataset_version`. 5. Email or Slack the diff to the team. | Publish a row without a source when `status` ≠ placeholder |
| W3 | **Reference refresh** | Schedules | 1. ElCom: canton means for the current and next year (SPARQL), monthly. 2. BFS LIK *Durchschnittspreise für Energie und Treibstoffe* (XLSX): unleaded 95 and diesel, monthly. 3. Charging points per canton from BFE open data, weekly. All results go to `bev_reference`. | Scrape sites without an open licence; invent a value when a fetch fails (keep the last row and flag it) |
| W4 | **Source freshness** | Weekly | 1. Fetch each `source_url` in `bev_facts` and `bev_dataset`. 2. Record the HTTP status and a content hash. 3. Email the team a list of broken or changed sources. | Edit content automatically |
| W5 | **Analytics digest** | Weekly | 1. Aggregate `bev_sessions` into counts: barrier × ending (with payback ≤ 8 computed from `paybackYears`, not `withinHorizon`), feedback taps, frame changes, facts opened, cohort. 2. Suppress any cell under 5. 3. Write to a Google Sheet or email for the team. | Export row-level data; join anything identifying |
| W6 | **TypeSafe classifier, optional experiment** | Webhook | See 3.3. | Store the text; write advice |

For W3:

- **BFS file:** the asset number changes with each release. Find the stable catalogue entry first. Confirm the columns before wiring.
- **BFE charging data:** the open data behind the map ich-tanke-strom.ch is on geo.admin.ch, layer `ch.bfe.ladestellen-elektromobilitaet`. Verify the current download URL and licence before using it.

For W1–W6, set each workflow's execution-data saving so that payloads are not kept longer than needed (n8n workflow settings). This is essential for W6.

### 3.3 TypeSafe AI integration: where AI is allowed

Martin asked for "TypeSafe AI integration if possible". Interpret "TypeSafe" as **structured output into a closed enum, validated against a schema, with a confidence and a rules fallback**. If Martin means a specific product, ask him.

**Where AI is allowed:**

- **(a) Optional "say it in your own words" box for the barrier.**
  - It sits on the first screen, *below* the tap options.
  - The text goes to W6.
  - n8n's *Text Classifier* or *Information Extractor* node, with a *Structured Output Parser*, returns exactly one of `charging | cost | trips | trust | unsure | none` and a confidence from 0 to 1.
  - The page shows the chosen barrier as a tap the person must confirm or correct.
  - **The text is never stored**, not in Postgres and not in n8n execution history. Only the confirmed enum is stored, plus a flag `barrier_via: tap | words`.
  - Show one line before sending: "Your words go to an AI service to pick a category, then are dropped."
  - The box is off by default until Martin approves it.
- **(b) Situation classifier.** Later, a classifier may replace the hand-set weights only if it:
  - returns the same six labels plus a confidence
  - is evaluated against the rules on a fixed test set of tap combinations
  - is shown side by side in an internal page

  The rules stay the default.
- **(c) Never:** the verdict, the steps, explanations shown as advice, sources, prices.

**Model choice.** The workshop advice is to start with a strong model and optimise cost later. A capable model with JSON-schema output is fine. Ask Martin which provider and key to use, because an API key is usually not free. Log only the label, the confidence and the latency, never the text.

---

## 4. Free data and links

Use what is free and open. Where nothing open exists, link to it; do not scrape it and call it a source.

| Need | Free source | Use |
|---|---|---|
| Household electricity | ElCom via LINDAS SPARQL (`ld.admin.ch/query`, graph `lindas.admin.ch/elcom/electricityprice`) | Live, canton or commune mean, H4. Roll the year. |
| Postcode → commune | openplzapi.org | Lookup, then drop the postcode. Say in one line that a third-party lookup is used. |
| Pump prices | BFS LIK average prices (monthly XLSX) | W3. Replaces placeholders 1.79 / 1.93 with "BFS, ⟨month⟩". |
| Charging points | BFE open data (ich-tanke-strom.ch) | Count per canton or commune for an "is there public charging near you" line, plus a link to the map. Never ask for an address. |
| Canton tax | TCS table, February 2026 (in code) | Manual update once a year. Glarus pays from 2027; Solothurn decided 6 May 2026. |
| Insurance | No open API | Placeholder plus links (Comparis 19 Aug 2025; Zurich "up to 20 %"). |
| Rental, car prices, used-EV prices | No open API | Placeholders, with the team filling the dataset sheet (W2). |
| Advice and tenants | EnergieSchweiz advice directory; charging-in-rented-buildings guide | Outbound links only. |
| Public transport alternative (optional, later) | transport.opendata.ch (free, no key) | Only if a "keep the car / car-free" path is added. Station-level only, no addresses. |

---

## 5. Design: what to improve, and how

The current result page has **14 stacked sections** and reads like a report. On a phone the ending competes with everything else. In the last version a long URL even pushed the title off-screen.

Redesign around **three layers**.

### Layer 1: the decision card (one phone screen, no scrolling)

1. **The finding as the title:** "Keep this car" or "The extra price is covered here".
2. **Three lines:**
   - the yearly difference and what it is made of
   - the extra price after selling the current car
   - the years against the frame, as in "if you keep the next car that long"
3. **One compact chart:** the keep and switch lines, the crossing marked, and the 8-year study mark.
4. **Three action steps** at most, each with a tick box and a "copy" action. The steps come from `nextSteps()`, for example:
   - "Ask the employer in writing"
   - "Only price a used car with a battery certificate"
   - "Keeping the car is a valid result"
5. A sticky bottom bar: **Share · Change a figure · Details**.

### Layer 2: "Why this result" (bottom sheets, opened on tap)

- what the year is made of
- the payback sum
- the switches with their effect line ("−CHF 340 a year")
- the place: canton, or a postcode that is dropped
- climate, if wanted

### Layer 3: "Evidence" (one sheet)

- every assumption with its tag, source, date and status from `bev_dataset`
- the worries the francs do not close: the building, winter, not wanting one

### Visualising the decision step

The goal is a better picture of the decision, not a fancier one.

- **"Your ordinary week" strip.** This answers the product question directly.
  - Seven days, each with a bar for typical kilometres from the band.
  - A charging mark showing where the car charges (home, work, public), drawn from the mix.
  - One honest line, such as "A typical week uses about X % of a mid-size battery. One home charge covers it."
  - Battery size and consumption come from `bev_dataset` as labelled placeholders.
  - No winter factor.
- **Situation as overlap, not a box.** Show the top two labels as two small bars with percentages, plus "the francs are the same either way". The meeting deck said exactly this: "we show the overlap, not one forced label".
- **Switch effect chips.** Each switch shows its delta before tapping. This already exists as `shiftLine`. Make it visual: one small arrow and the amount.
- **Charts.** Keep Recharts. Draw no gauges, donuts, maps, car images or climate paths.

### Mobile rules

- 360–430 px is the primary target.
- Tap targets ≥ 44 px.
- One primary action per screen.
- No text under 14 px except chart ticks.
- Add a Playwright test at 360 px and 390 px that asserts `scrollWidth <= innerWidth` on every step and on the result. This bug has already happened once.

### Copy

- Plain English first. German waits until the English survives interviews.
- Keep the honest sentences: "Nobody sends you the difference", "Keeping the car is a fair result".
- Cut repetition: that sentence currently appears five times.
- Hide the n8n five-node rail from drivers. Move it to an internal `/about` or `/workflow` page.

---

## 6. Engagement, the honest way

The philosophy already defines the only honest point: *did the barrier become a number the person can disagree with?* Strengthen engagement around that, not around switching.

Allowed, and recommended:

1. **"What would have to be true".** A counterfactual card that is computed, not written.
   - Run `evaluate()` over the existing switches and inputs, one change at a time.
   - Show the single smallest change that flips the ending, in either direction. For example:
     - "If work charging were a yes, covered in year 7."
     - "If you sold within 5 years, keeping is cheaper."
   - It uses no new price and no new weight. It is symmetric by construction.
2. **Progress that can end early.** A three-stage path: *Barrier → Number → Next step*. "Keep this car" completes it just like a switch does. Show "Check complete" either way.
3. **A revisit date, without an account.** Offer an `.ics` download such as "Check again when the landlord answers" or "when your car turns 10". Nothing is stored server-side.
4. **Ask one person.** The share note exists. Upgrade it to a share card (section 7).
5. **Disagree with a number.** "This looks wrong" on any line opens the edit control. The disagreement is stored as a closed tap (it already exists as the feedback taps). This is the engagement event the brief cares about.

Not allowed: points, streaks, badges, confetti, leaderboards, public totals, "X % of people switched", or any reward for a switch.

---

## 7. The share card (socials)

Martin wants a compact overview with clear action steps that can be shared. Build it client-side.

- **Content:**
  - the finding
  - the one number (the yearly difference, or the extra price, whichever drives the ending)
  - the top step
  - the barrier they named
  - the footnote "Prices are labelled estimates. Not a quote."
  - the check's URL
- **Never on the card:** the postcode, the canton (unless Martin decides otherwise), where the car sleeps, or the session id.
- **Formats:**
  - 1080×1350 (Instagram and LinkedIn portrait)
  - 1080×1920 (stories)
  - an Open Graph image for link previews
- **Rendering:** draw on a `<canvas>` or use an HTML-to-image approach. Use the Web Share API with files on mobile, and fall back to download plus copy text.
- **Tone:** neutral and calm. A "Keep this car" card should look just as finished and shareable as a "covered" one.
- **Link previews:** a generic OG image plus title for the page itself. No personal data in the URL. If you encode a case in the URL for "compare with a friend", use only the closed enums and say so.

---

## 8. Order of work, with checkpoints

**Stop and show Martin at every ✋.**

0. **Access and the database decision.**
   - Run `npm install`, then `npm run dev`. The app runs on PGLite, with no database setup, as long as `DATABASE_URL` is unset.
   - Ask for: the n8n URL and an API key, whether n8n is Cloud or self-hosted, the deployment target, an AI provider key if W6 is wanted, and the Google account for the dataset sheet.
   - **The database is already decided:** Supabase project ZH3 (section 2b). The app uses node-postgres when `DATABASE_URL` is set. For Supabase's session pooler, the connection string needs `sslmode=no-verify`, because the pooler certificate is signed by Supabase's own authority (see `.env.example`). Martin puts the password in `.env.local` himself.
   - Put secrets only in `.env.local` and in n8n credentials.
   - ✋ Confirm the environment and the database.
1. **Baseline.**
   - Run the app as it is.
   - Write golden tests for `evaluate()`: at least ten scenarios, including the worked example, small car with trips, towing, already electric, and "not sure" kilometres.
   - Add invariant tests:
     - the title agrees with the three lines
     - every closed tap either moves a franc or is labelled "not in the sum" (tap matrix)
     - no payload field outside the whitelist
2. **Data layer.**
   - `bev_dataset` plus the Google Sheet template, seeded from the current placeholders with `status = placeholder`.
   - W2 publish.
   - The app reads the dataset version.
   - ✋ Show the sheet to the research team.
3. **n8n background.**
   - W1 (test on a copy, then switch the app to post there with a fallback), then W3, W4, W5.
   - All inactive until tested.
   - ✋ Activate one at a time.
4. **Redesign.**
   - Split `Navigator.tsx` into components.
   - Build the three layers, the week strip, the switch chips, the counterfactual card and the sticky bar.
   - Add the mobile overflow test.
   - ✋ Show 360 px screenshots of all four endings: keep (no saving), keep (too late), covered, already electric.
5. **Share card and revisit `.ics`.** ✋
6. **W6 TypeSafe classifier.** Build it behind a flag and evaluate it against the rules on a fixed set. ✋ Martin decides whether it goes live.
7. **Interview readiness.**
   - Cohort codes (`?s=i1…i8`).
   - An internal `/sittings` page with the observation checklist:
     - did they tap 32?
     - did they read the title as permission?
     - did they challenge the resale?
     - did they open "why"?
   - Hide all architecture from drivers.

**Definition of done:**

- Every step works at 360 px with no horizontal scroll.
- All four endings render as one-screen decision cards.
- Every visible number shows its status and source from `bev_dataset`.
- Sessions arrive through W1 with `model`, `dataset_version` and `cohort`.
- The weekly digest arrives.
- The share card works on iOS and Android.
- Golden and invariant tests pass.
- `DECISIONS.md` lists every departure from the brief.

---

## 9. What not to do

- Don't move arithmetic into n8n. Don't let an LLM write the verdict, steps or sources.
- Don't retune the situation weights. Don't add a second follow-up question without Martin's yes (the keep-years question is the only candidate).
- Don't put into the francs: climate, the 20 % insurance ceiling, grants, the 2030 federal levy, or a winter factor.
- Don't collect a name, an address, a postcode, a coordinate or a free sentence. Don't keep W6 text anywhere.
- Don't add a dealer or insurer offer, a model picker, a map of their address, or gamified rewards.
- Don't replace a dated figure with a rounder one unless the publisher's page contradicts it, and then say so.
- Don't turn on any workflow, or point it at the real table, before a test insert on a copy succeeds.

When in doubt, ask one short question rather than guessing. Martin is the decision owner.
