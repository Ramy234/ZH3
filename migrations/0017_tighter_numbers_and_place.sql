-- 0017: tighter numbers, a place for the analytics, and a view that is safe to count from.
--
-- 1. bev_locations: the postcode, only when the person typed one. A separate table, so it is not in the session payload
--    that every counting view reads. Row-level security on, no policy: only the app and the database owner reach it.
--    It is not insert-only on purpose: the retention job deletes rows older than twelve months.
-- 2. bev_sessions_flat gets four coarse columns at the end (canton, settlement, plz2, week_start) and an explicit ending.
-- 3. bev_sessions_analytics: the same, without the session id, the exact time or any price. Public counts come from here,
--    and only for groups of ten or more (PUBLIC_MIN_CELL in sittings.ts).

create table if not exists bev_locations (
  id bigserial primary key,
  client_session text not null,
  postcode text not null check (postcode ~ '^[1-9][0-9]{3}$'),
  canton text,
  settlement text,
  created_at timestamptz not null default now()
);
create index if not exists bev_locations_session_idx on bev_locations (client_session, created_at desc);
create index if not exists bev_locations_created_idx on bev_locations (created_at);
alter table bev_locations enable row level security;

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
  coalesce(
    pr.o ->> 'ending',
    case when (pr.o ->> 'paybackYears') is not null and (pr.o ->> 'paybackYears')::numeric <= 8
         then 'covered_within_8' else 'keep_or_later' end
  ) as ending,
  array(select jsonb_array_elements_text(coalesce(j.p -> 'claimsOpened', '[]'::jsonb))) as facts_opened,
  -- Added in 0017. Coarse place only: the raw postcode never enters this view (it lives in bev_locations).
  pr.o ->> 'canton' as canton,
  j.p #>> '{location,settlement}' as settlement,
  j.p #>> '{location,plz2}' as plz2,
  date_trunc('week', s.created_at)::date as week_start
from (
  -- The app appends a new row whenever the result page changes (a fold opened, a lever tried), and the table is insert-only.
  -- One sitting of one person is one row here: the latest per client_session and stage. Counts must never see the earlier ones.
  select distinct on (client_session, stage) * from bev_sessions
  order by client_session, stage, created_at desc, id desc
) s
cross join lateral (select s.payload::jsonb as p) j
left join lateral (select e -> 'output' as o from jsonb_array_elements(j.p -> 'nodes') e where e ->> 'id' = 'price' limit 1) pr on true
left join lateral (select e -> 'output' as o from jsonb_array_elements(j.p -> 'nodes') e where e ->> 'id' = 'classify' limit 1) cls on true;


create or replace view bev_sessions_analytics with (security_invoker = true) as
select
  stage, week_start, from_sample, barrier, car_class, fuel, km_band, parking, work_access, trip_freq, used_stance,
  cost_sting, mobile_interest, worry, unclear, keep_years, cohort, barrier_via, actions, situation, model, dataset,
  ending, facts_opened, canton, settlement, plz2
from bev_sessions_flat;
