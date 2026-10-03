-- 0026: two things that hold no visitor text.
--
-- 1. bev_classifier_log: one row each time the optional "own words" box suggested a concern. Closed fields only, so that
--    accuracy can be measured without ever keeping a sentence: which list name was suggested, how sure the check was, what the
--    keyword rules said, whether the person agreed, a language guess and a length bucket. No session id, no text, no postcode.
-- 2. bev_jobs and bev_job_runs: the registry for scheduled checks (reference refresh, source freshness, digest). Every job is
--    registered switched OFF. A workflow reads its own row before it does anything, so switching a check on is one update here,
--    not an edit in n8n. A run writes one short line.
-- Row-level security on, no policy: the server and n8n use their own connections.

create table if not exists bev_classifier_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  spec text not null,
  via text not null check (via in ('ai', 'rules', 'device')),
  band text not null check (band in ('auto', 'confirm', 'ask')),
  label text not null check (label in ('charging', 'cost', 'trips', 'trust', 'unsure', 'none')),
  rules_label text check (rules_label is null or rules_label in ('charging', 'cost', 'trips', 'trust', 'unsure', 'none')),
  agree boolean,
  outcome text not null check (outcome in ('yes', 'alt', 'no')),
  lang text check (lang is null or lang in ('en', 'de', 'fr', 'it', 'other')),
  len_bucket text check (len_bucket is null or len_bucket in ('short', 'mid', 'long')),
  injection boolean not null default false,
  personal boolean not null default false,
  hinted boolean not null default false,
  tokens integer check (tokens is null or tokens between 0 and 100000)
);
alter table bev_classifier_log enable row level security;
create index if not exists bev_classifier_log_created_idx on bev_classifier_log (created_at);

-- Accepted = the person tapped "yes" or took the alternative. Groups under 5 are not shown.
create or replace view bev_classifier_stats with (security_invoker = true) as
select
  via,
  band,
  coalesce(lang, 'unknown') as lang,
  count(*)::int as suggestions,
  round(100.0 * avg((outcome in ('yes', 'alt'))::int))::int as accepted_pct,
  round(100.0 * avg(coalesce(agree, false)::int))::int as agreed_with_rules_pct,
  round(avg(tokens))::int as avg_tokens
from bev_classifier_log
group by via, band, coalesce(lang, 'unknown')
having count(*) >= 5
order by suggestions desc;

create table if not exists bev_jobs (
  id text primary key check (id ~ '^[a-z0-9-]{3,40}$'),
  title text not null,
  workflow text not null,
  cadence text not null,
  enabled boolean not null default false,
  what text not null,
  updated_at timestamptz not null default now()
);
alter table bev_jobs enable row level security;

create table if not exists bev_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_id text not null references bev_jobs (id),
  started_at timestamptz not null default now(),
  ok boolean not null,
  rows_written integer check (rows_written is null or rows_written >= 0),
  summary text check (summary is null or length(summary) <= 300)
);
alter table bev_job_runs enable row level security;
create index if not exists bev_job_runs_job_idx on bev_job_runs (job_id, started_at desc);

create or replace view bev_job_status with (security_invoker = true) as
select j.id, j.title, j.workflow, j.cadence, j.enabled, r.started_at as last_run, r.ok as last_ok, r.summary as last_summary
from bev_jobs j
left join lateral (select * from bev_job_runs x where x.job_id = j.id order by x.started_at desc limit 1) r on true
order by j.id;

insert into bev_jobs (id, title, workflow, cadence, enabled, what) values
  ('reference-refresh', 'Reference figures', 'W3', 'weekly', false, 'Reads ElCom prices, BFE charging points and (when a link is pasted) BFS fuel prices into bev_reference. Never changes the dataset.'),
  ('source-freshness', 'Source pages still there', 'W4', 'weekly', false, 'Fetches each source page once and notes if it is gone or its text changed. Never edits a source.'),
  ('analytics-digest', 'Weekly digest', 'W5', 'weekly', false, 'Counts of final sessions in groups of at least 5, sent to the team. Nothing else.')
on conflict (id) do nothing;
