// n8n node "Rules" (W6). The default, and the fallback whenever the AI step is off or its answer is not valid.
// Counts keyword matches per barrier. A tie or no match is never guessed: it says 'unsure' or 'none' with a low confidence.
// English and German keywords, because that is what people will type. Edit the lists here and run the evaluation again.
const WORDS = {
  charging: /charg|wallbox|\bplug|socket|garage|parking|park\b|parked|landlord|tenant|\brent(ed|er)?\b|\bapartment|flat\b|no bay|laden|ladestation|vermieter|mieter|tiefgarage|steckdose/gi,
  cost: /expensive|price|cost|afford|\bcheap|money|\bpay\b|\bloan|\blease|budget|depreciat|resale|\bworth|teuer|preis|kosten|geld|franken|chf/gi,
  trips: /\brange|long (trip|drive|distance)|holiday|vacation|road ?trip|motorway|highway|autobahn|\btow\b|\btrailer|ski\b|mountain|italy|reichweite|ferien|urlaub|anh[aä]nger|strecke/gi,
  trust: /batter|\bfire|lifespan|degrad|winter|\bcold\b|reliab|technolog|\btrust|durab|repair|second-hand|used (ev|electric)|akku|zuverl|vertrau|kälte|kalt/gi,
};
const DOUBT = /not sure|don't know|dont know|no idea|maybe|unsure|dunno|weiss nicht|weiß nicht|keine ahnung|unklar/i;
const { words } = $input.first().json;
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
return [{ json: { words, rules: { barrier, confidence: Math.round(confidence * 100) / 100 } } }];
