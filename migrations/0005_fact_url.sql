alter table bev_facts add column if not exists url text;

update bev_facts
set url = 'https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/umwelt-mobilitaet/motorfahrzeugsteuer.php'
where key = 'canton-tax' and url is null;
