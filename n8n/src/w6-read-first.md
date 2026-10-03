W6: "say it in your own words" classifier. NOT active. Optional experiment; the AI part is off.

The app sends one short text. W6 answers with exactly one of charging | cost | trips | trust | unsure | none, a confidence, and whether rules or AI chose it. The person always confirms or corrects it by tap. It never writes advice, a number or a source.

The text is used for this run only: it is not stored in a table, not in the reply, and this workflow keeps no execution data (success or error).

With the flag as shipped (Code node "AI flag": ai = false), only the keyword rules answer. To try the AI: add a chat-model credential on "Chat model", enable it and "Extract barrier", set ai = true. An AI answer is taken only if it is on the closed list with confidence 0.6 or more; otherwise the rules answer.

Before it goes live: run node scripts/words-eval.mjs (rules) and node scripts/words-eval.mjs --url <webhook> (the workflow), read both, and let Martin decide. Then the app needs WORDS_BOX=on and WORDS_URL on the server.
