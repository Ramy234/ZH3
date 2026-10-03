// n8n node "Decide" (W7). The only place that turns Jev's answer into something the page may show.
// It accepts an answer only if it is a name on the closed list with a confidence from 0 to 1, and gates it:
//   at least gates.auto     -> band "auto"    (the page still asks for one tap to confirm)
//   at least gates.confirm  -> band "confirm" (the page shows the likeliest and one alternative)
//   below, or no answer     -> the keyword rules decide, band "confirm" only when they were clear, otherwise "ask"
// An instruction aimed at the model (injection) switches the answer to the rules. A model never writes a sentence here.
// Nothing the person wrote is in the reply.
const SPEC = __SPEC__;
const G = SPEC.gates;
const keys = (q) => Object.keys(SPEC.questions[q].criteria);
const BARRIERS = keys('concern');
const rules = $('Rules').first().json.rules;
const cleaned = $('Scrub').first().json;
const got = $input.first().json;
const answers = got && typeof got.answers === 'object' && got.answers !== null ? got.answers : {};

const choice = (q) => {
  const a = answers[q];
  if (!a || a.type !== 'choice' || typeof a.choice !== 'string' || !keys(q).includes(a.choice)) return null;
  if (typeof a.confidence !== 'number' || !(a.confidence >= 0 && a.confidence <= 1)) return null;
  return { choice: a.choice, confidence: a.confidence, probabilities: a.probabilities && typeof a.probabilities === 'object' ? a.probabilities : {} };
};
const noul = (q) => {
  const a = answers[q];
  return a && a.type === 'noul' && typeof a.noul === 'number' && a.noul >= 0 && a.noul <= 1 ? a.noul : null;
};
const round = (n) => Math.round(n * 100) / 100;

const concern = choice('concern');
const injection = noul('injection');
const personal = noul('personal');
const injected = (injection !== null && injection >= G.injection) || rules.injection === true;
const aiUsable = concern !== null && concern.confidence >= G.confirm && !injected;

let barrier;
let confidence;
let band;
let via;
let alt = null;
if (aiUsable) {
  via = 'ai';
  barrier = concern.choice;
  confidence = concern.confidence;
  const agree = barrier === rules.barrier;
  if (barrier === 'none' || barrier === 'unsure') band = 'ask';
  else if (confidence >= G.auto && (agree || rules.confidence < 0.65)) band = 'auto';
  else band = 'confirm';
  const runnerUp = Object.entries(concern.probabilities)
    .filter(([k, p]) => k !== barrier && BARRIERS.includes(k) && k !== 'none' && k !== 'unsure' && typeof p === 'number' && p >= 0.2)
    .sort((a, b) => b[1] - a[1])[0];
  if (band !== 'auto' && runnerUp) alt = runnerUp[0];
  else if (band !== 'auto' && !agree && ['charging', 'cost', 'trips', 'trust'].includes(rules.barrier)) alt = rules.barrier;
} else {
  via = 'rules';
  barrier = rules.barrier;
  confidence = rules.confidence;
  band = ['charging', 'cost', 'trips', 'trust'].includes(barrier) && confidence >= 0.65 ? 'confirm' : 'ask';
}

const pre = (q) => {
  const c = choice(q);
  return aiUsable && c && c.confidence >= G.prefill && c.choice !== 'not_said' && c.choice !== 'unsure' ? c.choice : null;
};
const lang = choice('language');
const usage = got && got.usage && typeof got.usage === 'object' ? got.usage : {};
return [{
  json: {
    ok: true,
    barrier,
    confidence: round(confidence),
    band,
    via,
    alt,
    agree: barrier === rules.barrier,
    rulesBarrier: rules.barrier,
    parking: pre('parking'),
    tenure: pre('tenure'),
    lang: lang && lang.confidence >= G.confirm ? lang.choice : null,
    injection: injected,
    personal: (personal !== null && personal >= G.personal) || cleaned.scrubbed === true,
    scrubbed: cleaned.scrubbed === true,
    lenBucket: cleaned.lenBucket,
    tokens: Number.isFinite(usage.input_tokens) ? Math.round(usage.input_tokens) : null,
    spec: SPEC.version,
  },
}];
