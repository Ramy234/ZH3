-- Reference data (W3), source checks (W4) and one flat view over sessions (W5, internal pages).
-- All new tables are insert-only and have row-level security on. Nothing here holds personal data.

create or replace function bev_insert_only() returns trigger as $$
begin
  raise exception '% is insert-only: add a new row instead', tg_table_name;
end;
$$ language plpgsql;

-- Public numbers that change on their own: ElCom prices, BFS pump prices, BFE charging points.
-- A failed fetch is a row with ok = false. The newest ok row stays what the app reads (view below).
create table if not exists bev_reference (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('elcom.canton', 'pump', 'charging.plz')),
  key text not null,
  period text not null,
  value double precision,
  unit text not null,
  detail text,
  publisher text not null,
  source_url text not null,
  ok boolean not null,
  note text not null default '',
  fetched_at timestamptz not null default now(),
  check (not ok or value is not null or detail is not null)
);
create index if not exists bev_reference_lookup_idx on bev_reference (kind, key, period, fetched_at desc);

create or replace view bev_reference_latest with (security_invoker = true) as
select distinct on (kind, key, period) kind, key, period, value, unit, detail, publisher, source_url, fetched_at
from bev_reference
where ok
order by kind, key, period, fetched_at desc, id desc;

-- One row per URL per weekly check. changed compares the content hash with the previous check of that URL.
create table if not exists bev_source_checks (
  id bigint generated always as identity primary key,
  origin text not null check (origin in ('bev_facts', 'bev_dataset')),
  origin_key text not null,
  url text not null,
  http_status integer,
  content_hash text,
  changed boolean not null default false,
  error text,
  checked_at timestamptz not null default now()
);
create index if not exists bev_source_checks_url_idx on bev_source_checks (url, checked_at desc);

create or replace view bev_source_latest with (security_invoker = true) as
select distinct on (url) url, origin, origin_key, http_status, content_hash, changed, error, checked_at
from bev_source_checks
order by url, checked_at desc, id desc;

-- The stored session payload is JSON text. This view is the one place that knows its shape.
-- Counting code (W5, an internal page) reads columns from here and never parses the text itself.
create or replace view bev_sessions_flat with (security_invoker = true) as
select
  s.id,
  s.client_session,
  s.stage,
  s.created_at,
  coalesce(j.p ->> 'fromSample', 'false') = 'true' as from_sample,
  j.p #>> '{answers,barrier}' as barrier,
  j.p #>> '{answers,carClass}' as car_class,
  j.p #>> '{answers,fuel}' as fuel,
  j.p #>> '{answers,kmBand}' as km_band,
  j.p #>> '{answers,parking}' as parking,
  j.p #>> '{answers,workAccess}' as work_access,
  j.p #>> '{answers,tripFreq}' as trip_freq,
  j.p #>> '{answers,usedStance}' as used_stance,
  j.p #>> '{answers,costSting}' as cost_sting,
  j.p #>> '{answers,mobileInterest}' as mobile_interest,
  j.p #>> '{answers,worry}' as worry,
  j.p #>> '{answers,unclear}' as unclear,
  (j.p #>> '{answers,keepYears}')::int as keep_years,
  (j.p #>> '{answers,listPrice}')::int as list_price,
  (j.p #>> '{answers,resalePrice}')::int as resale_price,
  j.p ->> 'cohort' as cohort,
  coalesce(j.p ->> 'barrierVia', 'tap') as barrier_via,
  array(select jsonb_array_elements_text(coalesce(j.p -> 'actions', '[]'::jsonb))) as actions,
  cls.o #>> '{situation}' as situation,
  pr.o ->> 'model' as model,
  pr.o ->> 'dataset' as dataset,
  (pr.o ->> 'annualKeep')::int as annual_keep,
  (pr.o ->> 'annualSwap')::int as annual_swap,
  (pr.o ->> 'saving')::int as saving,
  (pr.o ->> 'paybackYears')::numeric as payback_years,
  -- Ending, from paybackYears and the 8-year study window. Not from withinHorizon, which follows the year buttons.
  case when (pr.o ->> 'paybackYears') is not null and (pr.o ->> 'paybackYears')::numeric <= 8
       then 'covered_within_8' else 'keep_or_later' end as ending,
  array(select jsonb_array_elements_text(coalesce(j.p -> 'claimsOpened', '[]'::jsonb))) as facts_opened
from (
  -- The app appends a new row whenever the result page changes (a fold opened, a lever tried), and the table is insert-only.
  -- One sitting of one person is one row here: the latest per client_session and stage. Counts must never see the earlier ones.
  select distinct on (client_session, stage) * from bev_sessions
  order by client_session, stage, created_at desc, id desc
) s
cross join lateral (select s.payload::jsonb as p) j
left join lateral (select e -> 'output' as o from jsonb_array_elements(j.p -> 'nodes') e where e ->> 'id' = 'price' limit 1) pr on true
left join lateral (select e -> 'output' as o from jsonb_array_elements(j.p -> 'nodes') e where e ->> 'id' = 'classify' limit 1) cls on true;

alter table bev_reference enable row level security;
alter table bev_source_checks enable row level security;

drop trigger if exists bev_reference_no_change on bev_reference;
create trigger bev_reference_no_change before update or delete on bev_reference
  for each row execute function bev_insert_only();
drop trigger if exists bev_source_checks_no_change on bev_source_checks;
create trigger bev_source_checks_no_change before update or delete on bev_source_checks
  for each row execute function bev_insert_only();
