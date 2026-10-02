// n8n node "Parse ElCom" (W3). Keeps a value only if it is in a sane range. A failed or odd answer becomes an ok=false row.
// It never fills a gap with a guess; the app keeps reading the newest ok row (view bev_reference_latest).
const CANTONS = ['ZH','BE','LU','UR','SZ','OW','NW','GL','ZG','FR','SO','BS','BL','SH','AR','AI','SG','GR','AG','TG','TI','VD','VS','NE','GE','JU'];
const SOURCE = 'https://ld.admin.ch/query';
const asked = $('ElCom queries').all().map((i) => i.json.year);
const out = [];
$input.all().forEach((item, idx) => {
  const year = String(asked[idx] ?? '');
  const r = item.json;
  const bindings = r.statusCode === 200 && r.body && r.body.results && Array.isArray(r.body.results.bindings) ? r.body.results.bindings : null;
  if (!bindings || bindings.length === 0) {
    out.push({ kind: 'elcom.canton', key: 'all', period: year, value: null, unit: 'Rp/kWh', detail: null, publisher: 'ElCom', source_url: SOURCE, ok: false, note: `no answer for ${year} (status ${r.statusCode ?? 'none'})` });
    return;
  }
  for (const b of bindings) {
    const num = Number(String(b.canton && b.canton.value).split('/').pop());
    const code = CANTONS[num - 1];
    const avg = Number(b.avg && b.avg.value);
    const n = Number(b.n && b.n.value);
    const good = code && Number.isFinite(avg) && avg >= 10 && avg <= 80 && n >= 1;
    out.push({
      kind: 'elcom.canton', key: code || `bfs-${num}`, period: year,
      value: good ? Math.round(avg * 100) / 100 : null, unit: 'Rp/kWh', detail: null,
      publisher: 'ElCom', source_url: SOURCE, ok: Boolean(good),
      note: good ? `mean of ${n} municipal H4 totals` : `rejected: avg ${b.avg && b.avg.value}, n ${b.n && b.n.value}`,
    });
  }
});
return [{ json: { rows: out } }];
