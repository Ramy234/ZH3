W1 v2: session ingest with real replies. NOT active. Targets bev_sessions_test. Same checks as the live draft, plus:
 - 200 {"ok":true} only after the insert worked
 - 400 {"ok":false} when a check refuses the data (unknown value, wrong stage, bad session id)
 - 502 {"ok":false} when the database fails
The app should treat anything but 200 as "n8n did not store it" and fall back to its own saveSession.

Before going live: (1) 'Insert session' is OFF: with it off, a 200 only means the checks passed. Run 'Test by hand', switch it on, check bev_sessions_test. (2) Add a Header Auth credential (a shared secret you type yourself) to the Webhook, and let the app's server send it. Never put the secret in the browser. (3) Rebuild with BEV_TABLE=bev_sessions (node n8n/build-w1.mjs), import, publish.
W1 reads two more closed fields from the app: `cohort` (the sitting code from the link) and `actions` (a closed list of result-page actions), plus `barrierVia` (tap or words). It uses its own whitelist copy, w1-typesafe-choice.js, so the live draft stays untouched.
The checks never recalculate francs and never store a postcode, name or sentence.
