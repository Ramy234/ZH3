// n8n node "ElCom queries" (W3). One query per year: this year and next. ElCom publishes next year's tariffs in early September.
// Canton means are the plain average of the municipal H4 totals, the same method the app uses today.
const year = new Date().getFullYear();
const query = (y) => `PREFIX elcom: <https://energy.ld.admin.ch/elcom/electricityprice/dimension/>
PREFIX schema: <http://schema.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?canton (AVG(?total) AS ?avg) (COUNT(?total) AS ?n) WHERE {
  GRAPH <https://lindas.admin.ch/elcom/electricityprice> {
    ?obs elcom:municipality ?muni ;
         elcom:category <https://energy.ld.admin.ch/elcom/electricityprice/category/H4> ;
         elcom:product <https://energy.ld.admin.ch/elcom/electricityprice/product/standard> ;
         elcom:period "${y}"^^xsd:gYear ;
         elcom:total ?total .
  }
  ?muni schema:containedInPlace ?canton .
  FILTER(STRSTARTS(STR(?canton), "https://ld.admin.ch/canton/"))
} GROUP BY ?canton`;
return [year, year + 1].map((y) => ({ json: { year: y, query: query(y) } }));
