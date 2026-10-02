W2: publish the BEV dataset. NOT active. Targets bev_dataset_test.

Reads the Google Sheet "BEV dataset", checks every row, compares with the newest version in the database, and inserts a new version only if every row is valid and something changed. It never changes a number itself.

To go live: (1) attach your Google Sheets credential to 'Read sheet'. (2) Run by hand once and look at 'Validate dataset'. (3) Switch on 'Insert new version', run once, check bev_dataset_test. (4) Only then rebuild with BEV_DATASET_TABLE=bev_dataset (node n8n/build-w2.mjs) and import. Never edit a password in a credential.
