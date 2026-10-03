import { createServerFn } from "@tanstack/react-start";
import { env } from "@/lib/env.server";

/** The closed answer of the optional "own words" box. The text itself is never returned and never stored. */
export type WordsAnswer = { barrier: "charging" | "cost" | "trips" | "trust" | "unsure" | null; confidence: number; via: "rules" | "ai" } | { error: true };

const NAMES = ["charging", "cost", "trips", "trust", "unsure", "none"];

/** On only when both the switch and the workflow address are set on the server. Off by default. */
export const wordsBoxOn = createServerFn({ method: "GET" }).handler(async (): Promise<boolean> => {
  return env("WORDS_BOX") === "on" && Boolean(env("WORDS_URL"));
});

/**
 * Sends the person's words to workflow W6 for one run and returns a category to confirm.
 * Nothing is logged or kept here. On any problem the answer is { error: true } and the page keeps its taps.
 */
export const classifyWords = createServerFn({ method: "POST" })
  .validator((input: { words: string }) => input)
  .handler(async ({ data }): Promise<WordsAnswer> => {
    const url = env("WORDS_URL");
    const words = typeof data.words === "string" ? data.words.replace(/\s+/g, " ").trim().slice(0, 280) : "";
    if (env("WORDS_BOX") !== "on" || !url || words.length < 3) return { error: true };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ words }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { error: true };
      const out = (await res.json()) as { barrier?: unknown; confidence?: unknown; via?: unknown };
      if (typeof out.barrier !== "string" || !NAMES.includes(out.barrier)) return { error: true };
      const confidence = typeof out.confidence === "number" && out.confidence >= 0 && out.confidence <= 1 ? out.confidence : 0;
      return { barrier: out.barrier === "none" ? null : (out.barrier as "charging"), confidence, via: out.via === "ai" ? "ai" : "rules" };
    } catch {
      return { error: true };
    }
  });
