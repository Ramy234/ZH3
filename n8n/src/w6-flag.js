// n8n node "AI flag" (W6). The switch for the AI step. It is false, so the workflow answers from the rules alone.
// To try the AI step: add a chat-model credential to "Chat model", enable that node and "Extract barrier", set ai to true here.
// Do that only after Martin has said yes, and after node scripts/words-eval.mjs has been read.
const ai = false;
return $input.all().map((i) => ({ json: { ...i.json, ai } }));
