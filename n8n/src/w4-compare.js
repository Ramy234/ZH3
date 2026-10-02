// n8n node "Compare" (W4). Hashes the visible text of each page and compares it with the previous check.
// "changed" means the page text changed. Pages with dates or counters change often, so look before you act.
// This node edits nothing. It only records and lists.
const cyrb53 = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
};
const visible = (html) => String(html ?? '')
  .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()
  .slice(0, 200000);
const targets = $('Unique URLs').all().map((i) => i.json);
const results = $input.all().map((i) => i.json);
const rows = targets.map((t, idx) => {
  const r = results[idx] ?? {};
  const status = Number.isInteger(r.statusCode) ? r.statusCode : null;
  const text = visible(r.body);
  const hash = status && status < 400 && text ? cyrb53(text) : null;
  const error = r.error ? String(r.error.message ?? r.error).slice(0, 200) : status && status >= 400 ? `HTTP ${status}` : !hash ? 'empty page' : null;
  return {
    origin: t.origin, origin_key: t.origin_key, url: t.url,
    http_status: status, content_hash: hash,
    changed: Boolean(hash && t.previous_hash && hash !== t.previous_hash),
    error,
  };
});
const broken = rows.filter((r) => r.error);
const changed = rows.filter((r) => r.changed);
const text = [
  `BEV Navigator source check: ${rows.length} URLs, ${broken.length} broken, ${changed.length} changed.`,
  ...broken.map((r) => `BROKEN  ${r.origin}/${r.origin_key}  ${r.url}  (${r.error})`),
  ...changed.map((r) => `CHANGED ${r.origin}/${r.origin_key}  ${r.url}`),
].join('\n');
return [{ json: { rows, text, broken: broken.length, changed: changed.length } }];
