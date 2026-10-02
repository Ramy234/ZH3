// n8n node "Switch". Rejects any key outside the eight switches, then stores them as booleans.
const row = $input.first().json;
const keys = ['home', 'work', 'rightSize', 'used', 'publicPlan', 'tariff', 'pv', 'insDiscount'];
const t = row.raw && row.raw.toggles;
if (!t || typeof t !== 'object') throw new Error('Missing switches');
for (const key of Object.keys(t)) if (!keys.includes(key)) throw new Error('Unexpected switch');
const toggles = {};
for (const key of keys) toggles[key] = t[key] === true;
toggles.insDiscount = false; // removed from the page on 2 October 2026; kept as a key so old and new rows line up
row.payload.nodes.push({ id: 'solutions', n8n: 'Switch', engine: 'finite', output: toggles });
row.payload.nodes.push({ id: 'analytics', n8n: 'Postgres', engine: 'batch', output: row.stage });
return [{ json: { clientSession: row.clientSession, stage: row.stage, payload: row.payload } }];
