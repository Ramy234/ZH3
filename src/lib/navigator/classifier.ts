// The closed shapes of the "own words" box. No server code here, so tests can import it.
// Everything that crosses a boundary (the workflow's reply, the page's report back) is cleaned against these lists.
import { rulesAnswer } from "./words-rules.ts";
import spec from "./classifier-spec.json" with { type: "json" };

export const SPEC_VERSION: string = spec.version;
export const MAX_CHARS: number = spec.maxChars;
export const CONCERNS = ["charging", "cost", "trips", "trust", "unsure", "none"] as const;
export type Concern = (typeof CONCERNS)[number];
export type Barrier = Exclude<Concern, "none">;
export const VIA = ["ai", "rules", "device"] as const;
export type WordsVia = (typeof VIA)[number];
export const BAND = ["auto", "confirm", "ask"] as const;
export type WordsBand = (typeof BAND)[number];
export const LANGS = ["en", "de", "fr", "it", "other"] as const;
export const LENS = ["short", "mid", "long"] as const;
export const PARKING_HINTS = ["house", "own", "shared", "none"] as const;
export const TENURE_HINTS = ["own", "rent"] as const;

/** What may be remembered about one suggestion. Closed fields only: no text, no session, no place. */
export type WordsMeta = {
  spec: string;
  via: WordsVia;
  band: WordsBand;
  label: Concern;
  rulesLabel: Concern | null;
  agree: boolean;
  lang: (typeof LANGS)[number] | null;
  lenBucket: (typeof LENS)[number] | null;
  injection: boolean;
  personal: boolean;
  hinted: boolean;
  tokens: number | null;
};

export type WordsAnswer =
  | {
      ok: true;
      barrier: Barrier | null;
      alt: Barrier | null;
      band: WordsBand;
      via: WordsVia;
      parking: (typeof PARKING_HINTS)[number] | null;
      tenure: (typeof TENURE_HINTS)[number] | null;
      personal: boolean;
      injection: boolean;
      meta: WordsMeta;
    }
  | { error: true };

const one = <T extends string>(v: unknown, list: readonly T[]): T | null => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null);
const real = (c: Concern | null): Barrier | null => (c && c !== "none" ? c : null);

export function lenBucket(n: number): (typeof LENS)[number] {
  return n < 60 ? "short" : n < 160 ? "mid" : "long";
}

/** The reply of workflow W7, or null if it is not exactly what W7 documents. */
export function cleanReply(raw: unknown): WordsAnswer {
  const r = (raw ?? {}) as Record<string, unknown>;
  const label = one(r.barrier, CONCERNS);
  const band = one(r.band, BAND);
  const via = one(r.via, ["ai", "rules"] as const);
  if (r.ok !== true || !label || !band || !via) return { error: true };
  const hintedParking = one(r.parking, PARKING_HINTS);
  const hintedTenure = one(r.tenure, TENURE_HINTS);
  const injection = r.injection === true;
  const personal = r.personal === true;
  const confidence = typeof r.confidence === "number" && r.confidence >= 0 && r.confidence <= 1 ? r.confidence : 0;
  void confidence;
  const barrier = real(label);
  const alt = real(one(r.alt, CONCERNS));
  return {
    ok: true,
    barrier,
    alt: alt && alt !== barrier ? alt : null,
    band: barrier ? band : "ask",
    via,
    parking: hintedParking,
    tenure: hintedTenure,
    personal,
    injection,
    meta: {
      spec: typeof r.spec === "string" ? r.spec.slice(0, 40) : SPEC_VERSION,
      via,
      band: barrier ? band : "ask",
      label,
      rulesLabel: one(r.rulesBarrier, CONCERNS),
      agree: r.agree === true,
      lang: one(r.lang, LANGS),
      lenBucket: one(r.lenBucket, LENS),
      injection,
      personal,
      hinted: Boolean(hintedParking || hintedTenure),
      tokens: typeof r.tokens === "number" && Number.isFinite(r.tokens) ? Math.max(0, Math.min(100000, Math.round(r.tokens))) : null,
    },
  };
}

/** The same question answered on the device by the keyword rules. Nothing is sent anywhere. */
export function deviceAnswer(words: string): WordsAnswer {
  const text = words.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
  if (text.length < 3) return { error: true };
  const r = rulesAnswer(text);
  const label = r.barrier;
  const barrier = real(label);
  const clear = barrier !== null && barrier !== "unsure" && r.confidence >= 0.65;
  const band: WordsBand = clear ? "confirm" : "ask";
  return {
    ok: true,
    barrier: label === "none" ? null : barrier,
    alt: null,
    band,
    via: "device",
    parking: null,
    tenure: null,
    personal: false,
    injection: r.injection,
    meta: { spec: SPEC_VERSION, via: "device", band, label, rulesLabel: label, agree: true, lang: null, lenBucket: lenBucket(text.length), injection: r.injection, personal: false, hinted: false, tokens: null },
  };
}

export type WordsOutcome = "yes" | "alt" | "no";
export type LogInput = { meta: WordsMeta; outcome: WordsOutcome };

/** A report back from the page, cleaned to the columns of bev_classifier_log. Returns null if anything is off. */
export function cleanLog(input: unknown) {
  const i = (input ?? {}) as { meta?: Record<string, unknown>; outcome?: unknown };
  const m = i.meta ?? {};
  const via = one(m.via, VIA);
  const band = one(m.band, BAND);
  const label = one(m.label, CONCERNS);
  const outcome = one(i.outcome, ["yes", "alt", "no"] as const);
  if (!via || !band || !label || !outcome) return null;
  return {
    spec: typeof m.spec === "string" ? m.spec.slice(0, 40) : SPEC_VERSION,
    via,
    band,
    label,
    rulesLabel: one(m.rulesLabel, CONCERNS),
    agree: m.agree === true,
    outcome,
    lang: one(m.lang, LANGS),
    lenBucket: one(m.lenBucket, LENS),
    injection: m.injection === true,
    personal: m.personal === true,
    hinted: m.hinted === true,
    tokens: typeof m.tokens === "number" && Number.isFinite(m.tokens) ? Math.max(0, Math.min(100000, Math.round(m.tokens))) : null,
  };
}
