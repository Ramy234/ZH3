-- 0020: one list of gaps, rules still being decided, two new sheets, and the counts that learn from them.
--
-- 1. bev_watch: rules that are not law yet (stage, source, date to look again). Rows are edited by a person, never by n8n.
--    Row-level security on, no policy.
-- 2. bev_facts: two new sheets (wait-or-not, car-data), rewritten from src/lib/navigator/facts.ts.
-- 3. bev_gap_sessions: the latest final sitting per client session, with the gap codes (INFRAS barrier list) it touched,
--    the charging set-up level, canton and week. No session id in the counting view below.
-- 4. bev_gap_backlog: how many people touched each gap, by week and by canton. Internal (cells of 5 or more).
--    Anything shown outside the team needs cells of 10 or more (PUBLIC_MIN_CELL in sittings.ts).
-- 5. bev_action_stats: how people answered each next move ("I did it", "Not for me", "I did not understand"). Internal.

create table if not exists bev_watch (
  id text primary key,
  title text not null,
  stage text not null check (stage in ('draft', 'consultation', 'parliament', 'decided', 'in_force')),
  body text not null,
  meanwhile text not null,
  source text not null,
  url text not null check (url like 'https://%'),
  as_of date not null,
  next_check date not null,
  codes text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table bev_watch enable row level security;

insert into bev_watch (id, title, stage, body, meanwhile, source, url, as_of, next_check, codes) values
(
  'right-to-charge',
  $t$A tenant's right to a base charging installation$t$,
  'consultation',
  $t$The Federal Council opened a consultation on 19 June 2026, open until 12 October 2026. A person who lives in the building and whose bay comes with the home could require a supply line, a way to meter use and load management where needed. The owner would usually pass the cost into the parking rent. The work must stay reasonable. Not law. No date of entry into force has been published.$t$,
  $t$Ask in writing for a coordinated base installation for the whole garage, not only one socket. Look for neighbours who want the same, and ask about load management.$t$,
  $t$Federal Council, 19 June 2026 (Motion 23.3936)$t$,
  'https://www.admin.ch/de/newnsb/66VYsJf9n5dbavk-IhLan',
  '2026-10-03',
  '2026-10-13',
  array['H2.2', 'H3.3']
),
(
  'ev-levy-2030',
  $t$A federal levy on electric cars from 2030$t$,
  'consultation',
  $t$On 26 September 2025 the Federal Council put two variants forward: about 5.4 rappen a kilometre, or 22.8 rappen a kWh charged. The consultation ran until 9 January 2026. Either variant needs a change to the constitution and a popular vote. Not law, and not in the francs of this check.$t$,
  $t$Nothing to do now. The reminder file lists it, so it is checked again when you look again.$t$,
  $t$Federal Council, 26 September 2025$t$,
  'https://www.admin.ch/de/newnsb/j3TBwKn8BYPoEGhRbvbwc',
  '2026-10-03',
  '2026-12-01',
  array['H3.3']
)
on conflict (id) do nothing;

-- The two new sheets.
insert into bev_facts (key, title, body, source, url, as_of, status) values
($tq$wait-or-not$tq$, $tq$Wait for better batteries, or not$tq$, $tq$Batteries are getting cheaper. In 2025 the average pack price fell 8 percent, and the cheaper lithium-iron-phosphate type is now over half of electric-car batteries worldwide. Sodium-ion batteries exist in small numbers. Solid-state batteries are still prototypes, with makers announcing production between 2027 and 2030 and a mass market in the 2030s. None of this is a Swiss car price. A better car later is not a reason to call a good car now a bad one. And waiting is not free: each year you keep running the car you have is a year of its running cost, which is the figure on your result. If a used car or a smaller one makes today's price fit, buying now can be the fair answer. If the figures say keep, keeping while the market improves is fair too.$tq$, $tq$BloombergNEF battery price survey, 9 December 2025 (global average, USD, fell 8 percent). IEA Global EV Outlook 2026, batteries chapter (LFP share above 55 percent in 2025; sodium-ion limited; solid-state at prototype stage). Empa lecture of 9 September 2026 for context. Global figures, not a Swiss price.$tq$, $tq$https://iea.org/reports/global-ev-outlook-2026/electric-vehicle-batteries$tq$, '2026-10-03', $tq$dated$tq$),
($tq$car-data$tq$, $tq$What a connected car passes on$tq$, $tq$Almost every new car, electric or petrol, sends some data to its maker. No recent study that compared matching new electric and petrol cars found one worse than the other. The drivetrain is a poor guide. What differs is the maker, the model year, the app and the settings. An old test of four cars in 2017 found data leaving petrol cars as well as electric ones. A 2023 review of 25 brands by the Mozilla Foundation read their privacy terms, not measured traffic, and rated all 25 as failing. What an electric car adds is public charging: the operator can hold a record of where and when you charged. A written question to the maker, for the exact model and settings, is stronger evidence than any ranking. This sheet ranks no brand and names no model.$tq$, $tq$SRF on the ADAC examination, 21 February 2017 (four cars, old). Mozilla Foundation, Privacy Not Included, September 2023 (policies, not measurements). CNIL recommendation on connected-vehicle location data, June 2026 (France). Quebec Commission on Ethics in Science and Technology, August 2026 (Canada). Outside Switzerland except the SRF report.$tq$, $tq$https://www.srf.ch/news/schweiz/datenkrake-auto-wie-uns-autobauer-ausspaehen$tq$, '2026-10-03', $tq$dated$tq$)
on conflict (key) do update set
  title = excluded.title, body = excluded.body, source = excluded.source, url = excluded.url, as_of = excluded.as_of, status = excluded.status;

create or replace view bev_gap_sessions with (security_invoker = true) as
select
  s.client_session,
  date_trunc('week', s.created_at)::date as week_start,
  pr.o ->> 'canton' as canton,
  array(select jsonb_array_elements_text(coalesce(j.p -> 'gapCodes', '[]'::jsonb))) as gap_codes,
  j.p #>> '{chargeSetup,level}' as charge_level,
  j.p #>> '{nextMove,shown}' as move_shown,
  array(select jsonb_array_elements_text(coalesce(j.p #> '{nextMove,outcomes}', '[]'::jsonb))) as move_outcomes
from (
  select distinct on (client_session) * from bev_sessions
  where stage = 'final' and coalesce(payload::jsonb ->> 'fromSample', 'false') <> 'true'
  order by client_session, created_at desc, id desc
) s
cross join lateral (select s.payload::jsonb as p) j
left join lateral (select e -> 'output' as o from jsonb_array_elements(j.p -> 'nodes') e where e ->> 'id' = 'price' limit 1) pr on true;

create or replace view bev_gap_backlog with (security_invoker = true) as
select code, week_start, canton, count(*)::int as people
from (select g.client_session, g.week_start, g.canton, c.code from bev_gap_sessions g cross join lateral unnest(g.gap_codes) as c(code)) t
group by grouping sets ((code, week_start), (code, canton, week_start))
having count(*) >= 5
order by week_start desc, people desc;

create or replace view bev_action_stats with (security_invoker = true) as
select
  split_part(o.key, '.', 1) as action_id,
  split_part(o.key, '.', 2) as outcome,
  count(*)::int as people
from bev_gap_sessions g cross join lateral unnest(g.move_outcomes) as o(key)
group by 1, 2
having count(*) >= 5
order by 1, 2;
