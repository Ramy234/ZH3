# Briefing for Claude

Swiss check for someone who still drives a combustion car. English prototype, October 2026. Read this before changing the page. A design change is allowed only when the ending would otherwise be missed. Do not add a feature this file does not ask you to explore.

## 1. Goal

The question on the first screen is the product: would an electric car already work for an ordinary week?

The check turns an imagined barrier into a size. The ordinary week, the rare trip, and the years until a lower running cost has covered the extra price. A fair ending is allowed to be: keep the car you have. A refusal does not have to move. The page must not talk anyone into a car.

Success is not a switch. Success is that the barrier stops feeling infinite, and that the person can see why. That has not been tested. Five to eight sittings, on a phone, with no explanation, come before more product.

Out of scope, on purpose:

- No sale, no dealer lead, no name, no postcode, no free-text diary.
- No language model writes the advice, the verdict, or a paragraph.
- Climate does not enter the payback. Money does not pretend to be a footprint.
- Eight years is the window a federal cost study used in March 2023. It is not a grade and not a lifecycle.

## 2. Feedback already absorbed

Do not reopen these unless an interview contradicts them.

| What was wrong | What the page does now |
|---|---|
| Opening copy did not say what the check was | First screen asks about an ordinary week. Keeping the car is named as a fair ending. |
| A blank kilometres box invites a wrong number | Closed bands, with a typical figure if the person is not sure. |
| Payback was a year with no meaning | The page says what is divided by what, what happens if they sell before that year, and that nobody sends the difference. |
| Winter note was a wall of text with a repeated label | A short fact: a figure, a comparison, lines that open. |
| “Go finish this on the TCS site” contradicted the product | A canton tap applies the TCS tax table of February 2026 inside the sum, for the nearest published car, not their registration. The link is the receipt, not the method. |
| Insurance has no open premium list | The francs stay a class placeholder. Comparis, 19 August 2025, is linked: full cover, July 2025, electric cheaper in 70 percent of cases and dearer in the rest. Zurich’s own page offers up to 20 percent for an electric, plug-in or full-hybrid car. That ceiling is named in the insurance line, not applied as a switch (switch removed 2 October 2026). Comparis, 11 November 2025 (the publisher’s date; earlier notes said 12), said many insurers including Zurich and Allianz expect higher premiums in 2026 because repairs cost more. That is all cars. TCS, 6 January 2026, put casco up 14 percent inside a sample car whose kilometre cost still fell. No 2026 electric-versus-petrol count was found up to 2 October 2026. |
| A postcode can identify a household | Optional canton only, after a number exists. ElCom commune-mean for that canton, national mean otherwise. |
| The send button sat under the fold | Reaching the result stores one anonymous session. A later change stores again. The worked example is not stored. |
| “Open the publisher’s file” did not say where | The link text is the document name. |
| Climate was missing from a sustainability course, then a single gas would have become the sales argument | A line beside the money. New mid-size petrol = 100, new electric on the Swiss consumer mix = 45. FOEN, 27 April 2023, PSI inventories 2022. About 55 percent lower greenhouse gases. Not their kilometres. Not the car they already own. |
| The climate marks on the preview image were longer than the cost lines | Shortened to the same span, year 0 to year 8. |

Still unresolved, and not to be invented:

- Vehicle price, insurance, service, pump price, and public charging are placeholders. Say so.
- The situation weights were chosen, not measured. They do not enter the francs, except when kilometres are “not sure”.
- The path asks one follow-up. A shared garage that also takes a holiday only hears the charging question.
- The lifecycle that would match the decision — keep this car versus replace it — is not in the FOEN study. Do not multiply their kilometres by a factor and call it their footprint.
- German waits until the English sentences survive a sitting.

## 3. Product, architecture, database, n8n

Stack: TanStack Start, React 19, Tailwind v4, Vite. One route. The decision and the arithmetic run in the browser. Server functions only read public data and append a session.

Flow, in order:

1. Barrier (charging, cost, trips, trust, or not sure).
2. Where the car sleeps.
3. One follow-up, chosen by rule: work, the rare trip, a used car, or the price.
4. Car class, fuel, and a kilometres band can be corrected. Until then a typical car is used, and the page says so.
5. Result. Switches recalculate immediately. A canton is optional.

Five names, so the workflow matches the page. The import exists and is inactive. Nothing in n8n is running.

| Step | n8n node | What it may do |
|---|---|---|
| Taps | Form trigger | Closed answers only. Webhook `POST /webhook/bev-session`. |
| Situation | TypeSafe choice | One value from the six labels. It must not write a paragraph and it must not price the car. |
| Payback | Code | Checks that the browser’s francs arrived. It must not recalculate them. |
| Switches | Switch | Rejects any key outside the eight switches. |
| Store | Postgres | One insert into `bev_sessions`, same payload shape as `session.ts`, id from `gen_random_uuid()`. Credential name `bev Postgres`. The file still says `SET_ME`. Node code lives in `n8n/src`, built by `n8n/build.mjs`. |

The file is `n8n/bev-navigator.workflow.json`. Leave it inactive until one test insert succeeds against a copy of the table. A later schedule, for a file such as pump prices, is a second workflow. It is not part of this one. n8n does not classify the person and it does not write the result.

Table `bev_sessions`: `id`, `client_session`, `stage` (`mid` or `final`), `payload` as JSON. Insert only. The payload whitelist is closed enums plus the francs, the toggles, which fact sheets were opened, whether the home rate was the ElCom mean, and the canton code if they picked one. No name, no postcode, no sentence, no coordinate.

Live public data, called by the app, not by n8n:

- ElCom household tariff, H4, 2026, via SPARQL on `ld.admin.ch`. National mean, or the mean of communes in the chosen canton.
- TCS cantonal vehicle tax, February 2026, copied into the code. Six reference cars, all 26 cantons. Mapped to the nearest class and fuel, and named as that car.
- Facts live in Postgres and can be dated. The layout of a fact (the figure, the comparison) lives in code.

n8n’s later job, separate from the session workflow, is a schedule: import a file such as pump prices, refresh a tariff table. It does not classify the person and it does not write the result.

Anonymous id is a UUID held in the browser. Sharing sends text only: both yearly costs, the money at the start, the worry they named, and the title of the next step. Not where the car sleeps, and not the session id. Outbound links for advice are EnergieSchweiz and the tenant charging guide. The person types a place on those sites. This app does not receive it. The session whitelist now also keeps a typed list price, a resale, a litre figure between 3 and 14, a charging-gear quote, rental days of 0, 2, 4 or 8, the year frame, and the charge mix. A postcode is still not stored. Reaching the result stores the session. A later change stores it again. The plan text on the page is that same case, rewritten as they edit. A send button appears only if the store fails.

## 4. The Jeff step, and how far it can go

In the code this is called a Jeff-shaped step. Closed questions, explicit weights, a softmax over six situation labels. Money is a separate arithmetic. No language model.

What it does today:

- Scores six labels (renter, house, distance, cost, skeptic, occasional). If two are close, the page says so, and says the francs are the same.
- Picks one follow-up from the barrier and the parking.
- Sets the starting position of the switches. The person can turn every one off.
- Fills a kilometres default only when they tap “not sure”.
- Splits charging with fixed shares (home, work, public), not with a share the person stated.
- Suggests a smaller class only when the rare-trip switch is on and they do not tow. Rental days are 2, 4, or 8.
- Attaches a source to a claim. The classifier does not choose sources.

Full potential, still inside the same rule:

- The next tap is the closed question that would move the payback, not a question that only changes the label. Ask it only then. Stop when a further answer would not change the fair ending.
- A second question is allowed after interviews show which one moves the year. It is still one tap from a fixed list. It is not a chat.
- Weights can be published and then revised. They are not a model to be trained in the dark.
- The stored rows can be counted: barrier, fact opened, canton used or not, payback inside eight years or not. That is the research instrument. It cannot see a change of mind.
- A TypeSafe node may replace the situation weights later, if it returns the same six labels and a confidence. The price function stays deterministic and inspectable.
- Every franc that moves must name the input that moved it. Every input on screen must move a franc or be labelled as not in the sum. The situation label is the second kind, and the page already says so.

What Jeff must not become:

- A paragraph, a persuasion score, or a probability of “will switch”.
- A personal kilogram of CO₂.
- A fitted black box that cannot be read back to the person.
- A reason to collect a postcode, a free-text reason, or a chat log.

## 5. Graphics on the page now

Recharts draws two charts. Do not add a third library.

The cost chart is the first picture on the result. Keep is a dashed black line. Switch is a thicker green line. The key sits above the lines and uses those same strokes. The left scale is thousand francs, ticks ending in k, so they are not read as years. The numbers along the bottom are the years. Under the chart, one row sets how far the picture goes: 8, 12, 16, 24 or 32. Eight is marked as the study. Four years was removed so the row stays one line. The payback year does not change when the frame changes. Only whether the crossing sits inside the picture changes — and with it the title. Since 2 October 2026 the row is labelled as how long they would keep the next car, and the covered line says “if you keep the next car that long”.

A second row is New, Used, or One class down. New and Used are one choice, same class. One class down is separate: a smaller car, and the rare days are rented. It can sit on new or used. It stays off if they tow. A price they typed is set aside only when they tap New or Used, so the reference price can move. The two cards, the lines, the payback and the next steps are the same calculation. The situation label does not read these three. They are ways of pricing the case, not a new person.

Climate is not on that chart and not on those year buttons. A control under the chart, “Climate, if you want the comparison”, opens two other charts. Whole life, new mid-size petrol 100 against new electric on the Swiss consumer mix 45. Then the same study’s 5 km trip: public transport 1, battery electric about 6, mid-size petrol about 12. A bicycle is a sentence, about 26 times and 12 times, because the bar would not show. No model name. No year path. The study does not publish one. Keeping the car they own is not in it.

The year is also added up under the lines: fuel or power, insurance, tax, service, and rental days if any. That total is not the price of the car. When the extra price is zero, the year is the whole money difference.

Not worth drawing: a gauge, a donut, a car, a map, climate on the franc axis, or a winter range. There is still no winter factor.

## 6. A hook, not a game

The first question is the hook. Gamification that awards a switch, a streak, points, or confetti fights the goal. Do not add it.

Hooks that can be sketched, and then shown in an interview before they are built:

- A worked example is already one tap. Keep it labelled as not their life.
- “What would have to be true” — one counterfactual already implied by the switches. The interesting event is the person turning a switch off, not a score going up.
- Sharing the year with one other person. The share text exists. Do not add a leaderboard or a public total.
- Progress that can end early. Stopping at “keep the car” is a completed check, not a lost level.

If a sketch needs a point, the only honest one is: did the barrier become a number they can disagree with? That is observed in an interview. It is not a badge.

## 7. What the result shows, in order

1. The finding, as the title. “Keep this car” when the extra price is not covered inside the picture, or when running it does not cost less. “The extra price is covered here” when it is. Under it, three short lines: how much less a year and that this is fuel or power, insurance, tax and service; how much more at the start, after their car is counted in; how many years that takes, and where the picture stops. A used car or one class down is named only when it is not already on. The session note sits under that, not in front of it.
2. Two cards: a year keeping the car, and a year switching plus the extra price at the start.
3. The cost chart, the year frames, New / Used / One class down, and the link to the 23 March 2023 factsheet.
4. Climate, only if they open it.
5. One sentence on whether the lines cross inside the picture.
6. The barrier they named, and the first next step.
7. The switches. Above them, at most three readings, and only when they match the case: 2:1, a mobile charger, the battery check, why prices are not live, the canton tax, or grants and a solar roof.
8. The workings: what the payback year is, with the two study links even when there is no payback year; the year added up; where the kilometres charge.
9. The worries the francs do not close: the building, winter, not wanting one. Climate is not in this list.
10. The steps, with a list they can copy when one exists.
11. The note for someone else.
12. What went into the number. A row can change the car, the distance, the parking, the mix, the price, the resale, the litres, the gear, the rental days, and the year frame. Electricity is not a typed rate. It points at the place, further down. Work and public stay placeholders.
13. The plan, as text, updating with every change. Copy and download are that text. The stored session follows.
14. A place, if they want a closer electricity figure. A canton, or a postcode that is used and not stored.

On the question pages, after the car sleeps and before the result, a bar shows the payback only once class, fuel and distance are tapped. Before that it says the year waits. The scale runs to 32. The mark is at 8, a quarter of the way, and it links the factsheet. It does not cap the drawing at 16 while the words say year 35.

The first screen was not rewritten in this pass. The open criticism, for an interview, is that “what would still stop you” treats them as the obstacle, that the two “read” links are exits before a tap, and that “I am not the one who decides” is not a choice. Do not add that choice unless the path for it already exists.

## 8. Research findings as of 2 October 2026

Trust `src/lib/navigator/facts.ts` and `src/lib/navigator/model.ts` over the SQL seed in `migrations/0002_bev.sql`. The seed was written earlier. Battery and canton tax have since been corrected in code. The fact sheet the person sees uses the code layout.

Dated findings, and what was done with each:

**Money window.** EnergieSchweiz / Swiss Federal Office of Energy, 23 March 2023. Factsheet and full study. An eight-year window and 15,000 km a year, for a newly bought car. The full study’s insurance profile is Aarau, and its prices are from 2022. Those prices are not the francs in this check. The window is used as a comparison, not as a pass or a fail. Factsheet: https://www.newsd.admin.ch/newsd/message/attachments/76353.pdf Full study: https://www.newsd.admin.ch/newsd/message/attachments/76392.pdf

**Home electricity.** ElCom publishes communal household tariffs as linked data. This app queries H4 for 2026 on `ld.admin.ch`. A measured national mean during this project was about 28.28 rappen per kWh across roughly 2,300 communes. Zurich’s communal mean was about 25.02 rappen across about 170 communes. The page uses the mean of the chosen canton, otherwise the Swiss mean, and converts rappen to francs. It is not a household bill. Work charging, public charging, the solar share, and the “cheaper tariff” switch are still placeholders.

**Cantonal tax.** TCS comparison, February 2026, six named cars, all 26 cantons. The table is copied in `model.ts`. For the Tesla Model Y in that table: 0 francs in Glarus, Solothurn and Zurich, 921 francs in Fribourg. The Dacia Spring is the small electric car and is often much lower. Geneva’s electric exemption had already ended. Glarus and Solothurn have said theirs ends in 2027. A canton tap applies the nearest published car and names it. It is not a tax assessment. Insurance has no comparable open list, so it stays a class placeholder.

**Purchase grants.** No federal cheque for buying an electric car. A Motoro roundup updated 10 September 2026 names Ticino at 4,000 francs for a new electric car, capped, and other pages also name Basel-Stadt and Vaud. The lists disagree. None of those amounts is subtracted. A solar roof is a different investment (Pronovo pays the federal one-off after the system runs). The solar switch only cheapens an illustrative share of home charging.

**Range worry.** gfs.bern Mobility Monitor, 13 September 2025: 78 percent still named range. No winter factor is applied. One percentage would pretend to be their road, speed and heater. The check treats a rare long trip as a reason to borrow, not as a reason to size the owned car for the worst day.

**Tenant charging.** No general right to a charger. Article 260a of the Code of Obligations requires the landlord’s written consent for a change to the rented space. A draft amendment to the Energy Act, consultation opened 19 June 2026 on Motion 23.3936, running to 12 October 2026, would in draft let a resident with a bay require a basic installation, with the owner paying that basic work and the user paying the charging point. It is not law. Not legal advice. Not a workplace. A mobile charger on an existing line was discussed with Designwerk as an example. That note is unverified with the manufacturer and is not in the year cost.

**Used battery.** TCS, 27 November 2025, about 130 used electric cars. A certificate should show date, kilometres, method and result. It does not cover brakes, charging hardware or history. The check adds a placeholder certificate cost when the used-car switch is on. It does not price a test.

**Smaller car.** The 2:1 idea is a project concept from October 2026: own the ordinary car, rent the exception. A dealer pool was discussed as one way. It is not an offer and not in the price until the days and the day rate are real. The day rate here is a placeholder.

**Climate method.** ISO 14040 and 14044. Attributional studies assign a share of today’s impacts to a car as produced. Consequential studies ask what changes if this person acts. Published Swiss car figures are attributional. This check is closer to the second question, because the alternative is often the car they already have.

Boundaries, and which Swiss product uses them:

- Tank-to-wheel counts the exhaust. An electric car looks like zero. Not used.
- Well-to-wheel adds fuel or electricity supply and stops before the factory. The Swiss energy label uses this. A treeze study for the federal energy office, 1 June 2026, puts the consumer electricity mix (2022–2024) at about 0.22 litres of petrol-equivalent per kWh. The car body is excluded.
- Cradle-to-grave adds building the car, the battery, maintenance and disposal. FOEN, 27 April 2023, using Paul Scherrer Institute inventories from 2022, compared new mid-size cars of about 1,250 to 1,750 kg. On renewable electricity the electric car was about 65 percent lower in greenhouse gases, about 44 percent lower on the Swiss total environmental score, and about 32 percent lower in cumulative energy. On the consumer mix: about 55 percent lower greenhouse gases, about 23 percent on the total score, and only about 5 percent on cumulative energy. A climate-only number hides that the other scores move less.

The page shows only the consumer-mix greenhouse-gas comparison, as 100 against 45, beside the money. PSI’s carculator can do size and year for cars you build. Mobitool splits driving, fuel supply, maintenance, construction and the road. Green NCAP uses one kilometre and a life of at most 240,000 km or 16 years. None of these is the eight-year money window. None of them answers keep-versus-replace for one household, because the old car’s manufacture is already spent. Do not multiply a published factor by the kilometres in this check.

**Privacy and handoff.** Under the revised data protection act, a postcode plus this case can identify a household. A canton cannot, at the same resolution, and it is optional. The share message is the year in text. It does not include the session id. Advice beyond the canton is an outbound link only: the EnergieSchweiz advice directory, and the EnergieSchweiz guide to charging in a rented building. The person types a place on those sites. This app does not store it and does not send it to a dealer. A dealer lead form was considered and rejected.

**How a source is shown.** The same rule as a citation card, not a chat answer. The claim and the link sit together. The link text is the document’s name. Next to it, one sentence on what the source does not confirm. The classifier does not pick sources. A language model is not used to invent one.

**What the sessions can teach, and what they cannot.** Rows are closed answers. They can show which barrier was tapped, which note was opened, whether a canton was picked, and whether the payback fell inside eight years. They cannot show that a person changed their mind. The weights behind the six situation labels were set by hand. They are not a fitted model.

## 9. Free sources, and where to find them

One free machine interface is already in the app. It needs no key.

| What | Where | How it is used |
|---|---|---|
| ElCom household electricity, category H4, standard product, 2026 | Query endpoint https://ld.admin.ch/query — graph https://lindas.admin.ch/elcom/electricityprice — canton URIs `https://ld.admin.ch/canton/{bfs number}` | SPARQL from the server. National mean, or the mean of the communes in the chosen canton. Not a household bill. |

Free publications. Read them. Do not pretend they are APIs, and do not scrape them on a timer.

| What | Where | What it is not |
|---|---|---|
| Cantonal vehicle tax, February 2026 | https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/umwelt-mobilitaet/motorfahrzeugsteuer.php | Not an API. The table is already copied in `model.ts`. |
| Used-car batteries, TCS, 27 November 2025 | https://www.tcs.ch/de/der-tcs/presse/medienmitteilungen-2025/e-occasionen-im-test.php | Not a test price. |
| What the TCS battery quick test does not cover | https://www.tcs.ch/de/der-tcs/sektionen/zuerich/news/batterietest-elektrofahrzeuge.php | Not a certificate for the car on the page. |
| Advice on a used electric car | https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/elektromobilitaet/elektroauto-occasion.php | Not a listing price. |
| TCS kilometre costs 2026, release of 6 January 2026 | https://www.tcs.ch/de/der-tcs/presse/medienmitteilungen-2026/kilometerkosten-2026.php (tool: …/kontrollen-unterhalt/kilometerkosten.php) | Not the method. The 6 January 2026 note is that casco rose. Not an electric-versus-petrol count. |
| Cost-study factsheet, 23 March 2023 | https://www.newsd.admin.ch/newsd/message/attachments/76353.pdf | Sets the eight-year window. Not these francs. |
| Comparis electric-car insurance, 19 August 2025 | https://www.comparis.ch/autoversicherung/praemien/elektroauto-versicherung | Full cover, July 2025. Not a premium for this person. |
| Zurich electric-car page, up to 20 percent | https://www.zurich.ch/en/private-customers/mobility-travel/electric-vehicles-insurance | A ceiling on their own page. Not the typical gap. |
| ElCom price lookup | https://www.strompreis.elcom.admin.ch/ | The home figure can be checked. Not a tariff this page types in. |
| Cost-study full report | https://www.newsd.admin.ch/newsd/message/attachments/76392.pdf | 2022 prices, Aarau insurance profile. |
| FOEN car comparison, 27 April 2023 | https://www.bafu.admin.ch/dam/de/sd-web/-1KADIYDsYhT/umweltauswirkungen-von-personenwagen-mit-verschiedenen-antriebssystemen.pdf | New against new. Not their kilometres. |
| Energy-label supply factors, treeze for BFE, 1 June 2026 | https://pubdb.bfe.admin.ch/de/publication/download/12674 | Well-to-wheel only. Not on the page as a personal footprint. |
| EnergieSchweiz advice directory | https://www.energieschweiz.ch/beratung/energieberatung/ | Outbound link. The app does not receive the place they type. |
| Charging in a rented building | https://www.energieschweiz.ch/ladeinfrastruktur/werkzeuge/ladeinfrastruktur-in-mietobjekten/ | Same. Not a commune lookup. |

Free code, not a service to call for each person:

- PSI carculator, for cars you build, by country, size and year: https://www.psi.ch/en/ta/carculator and the package `carculator` on PyPI. A scheduled class average could be studied later. A per-session call would invent precision the taps do not have.
- Mobitool factors, from treeze, are an adjustable workbook, not an endpoint: https://www.mobitool.ch

No free open API was found for a Swiss insurance premium, a transaction price for the car, or a live public-charging tariff. Do not wire a scraper and call it a source. Pump prices are the same until a dated official file is chosen.

## 10. What to do with this brief

The running check is the prototype. This file, `PROMPT-CLAUDE.md`, `n8n/bev-navigator.workflow.json`, `src/lib/navigator`, `src/components/navigator` and `migrations/0002_bev.sql` are the package. A design change may be made only when the ending would otherwise be missed or misunderstood, and only with what is already on the page. The n8n file is an inactive import: it checks the closed session and inserts a row. It does not calculate. Do not retune weights, do not add a second follow-up, do not put climate inside the payback, and do not replace a finding above with a rounder number.

## 11. Review of 2 October 2026 (one pass)

Recorded here so the next reader does not undo it. Details and sources: `REVIEW-2026-10-02.md`.

- The free-text note (“Something a tap cannot say”, table `bev_notes`) was removed. It collected a sentence. Rows already in `bev_notes` should be read once and deleted by the owner.
- The 20 percent insurance switch was removed from the francs. The key `insDiscount` stays in the row, always false.
- One class down is off for a small city car. It used to add rental days without a smaller car.
- On a phone the plan text (an unbroken URL) widened the page to about 620 px and cut off the title lines. Fixed.
- Rows now carry `model` (arithmetic version) and `fromSample` (the worked example was touched, then stored).
- Glarus decided on 3 May 2026 that electric cars pay from 1 January 2027 (25 percent off until 2030). Solothurn’s parliament decided on 6 May 2026. The February 2026 table still applies to every year in the sum; the tax line says so for GL and SO.
- A federal levy on electric cars from 2030 was proposed on 26 September 2025 (about 5.4 rappen a km, or 22.8 rappen a kWh; consultation closed 9 January 2026). Named in the fuel line, not in the francs.
- Closed on 3 October 2026: the hybrid now pays the petrol litre price (`pumpFor`, model `2026-10-03-r3`; the 1.48 cell is gone). The winter fact now says 79 percent of non-buyers (the report summary prints 78; 1,002 voters; auto-schweiz commissioned it), see migration 0014.


### n8n, 2 October 2026 (evening)

The session workflow is now in the n8n workspace. It is unpublished, and the insert has been tested once against `bev_sessions_test` in the Supabase project ZH3. See `n8n/STATUS.md`. Supabase is the Postgres for both the app and n8n. PGLite inside the app cannot be reached by n8n.
