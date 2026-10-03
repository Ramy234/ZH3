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
  fact: ['two-for-one', 'mobile-charger', 'battery', 'workplace', 'public-tariff', 'tenant-right', 'winter', 'not-for-me', 'canton-tax', 'local-grant', 'wait-or-not', 'car-data'],
};
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
