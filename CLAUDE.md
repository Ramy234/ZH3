# BEV Navigator: instructions for Claude Code

Read these first, in this order, before you change anything:

1. `HANDOVER-CLAUDE-CODE.md`: the task, the order of work, and the checkpoints.
2. `BRIEFING-CLAUDE.md`: the decisions so far. Section 11 records the last review.
3. `REVIEW-2026-10-02.md`: the evidence table, the bugs already fixed, and the open items.
4. `n8n/STATUS.md`: what already exists in n8n and Supabase.

`AGENTS.md` and `.grok/` belong to the Grok sandbox this app was built in. Use them only to understand the build scripts. They do not define your role.

## The product, in one line

*Would an electric car already work for an ordinary week?* It is a neutral check. "Keep this car" is a fair, complete ending.

## Hard rules (never break these without Martin's explicit yes)

- **Money stays deterministic, in the browser.** The francs, the payback, the title and the steps come from `src/lib/navigator/model.ts`. No language model writes the verdict, the steps or a source.
- **AI may only classify** into a closed list, with a confidence, and there must be a rules fallback (see W6 in the handover).
- **No sales.** No dealer or insurer offer, no car-model picker, no "chance you will switch", no gamified rewards for switching.
- **Never collect** a name, an address, a coordinate or a free-text sentence. **A postcode is allowed since Martin's yes of 3 Oct 2026, on these conditions:** optional (never a barrier to the result), asked only on the result page with a short notice, stored only in `bev_locations` (never in the session payload or a counting view), deleted after 12 months, and shown outside the team only for groups of at least 10 (`PUBLIC_MIN_CELL`; internal views at least 5). Stored prices, quotes and litres are banded (`BANDS` in `session.ts`).
- **Links.** Neutral publishers (EnergieSchweiz, TCS, Swiss eMobility, ElCom, BFE, BAFU) carry the next move. Martin's rule of 3 Oct 2026: provider and company links, Z-Volt included, are welcome as information, but only in a labelled "compare" or "provider" list, never as the next move, never first, never next to a price, never called neutral. `links.test.ts` pins this.
- **Gap codes.** Each final session stores INFRAS gap codes (`gapcodes.ts`, 26 plus our X1). Counts show only groups of at least 5 internally and 10 outside. The session id is pseudonymous, not anonymous.
- **Climate never enters the francs.** No personal kilogram of CO₂.
- **These never enter the francs:** the 20 % insurance ceiling, grants, the draft federal levy from 2030, or a winter factor.
- **Do not retune** the situation weights.
- **Do not replace** a dated figure with a rounder one.
- **Mobile first.** No horizontal scroll at 360 px. Add and keep a Playwright test for it.
- **Saved logins.** Never open, read or edit any password in n8n or Supabase. Martin types passwords. Secrets go only in `.env.local` or in n8n credentials.
- **Workflows.** Never publish (activate) an n8n workflow, or point it at a real table, before one test insert into a `*_test` copy has succeeded.
- **Every new Supabase table gets row-level security on.**

## Commands

```bash
npm install
npm run dev                  # http://localhost:8080 ; PGLite when DATABASE_URL is unset
npm test                     # existing script tests
npx tsc --noEmit             # typecheck
node n8n/build.mjs           # rebuild n8n/bev-navigator.workflow.json from n8n/src/*.js
```

To run against Supabase ZH3, put `DATABASE_URL` in `.env.local` (see `.env.example`). Then:

```bash
set -a; source .env.local; set +a; npm run dev
```

Vite does not pass `.env.local` to server code by itself.

## Working style

- `git init` if there is no repository yet.
- Work on the branch `redesign-2026-10`. Commit once per stage in the handover, section 8.
- Save 360 px screenshots per stage to `docs/screens/<stage>/`.
- Record every departure from the brief in `DECISIONS.md`, with a one-line reason.
- Stop at every ✋ in the handover and show Martin before going on.
- `_before-review-2026-10-02/` holds the originals of the files the review changed. Do not edit it.
- `migrations/0007_bev_notes.sql` creates a free-text table that the app no longer uses. Do not write to it. Ask Martin before removing it.
