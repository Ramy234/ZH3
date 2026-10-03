// n8n node "Tally" (W8). Closed names and counts only. A picture link is kept out of the result.
const SCENES = ['own_wallbox', 'shared_garage', 'street_parking', 'public_charger', 'no_charging_visible', 'not_a_parking_scene'];
const items = $input.all().map((i) => i.json);
// Jev's reply replaces the item, so the label you expected is read back from "Build request" by position.
const built = $('Build request').all().map((i) => i.json);
const rows = items.map((j, n) => {
  const a = j.answers && j.answers.scene ? j.answers.scene : {};
  const choice = SCENES.includes(a.choice) ? a.choice : 'none';
  const confidence = typeof a.confidence === 'number' ? Math.max(0, Math.min(1, a.confidence)) : 0;
  return { choice, confidence, expect: j.expect ?? (built[n] && built[n].expect) ?? null };
});
const labelled = rows.filter((r) => r.expect);
return [{ json: {
  pictures: rows.length,
  answered: rows.filter((r) => r.choice !== 'none').length,
  labelled: labelled.length,
  agreeWithYourLabel: labelled.filter((r) => r.choice === r.expect).length,
  lowConfidence: rows.filter((r) => r.confidence < 0.5).length,
  note: 'A handful of pictures proves nothing about accuracy in the wild. Nothing here goes into the app without Martin\'s decision.',
} }];
