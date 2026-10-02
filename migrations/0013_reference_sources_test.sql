-- Copy tables for testing W3 and W4 before they touch the real ones. Same shape, same rules.
create table if not exists bev_reference_test (like bev_reference including defaults including constraints including indexes including identity);
create table if not exists bev_source_checks_test (like bev_source_checks including defaults including constraints including indexes including identity);
alter table bev_reference_test enable row level security;
alter table bev_source_checks_test enable row level security;
drop trigger if exists bev_reference_test_no_change on bev_reference_test;
create trigger bev_reference_test_no_change before update or delete on bev_reference_test
  for each row execute function bev_insert_only();
drop trigger if exists bev_source_checks_test_no_change on bev_source_checks_test;
create trigger bev_source_checks_test_no_change before update or delete on bev_source_checks_test
  for each row execute function bev_insert_only();
