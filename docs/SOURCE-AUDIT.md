# Source audit, 3 October 2026

Rule (Martin, 3 Oct 2026): **no information in the app without a source.** This file says how that is enforced, what was checked, and what is still open.

## How it is enforced

`src/lib/navigator/source-audit.test.ts` runs with the other tests and fails the build when:

- a fact sheet has no source line of more than a few words, no date, or (unless it is marked as a project idea) no link;
- a sheet that shows a figure or a comparison has no caption saying what the figure is, or no link;
- a federal-source card lacks a publisher, a date, a link, "what it supports" or "what it is not";
- a dataset row that is not a labelled placeholder lacks a publisher, a date or a link; five rows must be sourced (home rate, horizon, travel card, petrol, diesel);
- a "rule still being decided", a rights link or a next-move link lacks a source, a date or a public https address;
- a link note says too little to tell the reader what the link is.

`links.test.ts` pins where company links may appear (labelled, never first, never next to a price). `dataset.test.ts` fails if a page sentence carries a number that should come from the dataset. A fourth guard keeps the Sheet template in step with the dataset.

## What was fixed in this pass

- `tenant-right` and `local-grant` sheets had no link. Both now have one.
- Page sentences about prices (pump price, electricity price, year of the figure) now read the dataset's own note, so the sentence and the number cannot disagree.
- New sheets (value loss, leasing, 48-hour test drive, tenant right, local grant) each carry publisher, date and link.
- The swisstopo postcode table: the dataset page on opendata.swiss states "Open use. Must provide the source." The app shows ©swisstopo and links the dataset. (An earlier note in `DECISIONS.md` that stopped the download on licence grounds is corrected there.)

## Known gaps (kept in the test so they stay visible)

| Sheet | Gap | What closes it |
|---|---|---|
| winter | The gfs.bern Mobility Monitor PDF sits on a mailing host and was not confirmed as a stable public address. The sheet is labelled accordingly. | A stable publisher link, or a TCS winter-range page for the same claim. Then delete the entry in `KNOWN_GAPS`; the test tells you to. |
| workplace | Whether an employer offers charging is an assumption by design, not a fact, and the sheet says so. | None needed; keep the label. |

## Dated statements that will go out of date

These sentences name a date. Each is also a watch row or a dataset as-of, so a check should catch them, but they are worth a manual look on the dates below.

| Statement | Date | Where |
|---|---|---|
| Rules in a draft stage "until 12 October 2026" (consultation windows) | 12 Oct 2026 | `watch.ts`, `rights.ts`, `facts.ts` |
| Second-class travel card CHF 4,095 "from 13 December 2026"; CHF 3,995 until 12 December | 13 Dec 2026 | `dataset.ts`, `without-card.tsx`, `not-driving.ts` |
| Grants and levy facts "from 1 January 2026" | 1 Jan 2026 | `facts.ts` |
| A price figure "up to 2 October 2026" | 2 Oct 2026 | `model.ts` |

The travel-card price is reported by two news sites; the SBB page itself returned 404 when checked, so the row stays a labelled placeholder until the primary page returns.

## Figures that are placeholders by name

All 60 class rows (consumption, insurance, maintenance, resale by car class) remain `placeholder`: no free public Swiss source by class was found. They are shown as placeholders on the page. A Zurich-supplied class-level source (for example residual values) would replace them, and **Christian must confirm** anything taken from Zurich material.

## Petrol and diesel

The litre price is the time-weighted 2026 average of the TCS table (1 Jan to 19 Sep), because a federal monthly series was searched for and no clean file was reachable. W3 has a BFS branch that stays idle until its XLSX link is pasted; when that works, the BFS series replaces the TCS average. A figure for July and August 2026 was not recovered and is not inserted: no invented figures.
