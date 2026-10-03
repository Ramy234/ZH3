// The only query W5 runs. Reads the flat view, groups by closed values, returns counts.
const base = "from bev_sessions_flat where stage = 'final' and not from_sample";
export const DIGEST_SQL = [
  `select 'sessions' as metric, null::text as a, null::text as b, count(*)::int as n ${base}`,
  `select 'barrier_ending', barrier, ending, count(*)::int ${base} and barrier is not null group by barrier, ending`,
  `select 'unclear', unclear, null, count(*)::int ${base} and unclear is not null group by unclear`,
  `select 'frame', keep_years::text, ending, count(*)::int ${base} and keep_years is not null group by keep_years, ending`,
  `select 'cohort', cohort, null, count(*)::int ${base} and cohort is not null group by cohort`,
  `select 'action', a, null, count(*)::int from bev_sessions_flat, unnest(actions) as a where stage = 'final' and not from_sample group by a`,
  `select 'fact_opened', f, null, count(*)::int from bev_sessions_flat, unnest(facts_opened) as f where stage = 'final' and not from_sample group by f`,
  `select 'gap', g, null, count(*)::int from bev_gap_sessions, unnest(gap_codes) as g group by g`,
  `select 'move_outcome', o, null, count(*)::int from bev_gap_sessions, unnest(move_outcomes) as o group by o`,
  // The words box: how often a suggestion was accepted. bev_classifier_stats already hides groups under 5.
  `select 'classifier', via || ' / ' || band, lang || ', accepted ' || accepted_pct || '%', suggestions from bev_classifier_stats`,
].join("\nunion all\n");
