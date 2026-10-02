create table if not exists bev_notes (
  id text primary key,
  note text not null,
  created_at timestamptz not null default now()
);
