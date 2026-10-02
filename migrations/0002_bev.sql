create table if not exists bev_facts (
  key text primary key,
  title text not null,
  body text not null,
  source text not null,
  as_of text not null,
  status text not null
);

create table if not exists bev_sessions (
  id text primary key,
  client_session text not null,
  stage text not null,
  payload text not null,
  created_at timestamptz not null default now()
);

create index if not exists bev_sessions_client_idx on bev_sessions (client_session, created_at);

insert into bev_facts (key, title, body, source, as_of, status) values
(
  'two-for-one',
  'A smaller car, and a bigger one when you need it',
  'Most trips are ordinary. The 2:1 idea sizes the car you own for those, and books a larger vehicle for the rest. A dealer pool can do that — a Renault agency is one example discussed for this project — but only if the class, price, kilometres, insurance, permission to travel, and a fallback car are in writing. Car sharing or a normal rental does the same job. This is not an offer.',
  'Project concept, October 2026. Not a dealer price.',
  '2026-10-02',
  'concept'
),
(
  'mobile-charger',
  'Charging without rebuilding the garage',
  'Some multi-unit buildings look at a mobile DC charger on an existing power line, instead of a new supply in the underground garage. Designwerk is one manufacturer in that category. Whether it is allowed depends on that building’s connection and the other owners. It is not a general right, and it is not in the year cost until there is a quote.',
  'Project meeting note. Not confirmed with the manufacturer.',
  '2026-10-02',
  'unverified'
),
(
  'battery',
  'A used electric car is a number, or it is a guess',
  'A battery-health certificate should show the date, the kilometres, the method and the result. It does not replace a full inspection of brakes, charging hardware and history. Ask what a centre such as TCS actually tests before you treat a listing as safe.',
  'Project concept, October 2026. Not a test price.',
  '2026-10-02',
  'concept'
),
(
  'workplace',
  'Ask before you price a wallbox',
  'If the car sits at work for a working day, that can be most of the kilometres. This check uses an illustrative staff rate, not free electricity. A yes or a no in writing changes the case more than another brochure.',
  'Model assumption, October 2026. Not an employer policy.',
  '2026-10-02',
  'assumption'
),
(
  'public-tariff',
  'Public prices are not live in this check',
  'There is no maintained Swiss public-tariff feed here. The public rate is a placeholder. A database can store a dated tariff once a source is agreed. It cannot invent a live price, and a chat model should not be asked to.',
  'Placeholder. Not EICom and not a charging operator.',
  '2026-10-02',
  'placeholder'
)
on conflict (key) do nothing;
