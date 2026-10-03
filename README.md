# BEV Navigator

*Would an electric car already work for an ordinary week?* A neutral, Swiss-only check. "Keep this car" is a fair, complete ending.

This is a student prototype built for an HSG consulting project. **It is unpublished and covered by an NDA. Do not share the live link or this repository outside the project team without asking Martin.**

## Run it on your own computer (no account, no setup)

```
npm install
npm run dev
```

Open http://localhost:8080. With no database address set, the app uses a small built-in test database that lives only on your computer. Run `npm test` to check everything (about a minute).

## Set up your own copy with your own Supabase database

You do not need Martin's database, and you must never ask for his password. Your copy starts empty and is separate from his.

1. **Create a Supabase project** at supabase.com (New project). Keep the database password somewhere safe.
2. **Copy the connection address:** in the project, press Connect, choose the **Session pooler** tab and copy the address. It looks like this, with your own password in place of `<PASSWORD>`:
   `postgresql://postgres.<project-ref>:<PASSWORD>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=no-verify`
3. **Build the tables.** In Terminal, in the project folder (one line; the address stays on your computer):
   ```
   DATABASE_URL="paste-the-address" npm run db:migrate
   ```
   This applies every file in `migrations/` once, in order. It is safe to run again; it only applies what is missing.
4. **Run the app against it locally:** put `DATABASE_URL=...` in a file called `.env.local` (it is git-ignored and never uploaded), then
   ```
   set -a; source .env.local; set +a; npm run dev
   ```
5. **Deploy your own copy (optional):** create a Vercel project from your copy of the repository and add `DATABASE_URL` under Settings, then Environment Variables. Every deploy runs the migration step automatically (`npm run build`).

Never commit `.env.local`, a password or a key. Secrets go only in `.env.local`, in Vercel's settings, or in n8n credentials.

Optional settings, all off by default: `SITTINGS_KEY` (turns on the internal counts page at `/sittings`), `WORDS_BOX` and `WORDS_URL` (the AI step of the own-words box; leave unset, the box then uses keyword rules on the phone only).

## Where things are

| Folder or file | What it holds |
|---|---|
| `src/lib/navigator/model.ts` | The money model. Deterministic, runs in the browser. |
| `src/lib/navigator/facts.ts`, `watch.ts`, `rights.ts` | The fact sheets, the rules still being decided, the links. Every one needs a source. |
| `migrations/` | The database, one file per step. Dataset versions are insert-only. |
| `n8n/` | Workflows W1 to W8, their builders and `STATUS.md` (what is switched off and why). |
| `docs/` | Plans, decisions, source audit, risks, wording notes. Start with `CLOSE-THE-DOTS.md` and `SOURCE-AUDIT.md`. |
| `DECISIONS.md` | Every departure from the brief, with the reason. |
| `CLAUDE.md` | The hard rules (money stays deterministic, AI only classifies, no sales, never collect text or addresses). Read before changing anything. |

## Checks that run with `npm test`

Tests cover the money model, the source rules (nothing in the app without a publisher, date and link), the link rules, the dataset, the n8n workflows, and the database views. Two scripts need the app running (`npm run dev`) and a browser: `node scripts/overflow-check.mjs` (no sideways scrolling at 360, 390 and 1280 px) and `node scripts/flow-check.mjs` (postcode stays on the device, the delete button works). Some script tests read files that exist only in the Grok sandbox this app was first built in; where those are absent they are skipped, with a stated reason.
