// On-device keyword rules for the optional "own words" box. The sentence is read in the browser and nothing is sent.
// This is a port of n8n/src/w6-rules.js (the same lists, the same counting). src/lib/navigator/words-rules.test.ts
// runs both on the whole evaluation set and fails if they ever disagree. Edit both together.
export type RulesBarrier = "charging" | "cost" | "trips" | "trust" | "unsure" | "none";
export type RulesAnswer = { barrier: RulesBarrier; confidence: number; injection: boolean };

const WORDS = {
  charging: /charg|wallbox|\bplug|socket|garage|parking|park\b|parked|landlord|tenant|\brent(ed|er)?\b|\bapartment|flat\b|no bay|\bcable|association|laden|ladestation|vermieter|mieter|zur miete|verwaltung|tiefgarage|steckdose|borne|recharg|colonnin|affitt|locataire|\bloue\b|propri[eé]taire|proprietario|prise\b/gi,
  cost: /expensive|price|cost|afford|\bcheap|money|\bpay\b|\bloan|\blease|budget|depreciat|resale|\bworth|\bsell\b|teuer|preis|kosten|kostet|geld|franken|chf|anschaffung|wertverlust|co[uû]t|\bcher\b|\bprix\b|argent|costano|\bcosta\b|prezzo|troppo caro/gi,
  trips: /\brange|long (trip|drive|distance)|holiday|vacation|road ?trip|motorway|highway|autobahn|\btow\b|\btrailer|ski\b|mountain|italy|\bhill\b|stuck|\d{3,} ?km|caravan|wohnwagen|autonomi|roulotte|vacanz|vacances|kroatien|reichweite|ferien|urlaub|anh[aä]nger|strecke/gi,
  trust: /batter|\bfire|lifespan|degrad|winter|\bcold\b|reliab|technolog|\btrust|durab|repair|second-hand|used (ev|electric)|broke down|break down|\bproof|akku|zuverl|vertrau|kälte|kalt|batterie|fiab|affidab/gi,
};
const DOUBT = /not sure|do not know|don't know|dont know|no idea|maybe|perhaps|unsure|dunno|hard to say|weiss nicht|weiß nicht|nicht sicher|keine ahnung|unklar|je ne sais pas|non so\b|pas s[uû]r/i;
const INJECTION = /ignore (all |the |your |any )?(previous|above|prior|rules|instructions)|disregard|system ?:|reveal .{0,25}(prompt|instructions)|you must (return|answer|say|output)|forget (all|your|the) |ignoriere|vergiss (alle|die)|oublie (tout|les)/i;

export function rulesAnswer(input: string): RulesAnswer {
  const sentences = input.split(/(?<=[.!?])\s+/);
  const kept = sentences.filter((s) => !INJECTION.test(s));
  const injection = kept.length < sentences.length;
  const words = kept.join(" ");
  const score = Object.fromEntries(Object.entries(WORDS).map(([k, re]) => [k, (words.match(re) || []).length])) as Record<string, number>;
  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const [top, second] = ranked;
  let barrier: RulesBarrier;
  let confidence: number;
  if (top[1] === 0) {
    barrier = DOUBT.test(words) ? "unsure" : "none";
    confidence = 0.3;
  } else if (top[1] === second[1]) {
    barrier = "unsure";
    confidence = 0.35;
  } else {
    barrier = top[0] as RulesBarrier;
    confidence = Math.min(0.9, 0.5 + 0.15 * (top[1] - second[1]));
  }
  return { barrier, confidence: Math.round(confidence * 100) / 100, injection };
}
