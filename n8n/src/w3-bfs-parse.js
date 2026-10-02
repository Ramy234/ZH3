// n8n node "Parse BFS" (W3). BFS publishes "LIK, Durchschnittspreise fuer Energie und Treibstoffe" as XLSX.
// The layout was NOT confirmed when this was written. So it looks for the two rows by their label and the period by its header,
// and gives up (ok=false) when it cannot find all three. Look at this node's output on the first run before switching on the insert.
const SOURCE = $('BFS file URL').first().json.url || 'https://www.bfs.admin.ch/';
const rowsIn = $input.all().map((i) => Object.values(i.json));
const fail = (why) => [{ json: { rows: [{ kind: 'pump', key: 'all', period: 'unknown', value: null, unit: 'CHF/l', detail: null, publisher: 'BFS', source_url: SOURCE, ok: false, note: why }] } }];
if (!rowsIn.length) return fail('no rows read; the file URL is probably empty or old');
const periodOf = (cell) => {
  const s = String(cell ?? '').trim();
  let m = s.match(/^(\d{4})[-/ ]?(\d{2})$/); if (m) return `${m[1]}-${m[2]}`;
  m = s.match(/^(\d{1,2})\.(\d{4})$/); if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  return null;
};
const find = (label) => rowsIn.find((r) => r.some((c) => typeof c === 'string' && label.test(c)));
const lastNumber = (row) => { for (let i = row.length - 1; i >= 0; i--) { const n = Number(String(row[i]).replace(',', '.')); if (Number.isFinite(n) && n > 0.5 && n < 5) return { n, col: i }; } return null; };
const header = rowsIn.find((r) => r.filter((c) => periodOf(c)).length >= 3);
const out = [];
for (const [key, label] of [['unleaded95', /(bleifrei|unleaded|sans plomb).*95|^benzin/i], ['diesel', /diesel/i]]) {
  const row = find(label);
  const hit = row && lastNumber(row);
  const period = hit && header ? periodOf(header[hit.col]) : null;
  out.push(hit && period
    ? { kind: 'pump', key, period, value: Math.round(hit.n * 1000) / 1000, unit: 'CHF/l', detail: null, publisher: 'BFS', source_url: SOURCE, ok: true, note: 'last monthly value in the row; check against the BFS table' }
    : { kind: 'pump', key, period: period || 'unknown', value: null, unit: 'CHF/l', detail: null, publisher: 'BFS', source_url: SOURCE, ok: false, note: `could not read ${key}: ${!row ? 'label not found' : !hit ? 'no price in the row' : 'no period header found'}` });
}
return [{ json: { rows: out } }];
