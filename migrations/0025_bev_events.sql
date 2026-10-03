-- 0025: in-person events. The architecture only: a table a person fills, read by the page, empty at first.
--
-- A row is a public event where people can inform themselves in person (an information evening, a charging day, a
-- repair-café style meeting). The organiser's own public page is the link. Nothing here is collected from visitors: no name,
-- no sign-up, no postcode. The page only reads rows that are 'live' and not past.
-- Row-level security on, no policy: the server reads it with its own connection, the public key sees nothing.

create table if not exists bev_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_on date not null,
  ends_on date,
  place text not null,
  canton text check (canton is null or canton ~ '^[A-Z]{2}$'),
  organiser text not null,
  url text not null check (url like 'https://%'),
  note text,
  status text not null default 'draft' check (status in ('draft', 'live')),
  created_at timestamptz not null default now()
);
alter table bev_events enable row level security;
create index if not exists bev_events_live_idx on bev_events (status, starts_on);
