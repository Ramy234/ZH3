// The two small closed vocabularies a stored session may carry besides the answers.
// Shared by the app, the stored-session check in session.ts, W1 in n8n (tested to match) and the /sittings page.

/** Things a person did on the result page. A closed list: no text, no timing, no order. */
export const ACTIONS = ["fold_why", "fold_evidence", "share", "picture", "reminder", "try_lever", "dossier", "charge_check"] as const;
export type Action = (typeof ACTIONS)[number];

/** A sitting code from the link, like ?s=i3. Letters then one or two digits. It says which sitting, never who. */
export const COHORT_RE = /^[a-z]{1,3}\d{1,2}$/;

export function cleanCohort(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return COHORT_RE.test(v) ? v : null;
}

export function cleanActions(value: unknown): Action[] {
  const out: Action[] = [];
  if (!Array.isArray(value)) return out;
  for (const item of value) {
    if (typeof item === "string" && (ACTIONS as readonly string[]).includes(item) && !out.includes(item as Action)) out.push(item as Action);
  }
  return out;
}

/** How the barrier was chosen. 'words' only if the optional box suggested it and the person confirmed it by tap. The words themselves are never kept. */
export const VIA = ["tap", "words"] as const;
export type Via = (typeof VIA)[number];
export function cleanVia(value: unknown): Via {
  return value === "words" ? "words" : "tap";
}
