import { createServerFn } from "@tanstack/react-start";
import { env } from "@/lib/env.server";
import { getSql } from "@/lib/db";
import { MAX_CHARS, cleanLog, cleanReply, type LogInput, type WordsAnswer } from "@/lib/navigator/classifier";

export type { WordsAnswer } from "@/lib/navigator/classifier";

/** On only when both the switch and the workflow address are set on the server. Off by default. The keyword rules on the device work either way. */
export const wordsBoxOn = createServerFn({ method: "GET" }).handler(async (): Promise<boolean> => {
  return env("WORDS_BOX") === "on" && Boolean(env("WORDS_URL"));
});

/**
 * Sends the person's words to workflow W7 for one run and returns a closed answer to confirm.
 * The page calls this only after the person ticked the box that says where the words go.
 * Nothing is logged or kept here. On any problem the answer is { error: true } and the page keeps its taps.
 */
export const classifyWords = createServerFn({ method: "POST" })
  .validator((input: { words: string }) => input)
  .handler(async ({ data }): Promise<WordsAnswer> => {
    const url = env("WORDS_URL");
    const words = typeof data.words === "string" ? data.words.replace(/\s+/g, " ").trim().slice(0, MAX_CHARS) : "";
    if (env("WORDS_BOX") !== "on" || !url || words.length < 3) return { error: true };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ words }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return { error: true };
      return cleanReply(await res.json());
    } catch {
      return { error: true };
    }
  });

/** One closed line per suggestion: what was suggested and whether the person agreed. No text, no session, no place. */
export const logWords = createServerFn({ method: "POST" })
  .validator((input: LogInput) => input)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const row = cleanLog(data);
    if (!row) return { ok: false };
    try {
      const sql = await getSql();
      await sql`
        insert into bev_classifier_log (spec, via, band, label, rules_label, agree, outcome, lang, len_bucket, injection, personal, hinted, tokens)
        values (${row.spec}, ${row.via}, ${row.band}, ${row.label}, ${row.rulesLabel}, ${row.agree}, ${row.outcome}, ${row.lang}, ${row.lenBucket}, ${row.injection}, ${row.personal}, ${row.hinted}, ${row.tokens})`;
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });
