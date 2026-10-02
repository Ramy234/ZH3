# Departures from the brief

- Branch is `claude/handover-step-0-t24lvd`, not `redesign-2026-10`. The session environment fixes the branch name.
- n8n is handled through JSON files in `n8n/`, not the REST API (Martin, 2 Oct 2026). No `N8N_API_KEY` needed for now.
- `DATABASE_URL` is deferred; the app stays on PGLite until Martin adds it to `.env.local`.
- Golden tests pin the current model output (characterisation), not independently derived values. Re-pin deliberately and bump `MODEL` when the arithmetic changes.
- The 9 Grok-script tests that failed on arrival are fixed: `grok-pwa-plugin.test.mjs` now runs in an empty temp cwd (it read this app's `site.json` and `og.jpg`), and the migration test no longer expects `migrations/` to hold only `auth/`. `npm test` is green end to end (197 + 86).
