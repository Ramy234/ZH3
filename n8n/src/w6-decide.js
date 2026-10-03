// n8n node "Decide" (W6). Takes the AI answer only if it is exactly a name on the closed list with a confidence from 0 to 1,
// and at least MIN_CONFIDENCE. Anything else, or a failed AI call, falls back to the rules. The reply carries no text.
const MIN_CONFIDENCE = 0.6;
const BARRIERS = ['charging', 'cost', 'trips', 'trust', 'unsure', 'none'];
const rules = $('Rules').first().json.rules;
let ai = null;
try {
  const out = $('Extract barrier').first().json.output;
  if (out && BARRIERS.includes(out.barrier) && typeof out.confidence === 'number' && out.confidence >= 0 && out.confidence <= 1) ai = out;
} catch (e) {
  ai = null; // the AI step did not run (flag off) or failed
}
const useAi = ai !== null && ai.confidence >= MIN_CONFIDENCE;
const pick = useAi ? ai : rules;
return [{ json: { ok: true, barrier: pick.barrier, confidence: Math.round(pick.confidence * 100) / 100, via: useAi ? 'ai' : 'rules' } }];
