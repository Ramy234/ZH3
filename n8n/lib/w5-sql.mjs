// The only query W5 runs. Reads the flat view, groups by closed values, returns counts.
const base = "from bev_sessions_flat where stage = 'final' and not from_sample";
export const DIGEST_SQL = [
  `select 'sessions' as metric, null::text as a, null::text as b, count(*)::int as n ${base}`,
  `select 'barrier_ending', barrier, ending, count(*)::int ${base} and barrier is not null group by barrier, ending`,
  `select 'unclear', unclear, null, count(*)::int ${base} and unclear is not null group by unclear`,
  `select 'frame', keep_years::text, ending, count(*)::int ${base} and keep_years is not null group by keep_years, ending`,
  `select 'fact_opened', f, null, count(*)::int from bev_sessions_flat, unnest(facts_opened) as f where stage = 'final' and not from_sample group by f`,
].join("\nunion all\n");
