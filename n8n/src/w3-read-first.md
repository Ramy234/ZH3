W3: reference refresh. NOT active. Targets bev_reference_test.

Three branches, each parsed and written as insert-only rows; a failed fetch becomes an ok=false row, never a guessed number:
 1. ElCom canton means for this year and next (SPARQL, monthly).
 2. BFE charging points per postcode (open data, weekly). Large file: if the run runs out of memory, split it or run it on a bigger plan.
 3. BFS pump prices (monthly). OFF: paste the CURRENT XLSX URL of "LIK, Durchschnittspreise fuer Energie und Treibstoffe" into 'BFS file URL' (the asset number changes), run by hand, and check 'Parse BFS' against the table before enabling.

To go live: run each branch by hand, switch on 'Insert reference', run once, look at bev_reference_test. Then rebuild with BEV_REFERENCE_TABLE=bev_reference (node n8n/build-w3.mjs), import, switch on the schedules.
The app does not read bev_reference yet; the dataset sheet (W2) stays the source for the model until it does.
