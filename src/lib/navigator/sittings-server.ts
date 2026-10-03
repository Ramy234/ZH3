import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { env } from "@/lib/env.server";
import { keyMatches, sittingsReport, type FlatRow } from "@/lib/navigator/sittings";

export type SittingsAnswer =
  | { state: "off" }
  | { state: "locked" }
  | { state: "ok"; report: ReturnType<typeof sittingsReport> };

/**
 * Counts per sitting code. Closed by default: with SITTINGS_KEY unset the page is off, and a wrong key gets the same
 * answer for every key. The key travels in the request body, never in the link, and is not stored by the page.
 */
export const loadSittings = createServerFn({ method: "POST" })
  .validator((input: { key?: string }) => input)
  .handler(async ({ data }): Promise<SittingsAnswer> => {
    const expected = env("SITTINGS_KEY");
    if (!expected) return { state: "off" };
    if (!keyMatches(data.key, expected)) return { state: "locked" };
    const sql = await getSql();
    const rows = await sql.query<FlatRow>(
      "select cohort, stage, from_sample, ending, barrier, unclear, actions from bev_sessions_flat where cohort is not null or stage = 'final'",
    );
    return { state: "ok", report: sittingsReport(rows) };
  });
