// n8n node "TypeSafe choice". Closed lists only. Rebuilds the same payload shape that session.ts stores,
// so a row inserted here and a row inserted by the app can be counted together.
// It does not price the car, write a sentence, or call a language model.
// W1's own copy: the live draft's typesafe-choice.js stays untouched so `node n8n/build.mjs --check` still matches the live export.
// Extra over the live draft: the sitting code from the link (cohort) and the closed list of result-page actions.
const body = $input.first().json.body ?? $input.first().json;
if (body.workflow !== 'bev-navigator') throw new Error('Wrong workflow');
const stage = body.stage === 'mid' ? 'mid' : body.stage === 'final' ? 'final' : null;
if (!stage) throw new Error('Bad stage');
const clientSession = String(body.clientSession ?? '');
if (!/^[0-9a-f-]{16,80}$/i.test(clientSession)) throw new Error('Bad session');
const ONE_OF = {
  barrier: ['charging', 'cost', 'trips', 'trust', 'unsure'],
  carClass: ['small', 'compact', 'mid', 'suv', 'van'],
  fuel: ['petrol', 'diesel', 'hybrid', 'electric'],
  use: ['commute', 'everyday', 'long', 'holiday', 'towing', 'business'],
  kmBand: ['lt10', 'mid', 'gt20', 'unsure'],
  parking: ['house', 'own', 'shared', 'none', 'unsure'],
  workAccess: ['yes', 'ask', 'no'],
  tripFreq: ['rare', 'yearly', 'often'],
  usedStance: ['yes', 'new', 'no'],
  costSting: ['price', 'month', 'both'],
  mobileInterest: ['yes', 'no'],
  worry: ['tenant', 'winter', 'refuse'],
  unclear: ['km', 'payback', 'price', 'wording'],
  persona: ['urbanRenter', 'familyHome', 'distance', 'cost', 'skeptic', 'occasional'],
  via: ['tap', 'words'],
  action: ['fold_why', 'fold_evidence', 'share', 'picture', 'reminder', 'try_lever', 'dossier', 'charge_check'],
  settlement: ['city', 'town', 'rural'],
  tenure: ['own', 'rent'],
  gapCode: ['H1.1', 'H1.2', 'H1.3', 'H2.1', 'H2.2', 'H2.3', 'H2.4', 'H3.1', 'H3.2', 'H3.3', 'H3.4', 'H3.5', 'H4.1', 'H4.2', 'H4.3', 'H4.4', 'H5.1', 'H5.2', 'H5.3', 'H5.4', 'H5.5', 'H6.1', 'H6.2', 'H7.1', 'H7.2', 'H7.3', 'X1'],
  move: ['settle-charging', 'test-charging-week', 'ask-employer', 'ask-building', 'check-battery', 'price-rental-days', 'weekend-test', 'track-km', 'check-fuel-receipts', 'check-resale', 'keep-valid', 'set-price-ceiling', 'ask-seller', 'ask-car-data', 'ask-two-for-one-terms', 'see-commune'],
  outcome: ['done', 'not_for_me', 'unclear'],
  chargeMain: ['yes', 'maybe', 'no'],
  chargeBackup: ['yes', 'no'],
  chargeStanding: ['yes', 'no'],
  fact: ['two-for-one', 'mobile-charger', 'battery', 'workplace', 'public-tariff', 'tenant-right', 'winter', 'not-for-me', 'canton-tax', 'local-grant', 'wait-or-not', 'car-data', 'value-loss', 'leasing', 'test-drive'],
};
const CANTON_LIST = ['ZH', 'BE', 'LU', 'UR', 'SZ', 'OW', 'NW', 'GL', 'ZG', 'FR', 'SO', 'BS', 'BL', 'SH', 'AR', 'AI', 'SG', 'GR', 'AG', 'TG', 'TI', 'VD', 'VS', 'NE', 'GE', 'JU'];
const COHORT_RE = /^[a-z]{1,3}\d{1,2}$/;
const cohort = typeof body.cohort === 'string' && COHORT_RE.test(body.cohort.trim().toLowerCase()) ? body.cohort.trim().toLowerCase() : null;
const one = (v, list) => (typeof v === 'string' && list.includes(v) ? v : null);
const money = (v) => {
  const n = typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? Math.max(-500000, Math.min(500000, Math.round(n))) : 0;
};
const nodes = Array.isArray(body.nodes) ? body.nodes : [];
const find = (id) => nodes.find((n) => n && n.id === id) ?? {};
const classify = find('classify').output ?? {};
const a = body.answers ?? {};
const mix = a.mix && ['home', 'work', 'public'].every((k) => typeof a.mix[k] === 'number' && a.mix[k] >= 0 && a.mix[k] <= 1)
  ? { home: a.mix.home, work: a.mix.work, public: a.mix.public }
  : null;
const opened = [];
for (const k of Array.isArray(body.claimsOpened) ? body.claimsOpened : []) {
  if (one(k, ONE_OF.fact) && !opened.includes(k)) opened.push(k);
  if (opened.length >= 12) break;
}
const actions = [];
for (const k of Array.isArray(body.actions) ? body.actions : []) {
  if (one(k, ONE_OF.action) && !actions.includes(k)) actions.push(k);
}
// Gap codes are worked out in the app from closed answers; here only members of the closed list pass.
const gapCodes = [];
for (const k of Array.isArray(body.gapCodes) ? body.gapCodes : []) {
  if (one(k, ONE_OF.gapCode) && !gapCodes.includes(k)) gapCodes.push(k);
}
// The charging check: three closed taps. Kept only when all three were answered, like the app does.
const cs = body.chargeSetup && typeof body.chargeSetup === 'object' ? body.chargeSetup : {};
const setup = { main: one(cs.main, ONE_OF.chargeMain), backup: one(cs.backup, ONE_OF.chargeBackup), standing: one(cs.standing, ONE_OF.chargeStanding) };
const setupDone = setup.main != null && setup.backup != null && setup.standing != null;
const level = one(cs.level, ['holds', 'backup', 'test', 'timing', 'missing']);
// The next move shown, and what the person did with it: ids from the catalogue, outcomes from three taps.
const outcomes = [];
for (const k of Array.isArray(body.outcomes) ? body.outcomes : []) {
  const [id, o] = typeof k === 'string' ? k.split('.') : [];
  if (one(id, ONE_OF.move) && one(o, ONE_OF.outcome) && !outcomes.includes(k)) outcomes.push(k);
  if (outcomes.length >= 12) break;
}
// A postcode never comes in through here. Canton, settlement and tenure are closed taps; the two-digit area is not accepted.
return [{
  json: {
    clientSession,
    stage,
    raw: { price: find('price').output ?? {}, toggles: find('solutions').output ?? {} },
    payload: {
      workflow: 'bev-navigator',
      stage,
      clientSession,
      nodes: [
        { id: 'barrier', n8n: 'Form trigger', engine: 'user', output: one(find('barrier').output, ONE_OF.barrier) },
        {
          id: 'classify', n8n: 'TypeSafe choice', engine: 'rules',
          output: { situation: one(classify.situation, ONE_OF.persona), confidence: Math.max(0, Math.min(1, Number(classify.confidence) || 0)) },
        },
      ],
      claimsOpened: opened,
      gapCodes,
      chargeSetup: setupDone ? { ...setup, level } : null,
      nextMove: { shown: one(body.moveShown, ONE_OF.move), outcomes },
      location: { canton: one(body.canton, CANTON_LIST), settlement: one(body.settlement, ONE_OF.settlement), tenure: one(body.tenure, ONE_OF.tenure), plz2: null },
      fromSample: body.fromSample === true,
      cohort,
      actions,
      barrierVia: body.barrierVia === 'words' ? 'words' : 'tap',
      answers: {
        barrier: one(a.barrier, ONE_OF.barrier),
        carClass: one(a.carClass, ONE_OF.carClass),
        fuel: one(a.fuel, ONE_OF.fuel),
        uses: Array.isArray(a.uses) ? a.uses.filter((u) => one(u, ONE_OF.use)).slice(0, 6) : [],
        kmBand: one(a.kmBand, ONE_OF.kmBand),
        parking: one(a.parking, ONE_OF.parking),
        workAccess: one(a.workAccess, ONE_OF.workAccess),
        tripFreq: one(a.tripFreq, ONE_OF.tripFreq),
        usedStance: one(a.usedStance, ONE_OF.usedStance),
        costSting: one(a.costSting, ONE_OF.costSting),
        mobileInterest: one(a.mobileInterest, ONE_OF.mobileInterest),
        worry: one(a.worry, ONE_OF.worry),
        unclear: one(a.unclear, ONE_OF.unclear),
        listPrice: a.listPrice == null ? null : money(a.listPrice),
        resalePrice: a.resalePrice == null ? null : money(a.resalePrice),
        keepYears: [4, 12, 16, 24, 32].includes(a.keepYears) ? a.keepYears : null,
        mix,
        litres: typeof a.litres === 'number' && a.litres >= 3 && a.litres <= 14 ? Math.round(a.litres * 10) / 10 : null,
        gearQuote: a.gearQuote == null ? null : money(a.gearQuote),
        rentDays: [0, 2, 4, 8].includes(a.rentDays) ? a.rentDays : null,
      },
    },
  },
}];
