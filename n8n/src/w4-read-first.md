W4: weekly source freshness. NOT active. Targets bev_source_checks_test.

Fetches each source URL already stored in bev_facts and bev_dataset (latest version), one at a time with a pause, and records the HTTP status and a hash of the visible text. It lists broken or changed sources for the team. It never edits a fact or a number.

To go live: (1) run by hand and read 'Compare'. (2) Switch on 'Insert checks', run once, look at bev_source_checks_test. (3) Rebuild with BEV_CHECKS_TABLE=bev_source_checks (node n8n/build-w4.mjs), import, replace the grey mail node, switch the schedule on.
A page that needs a login or blocks robots shows as broken; that is a prompt to look, not a verdict.
