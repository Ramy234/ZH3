// n8n node "Digest" (W5). Turns the counts into a short text for the team. Calculates nothing new.
// Any cell under MIN is dropped, and the total is only shown when it is MIN or more. No row-level data is read.
const MIN = 5;
const rows = $input.all().map((i) => i.json);
const kept = rows.filter((r) => Number(r.n) >= MIN);
const hidden = rows.length - kept.length;
const by = (metric) => kept.filter((r) => r.metric === metric);
const line = (r) => `${r.a ?? '-'}${r.b ? ' / ' + r.b : ''}: ${r.n}`;
const total = rows.find((r) => r.metric === 'sessions');
const parts = [
  `BEV Navigator digest. Counts of finished sessions; sample sessions are excluded; cells under ${MIN} are hidden (${hidden} hidden).`,
  total && Number(total.n) >= MIN ? `Finished sessions: ${total.n}` : 'Finished sessions: fewer than ' + MIN,
  '', 'Barrier / ending (ending uses payback within 8 years):', ...by('barrier_ending').map(line),
  '', 'What was unclear (feedback taps):', ...by('unclear').map(line),
  '', 'Year frame chosen / ending:', ...by('frame').map(line),
  '', 'Facts opened:', ...by('fact_opened').map(line),
  '', 'Result-page actions (sessions that did each at least once):', ...by('action').map(line),
  '', 'Sittings (code from the link):', ...by('cohort').map(line),
  '', 'Gaps touched (codes of the INFRAS barrier list; the content backlog follows the biggest ones):', ...by('gap').map(line),
  '', 'Next move: what people did with it (done / not for me / unclear):', ...by('move_outcome').map(line),
  '', 'Own-words box: suggestions and how often they were accepted:', ...by('classifier').map(line),
];
return [{ json: { text: parts.join('\n'), shown: kept.length, hidden } }];
