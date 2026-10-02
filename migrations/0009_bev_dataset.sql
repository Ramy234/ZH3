-- Every number the model uses, versioned. Insert-only: a new version is a new set of rows.
-- The browser loads the newest dataset_version. status says how far to trust a row.
create table if not exists bev_dataset (
  dataset_version text not null,
  key text not null,
  value double precision not null,
  unit text not null,
  status text not null check (status in ('placeholder', 'sourced', 'official', 'live')),
  publisher text,
  published_on date,
  source_url text,
  note text not null default '',
  valid_from timestamptz not null default now(),
  primary key (dataset_version, key),
  -- Anything above a placeholder must say who published it, when, and where.
  check (status = 'placeholder' or (publisher is not null and published_on is not null and source_url is not null))
);

create index if not exists bev_dataset_valid_idx on bev_dataset (valid_from desc);

create or replace function bev_dataset_insert_only() returns trigger as $$
begin
  raise exception 'bev_dataset is insert-only: publish a new dataset_version instead';
end;
$$ language plpgsql;

drop trigger if exists bev_dataset_no_change on bev_dataset;
create trigger bev_dataset_no_change before update or delete on bev_dataset
  for each row execute function bev_dataset_insert_only();

alter table bev_dataset enable row level security;
