// n8n node "Parse BFE" (W3). Counts public charging points (EVSE ids) per Swiss postcode from the BFE open data.
// The file has addresses of charging points, not of people. Only counts per postcode are kept. Open data, attribution: BFE.
const SOURCE = 'https://data.geo.admin.ch/ch.bfe.ladestellen-elektromobilitaet/data/oicp/ch.bfe.ladestellen-elektromobilitaet.json';
const r = $input.first().json;
const day = new Date().toISOString().slice(0, 10);
const fail = (why) => [{ json: { rows: [{ kind: 'charging.plz', key: 'all', period: day, value: null, unit: 'EVSE', detail: null, publisher: 'BFE', source_url: SOURCE, ok: false, note: why }] } }];
const body = r.body;
const groups = body && Array.isArray(body.EVSEData) ? body.EVSEData : null;
if (r.statusCode !== 200 || !groups) return fail(`no usable file (status ${r.statusCode ?? 'none'})`);
const seen = new Set();
const byPlz = {};
let total = 0;
for (const g of groups) {
  const records = Array.isArray(g.EVSEDataRecord) ? g.EVSEDataRecord : [g];
  for (const rec of records) {
    const id = rec && rec.EvseID;
    const plz = rec && rec.Address && String(rec.Address.PostalCode || '').trim();
    if (!id || seen.has(id) || !/^\d{4}$/.test(plz || '')) continue;
    seen.add(id);
    const fast = (Array.isArray(rec.ChargingFacilities) ? rec.ChargingFacilities : []).some((f) => Number(f.power) >= 50);
    const cell = (byPlz[plz] ??= [0, 0]);
    cell[0] += 1;
    if (fast) cell[1] += 1;
    total += 1;
  }
}
if (total < 1000) return fail(`only ${total} charging points parsed; the file layout may have changed`);
return [{ json: { rows: [{ kind: 'charging.plz', key: 'all', period: day, value: total, unit: 'EVSE', detail: JSON.stringify(byPlz), publisher: 'BFE', source_url: SOURCE, ok: true, note: 'detail: {postcode: [charging points, of which 50 kW or more]}' }] } }];
