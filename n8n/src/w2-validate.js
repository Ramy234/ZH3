// n8n node "Validate dataset" (W2). Reads the sheet rows and the current published rows. Calculates nothing.
// Output: { ok, errors, warnings, changes, version, rows }. Only ok + changes>0 goes on to the insert.
const sheet = $('Read sheet').all().map((i) => i.json);
const current = $('Current dataset').all().map((i) => i.json).filter((r) => r.key);
const STATUS = ['placeholder', 'sourced', 'official', 'live'];
const errors = [];
const warnings = [];
const byKey = new Map(current.map((r) => [r.key, r]));
const seen = new Set();
const rows = [];
const iso = (v) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : undefined;
};
for (const [i, r] of sheet.entries()) {
  const line = i + 2;
  const key = String(r.key ?? '').trim();
  if (!key) continue;
  if (!/^(rate|pump|spec)\.[A-Za-z]+(\.[A-Za-z]+)?$/.test(key)) { errors.push(`row ${line}: bad key "${key}"`); continue; }
  if (current.length && !byKey.has(key)) { errors.push(`row ${line}: unknown key "${key}"`); continue; }
  if (seen.has(key)) { errors.push(`row ${line}: duplicate key "${key}"`); continue; }
  seen.add(key);
  const value = Number(String(r.value ?? '').replace(',', '.'));
  if (String(r.value ?? '').trim() === '' || !Number.isFinite(value) || value < 0) { errors.push(`row ${line} ${key}: value must be a number, zero or more`); continue; }
  const status = String(r.status ?? '').trim().toLowerCase();
  if (!STATUS.includes(status)) { errors.push(`row ${line} ${key}: status must be one of ${STATUS.join(', ')}`); continue; }
  const publisher = String(r.publisher ?? '').trim() || null;
  const published_on = iso(r.published_on);
  const source_url = String(r.source_url ?? '').trim() || null;
  if (published_on === undefined) { errors.push(`row ${line} ${key}: published_on must be YYYY-MM-DD or DD.MM.YYYY`); continue; }
  if (source_url && !/^https:\/\/\S+$/.test(source_url)) { errors.push(`row ${line} ${key}: source_url must start with https://`); continue; }
  if (status !== 'placeholder' && !(publisher && published_on && source_url)) { errors.push(`row ${line} ${key}: status ${status} needs publisher, published_on and source_url`); continue; }
  const before = byKey.get(key);
  if (before && Number(before.value) > 0 && (value > Number(before.value) * 3 || value < Number(before.value) / 3)) warnings.push(`${key}: ${before.value} -> ${value} is a jump of more than 3x. Check the unit.`);
  rows.push({ key, value, unit: String(r.unit ?? '').trim() || (before ? before.unit : ''), status, publisher, published_on, source_url, note: String(r.note ?? '').trim() });
}
for (const k of byKey.keys()) if (!seen.has(k)) errors.push(`missing key "${k}": a new version must carry every number`);
const changes = rows.filter((r) => {
  const b = byKey.get(r.key);
  return !b || Number(b.value) !== r.value || b.status !== r.status || (b.source_url || null) !== r.source_url || (b.publisher || null) !== r.publisher || String(b.published_on || '').slice(0, 10) !== (r.published_on || '') || (b.note || '') !== r.note || (b.unit || '') !== r.unit;
});
const diff = changes.map((r) => { const b = byKey.get(r.key); return `${r.key}: ${b ? `${b.value} (${b.status})` : 'new'} -> ${r.value} (${r.status})`; });
const d = new Date();
const p = (n) => String(n).padStart(2, '0');
const version = `v-${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
return [{ json: { ok: errors.length === 0, errors, warnings, changes: changes.length, diff, version, rows } }];
