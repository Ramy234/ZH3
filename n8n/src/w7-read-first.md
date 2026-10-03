W7 BEV words classifier (Jev). Inactive. Rules only until you switch the AI on.

WHAT IT DOES
The page may send one short sentence ("what would still stop you?"). This workflow answers with a closed set of names:
the concern (charging, cost, trips, trust, unsure, none), a confidence band, and, only when said, parking and tenure.
It never returns text, never writes a database row, and keeps no execution data.

PATH
Webhook -> Check input -> Scrub (emails, links, numbers removed) -> Rules (keywords, the fallback) -> Build request
-> AI flag -> AI on? -> Jev (one HTTP call, six narrow questions) -> Decide (gates the answer) -> Reply.
Decide is the only node that decides what the page may show. A model never writes a sentence here.

TO TRY JEV
1. Run on your Mac: JEV_API_KEY=... node scripts/jev-smoke.mjs   (reads the key from your terminal, never from a file)
2. Read the report. Only if accuracy is acceptable: in n8n open node "Jev", create a Header Auth credential
   (name Authorization, value Bearer <key>), open node "AI flag" and set ai to true.
3. Test with a "words" call from curl. Then set WORDS_BOX=on and WORDS_URL on Vercel.

PRIVACY
Jev is hosted in the United States, does not train on inputs, and keeps data "as long as reasonably necessary".
Zero retention is enterprise only. The page asks for a tick before it sends anything, and says so.
