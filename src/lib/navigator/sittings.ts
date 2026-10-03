// The internal /sittings page, minus the page: turns flat session rows into one small report per sitting code.
// It only ever sees closed values (the columns of bev_sessions_flat). No row is returned, only counts.
// Pure on purpose, so a test can run it without a database or a browser.
import { ACTIONS } from "./telemetry.ts";

/** A cell under this many people is not shown. The same number as the W5 digest. */
export const MIN_CELL = 5;
/** Anything shown outside the team (a public page, a share) needs at least this many people in a cell. */
export const PUBLIC_MIN_CELL = 10;

export type FlatRow = {
  cohort: string | null;
  stage: string;
  from_sample: boolean;
  ending: string | null;
  barrier: string | null;
  unclear: string | null;
  actions: string[] | null;
};

export type Count = { key: string; n: number };

export type Sitting = {
  code: string;
  /** Finished sessions, or null when fewer than MIN_CELL (then nothing else is shown). */
  finished: number | null;
  covered: number | null;
  keep: number | null;
  /** Share of finished sessions that did the action at least once. */
  actions: Count[];
  barriers: Count[];
  unclear: Count[];
  /** Plain sentences derived from the counts. Never about a person. */
  flags: string[];
};

const tally = (values: (string | null | undefined)[], order?: readonly string[]): Count[] => {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  const keys = order ? [...order, ...[...m.keys()].filter((k) => !order.includes(k))] : [...m.keys()].sort();
  return keys.map((key) => ({ key, n: m.get(key) ?? 0 })).filter((c) => c.n >= MIN_CELL);
};

export function sittingsReport(rows: FlatRow[]): { sittings: Sitting[]; withoutCode: number; hidden: number } {
  const final = rows.filter((r) => r.stage === "final" && !r.from_sample);
  const withoutCode = final.filter((r) => !r.cohort).length;
  const codes = [...new Set(final.map((r) => r.cohort).filter((c): c is string => !!c))].sort();
  let hidden = 0;
  const sittings = codes.map((code): Sitting => {
    const mine = final.filter((r) => r.cohort === code);
    if (mine.length < MIN_CELL) {
      hidden += 1;
      return { code, finished: null, covered: null, keep: null, actions: [], barriers: [], unclear: [], flags: [`Fewer than ${MIN_CELL} finished. Nothing is shown for this sitting yet.`] };
    }
    const covered = mine.filter((r) => r.ending === "covered_within_8").length;
    const keep = mine.length - covered;
    const actions = tally(mine.flatMap((r) => [...new Set(r.actions ?? [])]), ACTIONS);
    const barriers = tally(mine.map((r) => r.barrier));
    const unclear = tally(mine.map((r) => r.unclear));
    const flags: string[] = [];
    const share = (n: number) => Math.round((100 * n) / mine.length);
    if (keep / mine.length >= 0.7) flags.push(`${share(keep)} % ended on "keep this car". That is a fair result, not a failure of the tool.`);
    if (covered / mine.length >= 0.7) flags.push(`${share(covered)} % ended with the extra price covered within 8 years. Check that the sitting was not mostly commuters with a home charger.`);
    const topUnclear = [...unclear].sort((a, b) => b.n - a.n)[0];
    if (topUnclear && topUnclear.n / mine.length >= 0.25) flags.push(`"${topUnclear.key}" was the most-tapped unclear point (${share(topUnclear.n)} %). Look at that wording first.`);
    const opened = actions.find((a) => a.key === "fold_why")?.n ?? 0;
    if (opened / mine.length < 0.2) flags.push("Few people opened 'why this result'. The reasoning may be too far down the page.");
    if (!flags.length) flags.push("Nothing stands out.");
    return { code, finished: mine.length, covered, keep, actions, barriers, unclear, flags };
  });
  return { sittings, withoutCode, hidden };
}

/** Constant-time comparison for the access key. An unset key means the page is switched off. */
export function keyMatches(given: unknown, expected: string | undefined): boolean {
  if (!expected || typeof given !== "string" || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
