import { evaluate, suggestToggles, USES, type Answers, type Result, type Toggles, type UseId } from "./model.ts";
import { paybackWord } from "./sensitivity.ts";

export type UseNote = { id: UseId; kind: "francs" | "wording" | "none"; text: string };

const chf = (n: number) => `CHF ${Math.round(n).toLocaleString("de-CH")}`;

/**
 * What would tapping each "what you use the car for" chip do? We run the same sum with that chip flipped and compare.
 * Nothing here is invented: the sentence reports the difference between two runs of evaluate().
 */
export function notesForUses(base: Result, pinned: Partial<Toggles> | null): UseNote[] {
  const word = (r: Result) => paybackWord({ payback: r.paybackYears != null && r.saving > 40 ? r.paybackYears : null, saving: r.saving });
  return USES.map((u) => {
    const on = base.answers.uses.includes(u.id);
    const next = on ? base.answers.uses.filter((x) => x !== u.id) : [...base.answers.uses, u.id];
    const answers: Answers = { ...base.answers, uses: next.length > 0 ? next : ["everyday"] };
    const alt = evaluate(answers, { ...suggestToggles(answers), ...(pinned ?? {}), insDiscount: false }, base.official, base.canton);
    const francs = Math.round(alt.saving) !== Math.round(base.saving) || word(alt) !== word(base);
    const wording = alt.verdict !== base.verdict || alt.headline !== base.headline || alt.persona.id !== base.persona.id;
    if (francs) {
      return {
        id: u.id,
        kind: "francs" as const,
        text: `${on ? "Taking off" : "Adding"} ${u.title.toLowerCase()} gives ${word(alt)} and ${chf(alt.saving)} a year (now ${word(base)}, ${chf(base.saving)}).`,
      };
    }
    if (wording) {
      return { id: u.id, kind: "wording" as const, text: `${u.title}: no franc changes. It does change how your result is worded and which move comes first.` };
    }
    return { id: u.id, kind: "none" as const, text: `${u.title}: changes no figure on its own. It is read together with your other answers.` };
  });
}
