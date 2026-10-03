# What the Zurich Research folder changes: a first-principles plan

Written 3 October 2026 for Martin. Plan only. No code, data or page was changed for this document.

Sources read: the HSG briefing of 4 Sept 2026, the barrier note, the INFRAS final report for AWEL Zurich (1 July 2026), the three charging notes, the Empa battery deck (9 Sept 2026), the six car-data-privacy notes, the JEV/n8n/chatbot notes, the 2:1 deck, both HTML prototypes and the n8n workflow JSON.

## 1. How far to trust the folder

**Leads, not sources.** About two thirds of the folder is AI-written research (the charging notes, JEV/n8n notes, privacy notes). They are good maps. They are not citations. Our rule stays: a number enters the dataset only with publisher, date and a link to the primary page, and it enters as `proposed` first.

**What I checked against the primary page today.** Federal Council consultation on the basic charging installation: published 19 June 2026, closes 12 October 2026, tenants and condominium owners who live in the building and whose bay comes from the same landlord could require the base installation, costs usually pass into the parking rent, the work must be reasonable, and the page states no date of entry into force (admin.ch). ASTRA: more than half of motorway rest areas have fast charging (May 2026), about three quarters targeted for 2027, all 100 for 2030 (astra.admin.ch). The INFRAS report exists as a public PDF on infras.ch. Our `tenant-right` sheet already matches the first one.

**Not verified, so not to be used yet:** the "earliest 2028, more likely 2028/29" entry-into-force estimate and the "chances of passing" in the timeline note (an AI reading, not an official date); the 17,866 charge points and 8,417 sites (a trade-press count; the official number is on EnergieSchweiz); the 5 to 10 point lower resale value after 3 to 4 years (INFRAS quotes AutoScout24, I have not opened it).

**Do not use:** the "one in five public charging attempts fails" figure (J.D. Power, a US study; we are Swiss-only), and the "15 percent of sessions negative" figure (a blog post counting 341 sessions).

**Three handling notes.**

1. The 2:1 deck is marked *Restricted, © Zurich*. We use the idea, never its slides, images or wording. Before the idea sheet names Renault in public, Christian Zeunert should confirm that naming is fine. I found no public Renault 2-for-1 offer, so the sheet says "discussed", not "offered".
2. Several of the AI-written PDFs end with source lists that contain stray personal-profile fragments (lines like `bio.…`, `health.…`). Do not forward those PDFs to Zurich or put them in the repo. I did not copy any of it.
3. **Z-Volt is Zurich Insurance's own charging service** (flat-price charge card, zurich.ch). It is on the HSG slide next to "Ich tanke Strom". Under our hard rule (no insurer offers) it cannot be a neutral next-move link. See decision D2.

## 2. What the research confirms (nothing to change)

- The whole product direction. The "Which approach" note recommends exactly what we built: an independent, privacy-first navigator, not a persuading chatbot; honest "not yet" endings; barrier-by-barrier pathways; editable assumptions that change the result at once; no account; rules and calculators for facts, AI only for narrow classification.
- JEV is optional and can wait. All our inputs are closed taps, so a classifier has nothing to interpret. Both notes say the same: use it only if free text is ever added, and a green result must never come from a model. Our rule "no free text" stays.
- n8n stays off the click path. Starter is 2,500 executions a month, one per workflow run. The browser already writes to Supabase directly, and n8n only does weekly jobs. This is the cheap and private design the cost note points to.
- The chatbot-privacy note matches our analytics design: store categories and counts, not sentences; a random session id is pseudonymous, not anonymous (EDÖB). We already band values and require cells of 10. One extra step is in 5.5.
- Right-sizing plus guaranteed exceptional mobility (2:1), battery certificate, mobile charger, decision aid with a "decision file", TCO, leasing instead of purchase, 48-hour test drive: all are on the HSG solution slide, and all but the last two are already in the app.

## 3. What the research changes

### 3.1 One spine for every gap: the INFRAS barrier codes

INFRAS (AWEL Zurich, July 2026) gives the clearest published list of barriers: seven groups, 26 sub-barriers (H1.1 real range … H7.3 social factors), each weighted by the buying phase in which it bites (orientation, evaluation, purchase, after purchase). Three things in it matter for us.

1. In the evaluation phase the barriers rated critical are: no private charging (H2.2), purchase price (H3.1), general charging availability (H2.1), range against driving profile (H1.1), and doubt about technology development, the "too early to buy" feeling (H5.2). In the information phase: missing knowledge (H5.1) and seller competence (H4.4).
2. "Charging access is decisive" and most barriers come in combination. The briefing says the same: barriers rarely appear alone.
3. We have no code for "I'll wait, it will get better" (H5.2), for the used-car market (H4.2), for the seller's advice (H4.4), or for rules not yet decided (H3.3). Our six-tap barrier list (charging, cost, trips, trust, unsure) folds these into "trust".

**Change.** Add a closed `gap_codes` list (the INFRAS codes, as short keys) to facts, actions and local rules, and map each existing tap, "what was unclear" answer and fact sheet to one or two codes. The weekly gap backlog then counts by published code, in cells of 10 or more. This costs nothing on the page. It gives Zurich a table in the language of the Canton's own report. It does not change the six taps or the situation weights. Citing INFRAS as the taxonomy also makes the gap analytics something a public body can reuse.

### 3.2 A charging-setup check replaces "settle charging" as the top move for people without a plug

The folder's best practical piece is the charging-setup note: do not look for the nearest station, build a set-up of one regular main option (workplace, or within about ten minutes on foot of home, four hours or more) plus one independent backup, plus a long-trip option. Test each for a week at your own times. Compare cost per 100 km including parking, time and blocking fees, not the kWh price alone. Its decision rule has four conditions: a regular AC point at work or within about ten minutes of home; at least one equal backup; real total cost fits the budget; charging time falls into time the car stands anyway. If only spontaneous fast charging is left, it is possible but usually costly and tiring.

**Change.** Turn the action `settle-charging` into a short, closed, tap-based check on the "My place" panel (no typing): main option yes/maybe/no, backup yes/no, "fits my standing time" yes/no. It returns one of three plain sentences and the right next move, and it is the first time the page tests the combination, not one barrier alone. Link "Ich tanke Strom" (BFE/EnergieSchweiz, neutral, real-time map) as the tool and the "test it for a week" step as the action. A fast-charge-only result must never be shown as green, and the model's money still never reads it. The cost-per-100-km formula (kWh per 100 km times tariff, plus fees) goes in as a sourced explainer, with the 18 kWh figure labelled as an example, not a promise.

### 3.3 Framework watch: rules not yet in force

The right-to-charge draft is the first thing in the folder that is not a fact but a timeline. Today's `tenant-right` sheet is accurate. What is missing is a durable way to carry such items, because several more are coming (levy from 2030, cantonal changes, the Federal Council's reply to the consultation).

**Change.** Add a `bev_watch` row type next to local rules: title, stage (draft, consultation, parliament, decided, in force), the official source and date, a `next_check` date, and a plain sentence that always says "not law" until stage is "in force". No dates of entry into force are shown unless the Federal Council has published one. The page shows one line in "My place": "Rules still being decided: tenants' right to a base installation (consultation ends 12 Oct 2026)". The next-move text keeps the advice that does not depend on the outcome: ask in writing for a coordinated base installation (not only one socket), look for neighbours who want the same, ask about load management, check cantonal and communal grants. A watch row is the right home for the 2030 levy too, outside the francs as before.

### 3.4 Information gaps the folder shows we do not yet cover

| Gap | Code | What the folder offers | Form |
|---|---|---|---|
| "Should I wait for better batteries?" | H5.2 (critical) | Empa deck: pack prices falling, LFP cells (cheaper, long-lived, now fast-charging), sodium-ion and solid-state at an earlier stage | New fact sheet "Wait, or not?" with two dated figures and one honest sentence: waiting has a cost too, and a car bought now keeps working. Needs primary figures from IEA or Empa before it is written. |
| A seller who cannot advise | H4.4, H4.3 | INFRAS: weak competence and incentives at the dealer; HSG: standard battery certificate, residual warranty, buy-back | Action kind `ask`: five questions to put to any seller, to copy. No dealer named, no model. |
| Used-car battery trust | H4.2, H6.1 | Already covered by the TCS test sheet and the age picker | Add the INFRAS pointer (P3 battery-ageing study) as a second neutral link. |
| "Will it track me?" | H5.x (new) | Six privacy notes: no solid study shows a BEV is worse than a petrol car; drivetrain is a poor proxy; the extra BEV-specific trail is the public-charging record; what a maker's privacy terms allow differs from what a car sends; a written question to the maker's data-protection contact is stronger than a brand ranking | New fact sheet and a copyable `ask` template, plus the setting to check at handover. It names no brand ranking and no model. Sources: Mozilla Privacy Not Included 2023, CNIL June 2026, Québec CEST August 2026, ADAC 2017 (old, say so). See 5.4. |
| Experience of owners | H5.1, loop | INFRAS: about 84 percent of buyers are satisfied and would choose an electric car again; over 80 percent of owners would not go back to petrol; negative experiences cluster in public charging and abroad | One survey figure on the trust sheet, with publisher, year and "survey, not your road". For people who already drive electric (the existing ending): "charging made easy" with the apps and access cards to check, not a sales hook. |
| Moving cost of charging abroad | H5.4 | INFRAS only names it | Do not build now. It is outside the six taps. |

### 3.5 The 2:1 idea: turn the story into a checkable thing

The deck's mechanism is precise: buying the small electric car carries a guaranteed right to use the bigger sibling for holidays, bikes, big moments. Our idea sheet explains the concept and the year-days grid. The deck suggests what a reader needs to ask for before this is more than a nice idea. It does not exist as a public offer, so the sheet must help someone ask for it or build their own version.

**Change.** Add a short "what must be written down" checklist to the 2:1 sheet and as an `ask` action: how many days a year are guaranteed, how early they must be booked, which class of car, who pays insurance and charging, what happens in a peak holiday week, what ends the guarantee, and who the contract partner is. The cheapest honest alternative stays on the sheet (rent or share for the few days; our `rentDays` lever already prices it). The sheet says whether any provider offers it today: at present none we can show. Keep the Mobility car-sharing link only after you or I have opened it.

### 3.6 Decision file

The HSG slide asks for an independent, verifiable decision aid that creates a "decision file for the concrete vehicle". Our "keep and share" plan is its start. The hard rule says no car-model picker, so the file is for "a car like this", with blank lines a person fills by hand.

**Change.** Turn "Save the plan" into a one-page printable decision file made in the browser (print or save as PDF, no server): the person's closed answers, the verdict and range, the assumptions with dates, the charging set-up result, the three questions to ask the seller, the battery certificate checklist, leasing criteria in one line each (residual value, kilometre allowance, early-return terms, who owns the battery warranty) and empty boxes for the model, VIN and quote. Nothing leaves the device. This is the thing a landlord, an employer or a bank can be shown, and it answers the HSG "decision file" item without taking a side.

## 4. Changes to architecture and data (summary)

| Layer | Change | Size |
|---|---|---|
| Taxonomy | `gap_codes` (INFRAS) on facts, actions, local rules; map taps and "unclear" answers; weekly backlog counts by code | small migration plus constants |
| Facts | New sheets: wait-or-not, will-it-track-me; change charging-setup sheet; extend tenant-right with watch row; extend 2:1 with the checklist | content plus migration, built from `facts.ts` |
| Actions | New `ask` and `test` rows: charging-set-up check, seller questions, privacy question, 2:1 terms, mapping test week | catalogue seed, all with neutral publishers |
| Watch | `bev_watch` table with RLS, stage and next_check; W7 checker also reads it | small |
| Local rules | `bev_local_rules` as planned. INFRAS adds the Zurich examples to seed: no cantonal vehicle tax for electric cars, communal parking-bay rules in building zoning since 2025, the cantonal charging-infrastructure grant. Each is re-checked at its primary page first | seed after verification |
| Dataset | Rows for charging network size and rest-area fast-charging share (official sources), survey figures with year and caveat | rows, status `proposed` |
| Page | Charging-set-up check on "My place"; "rules still being decided" line; "Wait, or not?" and privacy cards in "Ideas worth knowing"; decision file replaces plain plan | after the data above |
| Analytics | Pairs of `gap_codes` per session in cells of 10 or more, for the combination question | small view |
| JEV | Not adopted. Re-open only if free text is ever added | none |

Every new table gets row-level security, every new action needs a neutral publisher, and no sheet changes the francs.

## 5. Risks and how the plan avoids them

1. **New barriers.** Everything new on the result page sits behind a tap (panel, sheet or card). The three-tap charging check is optional and on "My place". The start page stays at six taps.
2. **Looking like Zurich's marketing.** The product is a neutral check built with Zurich. Z-Volt, Zurich Insurance products, a dealer, or a model must not appear as a next move. If Zurich wants a named link, it can sit in the footer as "Project partner", outside the result.
3. **Stale law.** Watch rows carry their own `next_check`. The page never states a date for entry into force that the Federal Council has not published.
4. **Foreign evidence.** The folder mixes Swiss, EU, US and Canadian material. Any figure that is not Swiss gets the word "outside Switzerland" or is dropped. J.D. Power and the OEM-origin discussion (US, China) are not shown.
5. **Privacy of our own data.** A random session id is pseudonymous, not anonymous (EDÖB). The weekly jobs read counts only. We add one line to the method page saying so, and the n8n webhook workflow, when it goes live, must not store execution data (inputs and outputs) beyond the test.

## 6. Build order (smallest useful first)

1. `gap_codes` and the mapping (one migration, no page change), plus the INFRAS link on the method page.
2. Charging-set-up check and the `settle-charging` rewrite (the biggest barrier and a verified source).
3. Framework watch row and the "rules still being decided" line.
4. Decision file in place of the plain plan.
5. Seller-questions action, 2:1 checklist, privacy sheet and action.
6. "Wait, or not?" sheet, after I have the primary IEA or Empa figures.
7. Local rules for the 26 cantons, starting from the Zurich examples.

## 7. Decisions for Martin (answered on 3 Oct 2026)

- **D1, the 2:1 idea and the word "Renault".** Martin: yes, Christian Zeunert at Zurich can confirm. Until he does, the sheet says the idea was "discussed" and that no public offer was found. Zurich is not a project partner, so nothing here needs their sign-off beyond that fact check.
- **D2, Z-Volt.** Martin: more information and links are good. Shipped as a labelled provider link in the public-charging sheet ("a charging service run by Zurich Insurance. A provider, not a neutral source"), never the next move, never first, never with a price. The CLAUDE.md rule was amended to say exactly that.
- **D3, the connected-car privacy sheet.** Shipped as a fact sheet, "What a connected car passes on" (SRF 2017, Mozilla 2023, CNIL June 2026, Quebec August 2026, no brand ranking), plus a copyable "ask the maker" message in the next-move catalogue. It sits outside the six taps and uses our own code X1.
- **D4, charging check.** Shipped as three optional taps on "My place". Reason from the decision model: taps give closed values that the next-move ranking and the gap counts can use, text gives neither, and neither touches the francs.
- **D5, primary pages.** Opened. The battery-outlook facts and the INFRAS link are written as dated facts with their sources; see the migration 0020 comment.

## 8. What shipped, and what is still open

**Shipped in this overhaul:** gap codes (26 INFRAS codes plus X1) stored with each final session; three internal views with cells of at least 5; the charging check; rules-still-being-decided rows (`bev_watch`); "Older than usual" labels; the one-page decision file (print or save as PDF, nothing sent); new next moves (test charging week, ask the seller, ask about car data, 2:1 terms); two new idea sheets ("Wait, or not?", connected-car data); plain-words glossary; share note with a link to the check; method-page text on what is kept and on INFRAS; links with a named publisher on the sheets; the retired EnergieSchweiz trial page.

**Earlier items now included in the same push:** the result-page reshape (next move, four panels), What if sliders, rebuilt climate view, urban/rural card and optional postcode, idea-sheet rewrites, front-page cards.

**Still open:** the petrol default (see DECISIONS.md); a static postcode table (needs permission to download a dataset); weekly n8n jobs are written but inactive; the Google Sheet template is stale; row-level low and high figures; German and French; Christian's confirmation of the 2:1 wording.
