// n8n node "Unique URLs" (W4). Takes the URLs we already hold, keeps each once, and refuses anything that is not a public https page.
// Nothing outside our own tables is ever fetched.
const rows = $('URLs to check').all().map((i) => i.json).filter((r) => r.url);
const prev = new Map($('Previous checks').all().map((i) => i.json).filter((r) => r.url).map((r) => [r.url, r.content_hash]));
const seen = new Map();
for (const r of rows) {
  let u;
  try { u = new URL(String(r.url).trim()); } catch { continue; }
  const host = u.hostname.toLowerCase();
  const local = host === 'localhost' || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || !host.includes('.');
  if (u.protocol !== 'https:' || local || u.username || u.password) continue;
  const url = u.toString();
  if (!seen.has(url)) seen.set(url, { url, origin: r.origin, origin_key: r.origin_key, previous_hash: prev.get(url) ?? null });
}
return [...seen.values()].map((json) => ({ json }));
