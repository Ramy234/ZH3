// n8n node "AI flag" (W7). The switch for the Jev call. It is false, so the workflow answers from the rules alone.
// To switch it on: add a Header Auth credential (name Authorization, value "Bearer <your key>") to the node "Jev",
// set ai to true here, save, and run scripts/jev-smoke.mjs first. Only Martin types the key.
const ai = false;
return $input.all().map((i) => ({ json: { ...i.json, ai } }));
