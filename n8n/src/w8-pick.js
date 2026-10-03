// n8n node "Pick pictures" (W8). Your own list of public https links, each with an optional label you expect.
// Edit the list below. Links to private networks, other protocols and non-picture files are refused.
const SCENES = ['own_wallbox', 'shared_garage', 'street_parking', 'public_charger', 'no_charging_visible', 'not_a_parking_scene'];
const LIST = [
  // { url: 'https://example.org/my-test-picture.jpg', expect: 'shared_garage' },
];
const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|0\.0\.0\.0)/i;
const out = [];
const refused = [];
for (const item of LIST.slice(0, 10)) {
  let ok = false;
  try {
    const u = new URL(String(item.url));
    ok = u.protocol === 'https:' && !PRIVATE.test(u.hostname) && /\.(jpe?g|png|webp)$/i.test(u.pathname) && !u.username && !u.password;
  } catch (e) { ok = false; }
  if (!ok) { refused.push(String(item.url).slice(0, 60)); continue; }
  out.push({ json: { url: item.url, expect: SCENES.includes(item.expect) ? item.expect : null } });
}
if (out.length === 0) throw new Error('Add at least one public https picture link (.jpg, .png or .webp) in the node "Pick pictures". Refused: ' + refused.length);
return out;
