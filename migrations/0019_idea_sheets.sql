-- The idea sheets name their sources and the places they cannot yet cover. Rows are rewritten from src/lib/navigator/facts.ts.

update bev_facts set
  title = $t$A smaller car, and a bigger one when you need it$t$,
  body = $b$Most trips are ordinary. The 2:1 idea sizes the car you own for those, and books a larger vehicle for the rest. A dealer pool can do that. A Renault agency was discussed for this project, and no public offer was found, so it is an idea and not a product. It only works if the class, price, kilometres, insurance, permission to travel, and a fallback car are in writing. Car sharing or a normal rental does the same job. This is not an offer.$b$,
  source = $s$Project idea, discussed with a Renault agency in October 2026. No public offer was found. Not a dealer price.$s$,
  url = null,
  as_of = '2026-10-03',
  status = 'concept'
where key = 'two-for-one';

update bev_facts set
  title = $t$Charging without rebuilding the garage$t$,
  body = $b$Some multi-unit buildings look at a mobile DC charger on an existing power line, instead of a new supply in the underground garage. Designwerk, in Winterthur, makes a 22 kW mobile DC charger that plugs into a 3-phase 32 A socket. The maker lists garages, dealerships and fleets as its use, so whether it fits a residential garage is a question for the building. Whether it is allowed depends on that building’s connection and the other owners. It is not a general right, and it is not in the year cost until there is a quote.$b$,
  source = $s$Designwerk product page for the maker's own description. Project meeting note for the idea. Not confirmed for a residential garage.$s$,
  url = 'https://www.designwerk.com/en/mobile-charger-22-920/',
  as_of = '2026-10-03',
  status = 'unverified'
where key = 'mobile-charger';

update bev_facts set
  title = $t$A used electric car is a number, or it is a guess$t$,
  body = $b$A battery-health certificate should show the date, the kilometres, the method and the result. How much it matters depends on the car's age and kilometres: in the TCS sample, young low-mileage cars were almost all above 90 percent, older ones varied a lot. Since June 2026 Aviloo adds a free battery warranty to a qualifying test. A certificate does not replace a full inspection of brakes, charging hardware and history.$b$,
  source = $s$TCS, 27 November 2025, about 130 used electric cars. Aviloo warranty, reported by electrive on 16 June and 8 September 2026. Not a test price in this check.$s$,
  url = 'https://www.tcs.ch/de/der-tcs/presse/medienmitteilungen-2025/e-occasionen-im-test.php',
  as_of = '2026-10-02',
  status = 'dated'
where key = 'battery';

update bev_facts set
  title = $t$The tax in this check is not your canton$t$,
  body = $b$Cantons do not tax a car the same way. A TCS comparison from February 2026, still the reference used in 2026 roundups, put one electric car at 0 francs a year in Glarus, Solothurn and Zurich, and at 921 francs in Fribourg. A smaller electric car in the same comparison paid much less. Geneva’s electric exemption has ended. Glarus decided on 3 May 2026 that electric cars pay from 1 January 2027, with 25 percent off until 2030. Solothurn’s parliament decided on 6 May 2026 to tax them by weight. Without a canton this check uses one illustrative tax per car class. If you pick a canton or add a postcode in My place, the tax line uses the February 2026 table for the nearest published car. It is not your registration.$b$,
  source = $s$TCS vehicle-tax comparison, February 2026. Not this model, and not a tax assessment.$s$,
  url = 'https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/umwelt-mobilitaet/motorfahrzeugsteuer.php',
  as_of = '2026-10-02',
  status = 'dated'
where key = 'canton-tax';

update bev_facts set
  title = $t$No commune grant is in this sum$t$,
  body = $b$Switzerland pays no federal cheque for buying an electric car. Lists of cantonal purchase grants disagree. A Motoro roundup updated on 10 September 2026, using the TCS tax comparison, names Ticino as the only canton with a purchase premium: 4,000 francs for a new electric car, with conditions, until a credit of 11 million francs runs out. Other write-ups also name Basel-Stadt and Vaud. This check does not pick a winner and does not subtract any of them. Communes and local utilities sometimes add their own amount. Those programmes are small, capped, and they expire. A solar roof is a different investment: a federal one-off payment after the system is running, plus cantonal amounts, none of which is taken off the price of the car. The solar switch in this check only cheapens an illustrative share of home charging. It is not a roof. A postcode added in My place leads to the commune's own page, and a grant is still not a promise.$b$,
  source = $s$Motoro canton roundup, updated 10 September 2026, for the Ticino premium and the disagreement with other lists. Pronovo pays the federal solar one-off. Not this model.$s$,
  url = null,
  as_of = '2026-10-02',
  status = 'dated'
where key = 'local-grant';


