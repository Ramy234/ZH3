# Wording file for German and French (to be done later)

German and French wait until the English wording has settled. This file collects what we learned about **words**, so the translation starts from plain meanings and not from the English surface. Every German or French term below is a **candidate for a native speaker to check**, not a final choice. Nothing here has been reviewed by one.

## What we learned in English

1. **People do not read "amortisation" or "depreciation".** The page says what happens: "the extra price is paid back", "the car loses value". Translate the meaning, not the technical word. The terms "Abschreibung" and "amortissement" are accounting words and would repeat the problem.
2. **"Payback" meant two things.** It was read as "when do I get my money back" and as "how long until it breaks even on running costs". The page now shows two lines: what you save each month, and how many years until the extra price is covered. Keep two separate phrases in every language.
3. **"Total cost of ownership" is not said to a visitor.** Say "what the car costs you over the years". The abbreviation TCO appears only in source titles.
4. **A source name is never translated.** TCS, ElCom, EnergieSchweiz, BFE, BFS, swisstopo stay as they are. The label of what they published may be translated, the title of the document is not.
5. **"Keep this car" is a full answer**, not a failure. Avoid wording that implies the person should switch ("still", "not yet"). In German "weiter fahren" and in French "garder la voiture" are the candidates; check that neither sounds like a verdict.
6. **Money.** Francs are written `CHF 3’833` (typographic apostrophe as the thousands mark). Keep that in German. French-speaking Switzerland also uses the apostrophe or a narrow space; choose one and use it everywhere. Percent sign attached or spaced: decide once.
7. **No personal CO₂ number.** Any translation of the climate sentences must keep this: it speaks about cars and grids, never about "your" kilograms.
8. **Dates.** Spell the month (3 October 2026), never 3.10.26.
9. **Tap labels must be short.** A German label is on average 30 % longer than English. The six start taps and the tab labels (What if, My week, My place, Climate, Sources) must still fit one line at 360 px. The layout check (`scripts/overflow-check.mjs`) must be run in each language.

## Terms to settle

| English (as shown) | Plain meaning | German candidate | French candidate | Note |
|---|---|---|---|---|
| charge (the car) | put electricity into the battery | laden | recharger | |
| a plug at the place the car sleeps | a socket where the car is parked overnight | Steckdose dort, wo das Auto nachts steht | une prise là où la voiture passe la nuit | |
| wall box | home charging unit | Wallbox | borne de recharge murale (wallbox) | Wallbox is common in Swiss German |
| shared garage | one garage for several households | Sammelgarage | garage collectif | |
| mobile charger | a charger you carry | mobiles Ladegerät | chargeur mobile | the sheet cites a maker's data; keep "21 kW DC" as the source says |
| tenant | person who rents | Mieterin, Mieter | locataire | the sheet names a legal right; the legal term must be checked by a lawyer, not by a translator |
| the extra price is covered | the saving has paid for the higher price | der Mehrpreis ist ausgeglichen | le surcoût est couvert | avoid "amortisiert" / "amorti" in the headline |
| the car loses value | what it sells for later is lower | das Auto verliert an Wert | la voiture perd de la valeur | |
| leasing | rent a car for a fixed term | Leasing | leasing | one sheet; the credit law wording is checked separately |
| 48-hour test drive | try the car for two days | 48 Stunden Probefahrt | essai de 48 heures | |
| keep this car | the ending where nothing is bought | dieses Auto behalten | garder cette voiture | |
| neutral | no seller behind it | neutral | neutre | do not call a company link neutral in any language (a test checks the English) |
| placeholder | a stand-in figure, labelled | Platzhalter | valeur provisoire | the label must stay visible |
| cantonal vehicle tax | tax by canton on owning a car | kantonale Motorfahrzeugsteuer | impôt cantonal sur les véhicules à moteur | check the exact name per canton |

## Where the text lives (for the person translating)

- Screen text: `src/components/navigator/*.tsx` (long sentences are inline; there is no translation layer yet).
- Sheets (what each idea says, its sources and links): `src/lib/navigator/facts.ts` (`FACT_VIEW`) and the `bev_facts` table (migrations 0020, 0023, 0028).
- Model sentences with a figure in them: `src/lib/navigator/model.ts`, which reads the dataset notes (`DATA_NOTES`). A figure never goes into a sentence by hand.
- Classifier keywords: `n8n/src/w6-rules.js` and `src/lib/navigator/words-rules.ts` already contain German, French and Italian keywords; the smoke test has German and French sentences. Their accuracy is not known until the test is run.

## Order of work, when the time comes

1. Introduce one string table (key, English, German, French) and move screen text into it, keeping the English as the source. Do not translate inline.
2. Sheets next, with the primary sources: for each source say whether a German or French version exists, and link the one in the reader's language.
3. A native speaker reads it on a phone at 360 px, with the tap labels, before anything goes live.
4. The classifier's rules and smoke set get real German and French phrasing from sittings, with consent, before Jev is trusted in those languages.
