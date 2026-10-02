-- Copy table for testing W2 before it touches bev_dataset. Same shape, same rules.
create table if not exists bev_dataset_test (like bev_dataset including defaults including constraints);
alter table bev_dataset_test add primary key (dataset_version, key);
drop trigger if exists bev_dataset_test_no_change on bev_dataset_test;
create trigger bev_dataset_test_no_change before update or delete on bev_dataset_test
  for each row execute function bev_dataset_insert_only();
alter table bev_dataset_test enable row level security;
