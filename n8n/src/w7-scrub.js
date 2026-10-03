// n8n node "Scrub" (W7). Runs before anything leaves n8n. Removes what is certainly not a concern about cars:
// email addresses, web links, phone-like numbers and long digit runs. The cleaned text is used for this run only.
// It is never returned and never stored. Names cannot be found by a rule; the "personal" question reports them.
const SPEC = __SPEC__;
const original = $input.first().json.words;
let words = original;
let changes = 0;
const swap = (re, to) => {
  words = words.replace(re, () => {
    changes += 1;
    return to;
  });
};
swap(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]');
swap(/\b(?:https?:\/\/|www\.)\S+/gi, '[link]');
swap(/(?:\+|00)?\d[\d ()./-]{6,}\d/g, '[number]');
swap(/\b\d{5,}\b/g, '[number]');
swap(/\bCH\d{2}(?: ?[A-Z0-9]{4}){3,5}(?: ?[A-Z0-9]{1,4})?\b/gi, '[number]');
words = words.replace(/\s+/g, ' ').trim().slice(0, SPEC.maxChars);
const n = original.length;
return [{ json: { words, scrubbed: changes > 0, lenBucket: n < 60 ? 'short' : n < 160 ? 'mid' : 'long' } }];
