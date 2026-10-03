# The result page from first principles, and how "next steps" meet the classifier and the database

Written 3 October 2026 for Martin. Proposal only. Nothing in this file is built yet.

## What the person needs, in order

Someone who tapped six times arrives with one question: would an electric car work for me? They need, in this order, an answer, a reason to trust it, one thing to do, and a way to check the details if they want. Everything else is for people who ask for it. The poorer 80 percent of buyers are the ones who run out of time, patience and data first, so the page must be finished when they stop reading, and never longer than their patience.

Today the page stacks about thirteen blocks under the verdict: the ordinary week, what is holding you back, how sure, where a year of running goes, what would have to be true, next steps, try a change, share, two closed folds, the plan, a feedback box and the climate block. Each is useful. Together they make a reader scroll to find the one thing that matters, which is what to do next, and it sits in the middle.

## The new shape: answer, move, explore, keep

1. **Answer (stays).** The dark verdict panel: the sentence, the ruler, the three numbers. Nothing above it, nothing between it and the next block.
2. **Your next move (new, directly under the answer).** One primary action, with up to two alternatives behind "other ways". It is chosen for this person and says why: "Shown because you said you cannot charge where you park, and that moves your result most." The action is concrete: a message to copy, a calendar reminder, a neutral page to open, a thing to try for a weekend. A small tap records the outcome ("I did it", "Not for me", "I did not understand"). This is the only block that asks something of the reader.
3. **Explore (one panel at a time).** A segmented control with four panels, only one open. On a phone it is a row of four chips under the next move.
   - **What if…** replaces "How sure is this?", "Try a change" and "What would have to be true". One idea: every figure that is an assumption gets a slider or a toggle, and moving it changes the hero ruler and numbers live, with a "back to my answers" link. The top three assumptions show first, the rest behind "all assumptions". The range sentence ("fast year 3, slow year 15") sits above the sliders in one line.
   - **My week** holds the ordinary-week strip, the charging mix and where a year of running goes.
   - **My place** holds "Make it local": settlement taps, the postcode, the commune and canton pages, and the local rules once they exist.
   - **Sources** holds why this result, what went into the number, the dated sources, the method link, the climate lens and "did something not make sense".
4. **Keep and share (stays, shortened).** Save the plan (copy, download, calendar), share (note and picture). One block.

The reader sees four things on a phone without opening anything: answer, next move, the panel chips, keep and share. That is under half the current length. Nothing is deleted, it moves behind a tap. The feedback taps (unclear km, unclear payback, unclear price, unclear wording) move into each panel, next to the thing they are about, and are still the closed list the analytics read.

Climate: the result keeps its one-line "beside the money" mention in the hero. The climate lens (chart, the 8,000 km a year point from the federal study, link to the study) becomes a part of Sources, and a chip in the next move row when the person said they care about climate. It never enters the francs.

## Next steps as data, not as paragraphs in code

Today `nextSteps()` in `model.ts` writes up to four cards from if-statements. That cannot be improved from what we learn, cannot be measured, and cannot be edited without a release.

**The action catalogue** (a table, like the dataset): one row per action with an id, a version, a title, one plain sentence, a kind (ask, write, test, read, remind, local), the neutral link with publisher and date, an optional template text to copy, the minutes it takes, the gap it closes (parking, cost, trips, trust, used car, rented building, climate), the closed conditions in which it applies (barrier, parking, work access, used stance, ending, settlement, canton), a status (draft, live, retired) and valid from and to. It is insert-only and versioned, and a person promotes a row from draft to live. A link we have not verified stays draft and is never shown. The EnergieSchweiz trial page is in this state until you have opened it and confirmed what it offers.

**The ranking** is deterministic and runs in the browser: filter the live actions whose conditions match the person's closed answers, then order them. The score has three explainable parts: how directly the action closes the gap this person named, how much it addresses the assumption that moves their result most (the top bar of the "What if" panel), and how little effort it takes, with a bonus when a local rule or a commune page exists. The "because" line is built from the same parts, so the reason shown is the reason used. The money never depends on it.

**Where the classifier sits.** The inputs are already closed values: the six taps, the ending, the payback band, the top driver, the settlement and canton. The output is a ranked list of action ids. In three stages:

1. **Now: rules and the score above.** No learning, fully explainable, works with zero data.
2. **After about a few hundred finished sittings: learned weights.** Each action records closed events (shown, opened, done, not for me, did not understand) against the person's random session id. A weekly n8n job counts them per action and per feature cell, only where a cell has at least 10 people, and fits a small penalised logistic model or a simple bandit that only reorders actions that already passed the filter. It writes a versioned weights table. The browser downloads the table with the dataset. No per-person call to a server, so nothing to track, and the learning cannot create content or push a commercial offer.
3. **Later: a language model only as a helper for people, not for readers.** It can draft candidate actions from the gap backlog and from changed source pages, for a person to review. It never writes what a reader sees without review.

**What the database stores.** `bev_actions` (the catalogue, above), `bev_action_events` (session id, action id and version, event, rank shown, week), `bev_action_weights` (version, feature cell, action id, weight, n). Every table has row-level security on. Counting views drop the session id and apply the minimum cell of 10 for anything shown outside the team.

**Closing the loop.** The "remind me in six months" file already exists. Its revisit link can open with one question per action the person marked "I did it": what came back (yes, no, not yet). Those taps are the first real outcome labels, and they turn the gap backlog from "what people did not understand" into "what actually unlocked or blocked a decision".

## Rules that stay

No sales: an action may point to a neutral or public source, never to a dealer, an insurer, a broker or a platform that is paid per lead. A publisher list in the catalogue enforces it. No car models. Nothing in an action changes the francs. A trial or rental route is "try it for a weekend", never "buy".

## Build order, rethought

Because the actions need a place to live, the skeleton comes first, in one piece.

1. **Skeleton and next move.** The four-part page with the segmented panels. The next move block uses a catalogue seeded in code from today's `nextSteps()`, with the ranking, the "because" line and the three outcome taps (recorded as closed telemetry actions). Tests for ranking and for "no action without a neutral publisher".
2. **What if.** Sliders and toggles that drive the hero ruler, replacing How sure, Try a change and What would have to be true.
3. **Database.** Migration for the three tables, the events write, the weights read, and the catalogue loaded the way the dataset is, with the seed as fallback.
4. **Weekly job.** The n8n workflow that counts events and writes weights, inactive until a test insert succeeds.
5. **Neutral trial routes.** The "try it for a weekend" actions, after the links are verified.
