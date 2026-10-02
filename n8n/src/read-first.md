Do not publish (activate) yet.

TESTED 2 Oct 2026, 23:06: 'Test by hand' inserted one row into bev_sessions_test in Supabase project ZH3 (credential 'bev Postgres', row-level security on). Junk in the sample (postcode, sentence, script tag) was dropped. The Postgres step was switched off again afterwards.

The app still stores sessions itself (session.ts). This workflow is the same insert for when n8n takes over. It must not reprice the car, write a sentence, or call a language model.

Next: create bev_sessions in ZH3 (same columns, RLS on), change the table name in this step, let the app post to the webhook, then publish.

Code source: n8n/src/*.js, built by n8n/build.mjs.