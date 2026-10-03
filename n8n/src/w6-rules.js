// n8n node "Rules" (W6 and W7). The default, and the fallback whenever the AI step is off or its answer is not valid.
// Counts keyword matches per barrier. A tie or no match is never guessed: it says 'unsure' or 'none' with a low confidence.
// English, German, French and Italian keywords, because that is what people in Switzerland will type. Edit the lists here,
// mirror them in src/lib/navigator/words-rules.ts (a test compares the two) and run the evaluation again.
// A sentence that tries to give orders to a system is removed before counting and reported as `injection`.
const WORDS = {
  charging: /charg|wallbox|\bplug|socket|garage|parking|park\b|parked|landlord|tenant|\brent(ed|er)?\b|\bapartment|flat\b|no bay|\bcable|association|laden|ladestation|vermieter|mieter|zur miete|verwaltung|tiefgarage|steckdose|borne|recharg|colonnin|affitt|locataire|\bloue\b|propri[eé]taire|proprietario|prise\b/gi,
  cost: /expensive|price|cost|afford|\bcheap|money|\bpay\b|\bloan|\blease|budget|depreciat|resale|\bworth|\bsell\b|teuer|preis|kosten|kostet|geld|franken|chf|anschaffung|wertverlust|co[uû]t|\bcher\b|\bprix\b|argent|costano|\bcosta\b|prezzo|troppo caro/gi,
  trips: /\brange|long (trip|drive|distance)|holiday|vacation|road ?trip|motorway|highway|autobahn|\btow\b|\btrailer|ski\b|mountain|italy|\bhill\b|stuck|\d{3,} ?km|caravan|wohnwagen|autonomi|roulotte|vacanz|vacances|kroatien|reichweite|ferien|urlaub|anh[aä]nger|strecke/gi,
  trust: /batter|\bfire|lifespan|degrad|winter|\bcold\b|reliab|technolog|\btrust|durab|repair|second-hand|used (ev|electric)|broke down|break down|\bproof|akku|zuverl|vertrau|kälte|kalt|batterie|fiab|affidab/gi,
};
const DOUBT = /not sure|do not know|don't know|dont know|no idea|maybe|perhaps|unsure|dunno|hard to say|weiss nicht|weiß nicht|nicht sicher|keine ahnung|unklar|je ne sais pas|non so\b|pas s[uû]r/i;
const INJECTION = /ignore (all |the |your |any )?(previous|above|prior|rules|instructions)|disregard|system ?:|reveal .{0,25}(prompt|instructions)|you must (return|answer|say|output)|forget (all|your|the) |ignoriere|vergiss (alle|die)|oublie (tout|les)/i;
const input = $input.first().json.words;
const kept = input.split(/(?<=[.!?])\s+/).filter((s) => !INJECTION.test(s));
const injection = kept.length < input.split(/(?<=[.!?])\s+/).length;
const words = kept.join(' ');
const score = Object.fromEntries(Object.entries(WORDS).map(([k, re]) => [k, (words.match(re) || []).length]));
const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
const [top, second] = ranked;
let barrier;
let confidence;
if (top[1] === 0) {
  barrier = DOUBT.test(words) ? 'unsure' : 'none';
  confidence = 0.3;
} else if (top[1] === second[1]) {
  barrier = 'unsure';
  confidence = 0.35;
} else {
  barrier = top[0];
  confidence = Math.min(0.9, 0.5 + 0.15 * (top[1] - second[1]));
}
return [{ json: { ...$input.first().json, words: input, rules: { barrier, confidence: Math.round(confidence * 100) / 100, injection } } }];
