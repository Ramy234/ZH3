// n8n node "BFS file URL" (W3). Paste the CURRENT XLSX address of the BFS table here, between the quotes.
// While it is empty, this branch stops here and nothing is fetched.
const url = '';
if (!url) return [];
return [{ json: { url } }];
