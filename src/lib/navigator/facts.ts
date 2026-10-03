export type FactKey =
  | "two-for-one"
  | "mobile-charger"
  | "battery"
  | "workplace"
  | "public-tariff"
  | "tenant-right"
  | "winter"
  | "not-for-me"
  | "canton-tax"
  | "local-grant"
  | "wait-or-not"
  | "car-data"
  | "value-loss"
  | "leasing"
  | "test-drive";

export type Fact = {
  key: FactKey;
  title: string;
  body: string;
  source: string;
  url?: string | null;
  linkName?: string;
  as_of: string;
  status: string;
};

export const FACTS: Record<FactKey, Fact> = {
  "two-for-one": {
    key: "two-for-one",
    title: "A smaller car, and a bigger one when you need it",
    body: "Most trips are ordinary. The 2:1 idea sizes the car you own for those, and books a larger vehicle for the rest. A dealer pool can do that. A Renault agency was discussed for this project, and no public offer was found, so it is an idea and not a product. It only works if the class, price, kilometres, insurance, permission to travel, and a fallback car are in writing. Car sharing or a normal rental does the same job. This is not an offer.",
    source: "Project idea, discussed with a Renault agency in October 2026. No public offer was found. Not a dealer price.",
    as_of: "2026-10-03",
    status: "concept",
  },
  "mobile-charger": {
    key: "mobile-charger",
    title: "Charging without rebuilding the garage",
    body: "Some multi-unit buildings look at a mobile DC charger on an existing power line, instead of a new supply in the underground garage. Designwerk, in Winterthur, makes a mobile DC charger (model 22-920, listed with 21 kW DC output) that plugs into a 3-phase 32 A socket. The maker lists garages, dealerships and fleets as its use, so whether it fits a residential garage is a question for the building. Whether it is allowed depends on that building’s connection and the other owners. It is not a general right, and it is not in the year cost until there is a quote.",
    source: "Designwerk product page for the maker's own description. Project meeting note for the idea. Not confirmed for a residential garage.",
    url: "https://www.designwerk.com/en/mobile-charger-22-920/",
    linkName: "Designwerk: mobile DC charger 22-920 (maker's page)",
    as_of: "2026-10-03",
    status: "unverified",
  },
  battery: {
    key: "battery",
    title: "A used electric car is a number, or it is a guess",
    body: "A battery-health certificate should show the date, the kilometres, the method and the result. How much it matters depends on the car's age and kilometres: in the TCS sample, young low-mileage cars were almost all above 90 percent, older ones varied a lot. Since June 2026 Aviloo adds a free battery warranty to a qualifying test. A certificate does not replace a full inspection of brakes, charging hardware and history.",
    source: "TCS, 27 November 2025, about 130 used electric cars. Aviloo warranty, reported by electrive on 16 June and 8 September 2026. Not a test price in this check.",
    url: "https://www.tcs.ch/de/der-tcs/presse/medienmitteilungen-2025/e-occasionen-im-test.php",
    linkName: "TCS: used-car batteries, 27 November 2025",
    as_of: "2026-10-02",
    status: "dated",
  },
  workplace: {
    key: "workplace",
    title: "Ask before you price a wallbox",
    body: "If the car sits at work for a working day, that can be most of the kilometres. This check uses an illustrative staff rate, not free electricity. A yes or a no in writing changes the case more than another brochure.",
    source: "Model assumption, October 2026. Not an employer policy.",
    as_of: "2026-10-02",
    status: "assumption",
  },
  "public-tariff": {
    key: "public-tariff",
    title: "Public charging prices differ a lot",
    body: "There is no maintained Swiss feed of public charging prices. This check uses the TCS 2026 averages: about 59 rappen a kWh at a fast charger and 51 with a subscription. TCS lists AC charging at about 50 and 40. Providers differ by half or more, and roaming can add a lot. Swiss law requires the price in francs per unit, such as kWh or minutes, shown before and during charging. Check the operator in the app before you drive there. If most of your charging is at home, this price matters little. If you have no home charger, it matters most.",
    source: "TCS, charging on the road, 2026 (page undated). Price-display rule: Preisbekanntgabeverordnung. Not a live tariff.",
    url: "https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/elektromobilitaet/elektroauto-unterwegs-laden.php",
    linkName: "TCS: charging on the road",
    as_of: "2026-10-03",
    status: "dated",
  },
  "tenant-right": {
    key: "tenant-right",
    title: "What a tenant can ask for, today",
    body: "There is no general right to a charger. Article 260a of the Code of Obligations lets a tenant change the rented space only with the landlord written consent. A bay is for parking a car. Charging it is not yet treated as that ordinary use. A draft change to the Energy Act, in consultation until 12 October 2026, would let a person who lives in the building, and whose bay came with the home, require a basic installation: a supply line, a way to meter use, and load management where needed. In the draft the owner pays for that basic work and may pass the cost into the parking rent. The user pays for the charging point itself. The work must stay reasonable. This is not law. It does not cover a workplace, and it does not decide a mobile charger in one building. Ask in writing, and keep the answer.",
    source: "Federal Council consultation opened 19 June 2026, Motion 23.3936. Article 260a CO as in force. Not legal advice.",
    url: "https://www.admin.ch/de/newnsb/66VYsJf9n5dbavk-IhLan",
    linkName: "Federal Council: better access to charging at home, 19 June 2026",
    as_of: "2026-10-02",
    status: "draft",
  },
  winter: {
    key: "winter",
    title: "Winter range is a real trip, not a slogan",
    body: "In the gfs.bern Mobility Monitor of September 2025, 79 percent of voters who would not buy a pure electric car called its limited range a very or rather important reason. The report’s own summary prints 78. This is 1,002 voters, asked in June and July 2025 for auto-schweiz, the importers’ body. It is not a count of all drivers. This check does not apply a winter factor to the kilometres or the francs. One percentage would pretend to be their road, their speed and their heater. What can be checked is narrower: the longest trip they actually take in winter, whether that trip is rare enough to borrow, and a measured consumption on that kind of day. Not the brochure figure. If the ordinary week is fine and the worry is one trip, that is the smaller-car question, not a reason to size the car for the worst day.",
    source: "gfs.bern Mobility Monitor, 13 September 2025, page 20 for the 79 percent (page 4 prints 78). Commissioned by auto-schweiz. This model still has no winter factor.",
    as_of: "2026-10-03",
    status: "dated",
  },
  "not-for-me": {
    key: "not-for-me",
    title: "Not wanting one is allowed",
    body: "A feeling is not a calculation error. People refuse a switch because the car is part of how they see themselves, because a bad story travelled further than a good one, or because the decision is not theirs alone. This check will not talk them out of that. It separates two things. The francs are a model. The refusal does not have to move. If the number says the switch does not pay, the feeling and the money agree. If the number says it does pay, the feeling can still win. Write that down as a choice. Do not correct it as ignorance.",
    source: "Project stance, October 2026. Not a psychological diagnosis.",
    as_of: "2026-10-02",
    status: "stance",
  },
  "canton-tax": {
    key: "canton-tax",
    title: "The tax in this check is not your canton",
    body: "Cantons do not tax a car the same way. A TCS comparison from February 2026, still the reference used in 2026 roundups, put one electric car at 0 francs a year in Glarus, Solothurn and Zurich, and at 921 francs in Fribourg. A smaller electric car in the same comparison paid much less. Geneva’s electric exemption has ended. Glarus decided on 3 May 2026 that electric cars pay from 1 January 2027, with 25 percent off until 2030. Solothurn’s parliament decided on 6 May 2026 to tax them by weight. Without a canton this check uses one illustrative tax per car class. If you pick a canton or add a postcode in My place, the tax line uses the February 2026 table for the nearest published car. It is not your registration.",
    source: "TCS vehicle-tax comparison, February 2026. Not this model, and not a tax assessment.",
    url: "https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/umwelt-mobilitaet/motorfahrzeugsteuer.php",
    linkName: "TCS vehicle-tax comparison, February 2026",
    as_of: "2026-10-02",
    status: "dated",
  },
  "local-grant": {
    key: "local-grant",
    title: "No commune grant is in this sum",
    body: "Switzerland pays no federal cheque for buying an electric car. Lists of cantonal purchase grants disagree. A Motoro roundup updated on 10 September 2026, using the TCS tax comparison, names Ticino as the only canton with a purchase premium: 4,000 francs for a new electric car, with conditions, until a credit of 11 million francs runs out. Other write-ups also name Basel-Stadt and Vaud. This check does not pick a winner and does not subtract any of them. Communes and local utilities sometimes add their own amount. Those programmes are small, capped, and they expire. A solar roof is a different investment: a federal one-off payment after the system is running, plus cantonal amounts, none of which is taken off the price of the car. The solar switch in this check only cheapens an illustrative share of home charging. It is not a roof. A postcode added in My place leads to the commune's own page, and a grant is still not a promise.",
    source: "Motoro canton roundup, updated 10 September 2026, for the Ticino premium and the disagreement with other lists. Pronovo pays the federal solar one-off. Not this model. The link is the public database of programmes, not the roundup.",
    url: "https://www.energiefranken.ch/de",
    linkName: "Energiefranken: programmes by postcode",
    as_of: "2026-10-02",
    status: "dated",
  },
  "wait-or-not": {
    key: "wait-or-not",
    title: "Wait for better batteries, or not",
    body: "Batteries are getting cheaper. In 2025 the average pack price fell 8 percent, and the cheaper lithium-iron-phosphate type is now over half of electric-car batteries worldwide. Sodium-ion batteries exist in small numbers. Solid-state batteries are still prototypes, with makers announcing production between 2027 and 2030 and a mass market in the 2030s. None of this is a Swiss car price. A better car later is not a reason to call a good car now a bad one. And waiting is not free: each year you keep running the car you have is a year of its running cost, which is the figure on your result. If a used car or a smaller one makes today's price fit, buying now can be the fair answer. If the figures say keep, keeping while the market improves is fair too.",
    source: "BloombergNEF battery price survey, 9 December 2025 (global average, USD, fell 8 percent). IEA Global EV Outlook 2026, batteries chapter (LFP share above 55 percent in 2025; sodium-ion limited; solid-state at prototype stage). Empa lecture of 9 September 2026 for context. Global figures, not a Swiss price.",
    url: "https://iea.org/reports/global-ev-outlook-2026/electric-vehicle-batteries",
    linkName: "IEA: electric vehicle batteries, Global EV Outlook 2026",
    as_of: "2026-10-03",
    status: "dated",
  },
  "car-data": {
    key: "car-data",
    title: "What a connected car passes on",
    body: "Almost every new car, electric or petrol, sends some data to its maker. No recent study that compared matching new electric and petrol cars found one worse than the other. The drivetrain is a poor guide. What differs is the maker, the model year, the app and the settings. An old test of four cars in 2017 found data leaving petrol cars as well as electric ones. A 2023 review of 25 brands by the Mozilla Foundation read their privacy terms, not measured traffic, and rated all 25 as failing. What an electric car adds is public charging: the operator can hold a record of where and when you charged. A written question to the maker, for the exact model and settings, is stronger evidence than any ranking. This sheet ranks no brand and names no model.",
    source: "SRF on the ADAC examination, 21 February 2017 (four cars, old). Mozilla Foundation, Privacy Not Included, September 2023 (policies, not measurements). CNIL recommendation on connected-vehicle location data, June 2026 (France). Quebec Commission on Ethics in Science and Technology, August 2026 (Canada). Outside Switzerland except the SRF report.",
    url: "https://www.srf.ch/news/schweiz/datenkrake-auto-wie-uns-autobauer-ausspaehen",
    linkName: "SRF: how car makers see what we do (2017)",
    as_of: "2026-10-03",
    status: "dated",
  },
  "value-loss": {
    key: "value-loss",
    title: "What a car really costs: the value it loses",
    body: "A company writes a car off over a few years and counts a slice each year. A household does not write anything off. It pays the price, or a loan, and later gets back what the car sells for. The difference is the value loss, and in the federal total-cost study it is the biggest block: purchase price and financing, minus the sale price, make up 43 to 72 percent of what a car costs over its life, depending on size and drive. Energy is only 5 to 9 percent for an electric car and 14 to 27 percent for a petrol car of the same size. That is why this check compares the extra price you pay now with what you save each year, and why the resale value is a number you can change. It is not a tax write-off, and it is not a figure for your car.",
    source: "Swiss Federal Office of Energy, total-cost study of 23 March 2023 (EnergieSchweiz), tables 21 to 24, pages 30 to 33: cost shares for small, mid-size, premium and SUV, combustion and electric. 2022 prices, new cars. Not this person's car.",
    url: "https://www.newsd.admin.ch/newsd/message/attachments/76392.pdf",
    linkName: "Federal Office of Energy: full total-cost study, 23 March 2023",
    as_of: "2026-10-03",
    status: "dated",
  },
  leasing: {
    key: "leasing",
    title: "Leasing instead of buying: what to check first",
    body: "In Swiss law a lease of a car for private use is a credit contract. Leases between 500 and 80,000 francs fall under the Consumer Credit Act, which brings a right to withdraw after signing, reported as 14 days by several consumer sources (one cantonal leaflet says 7, so read the law text). Leasing does not remove the value loss: the lessor prices it into the monthly rate, and at the end you hand the car back. Leaving early is usually costly. The return is checked against the lessor's damage list, kilometres over the agreed limit are billed per kilometre, and full-comprehensive insurance is usually a condition. The Federal Council set the highest interest rate for cash loans at 10 percent from 1 January 2026. Its release does not say whether leasing is covered in the same way, so ask for the effective yearly rate in writing. This check does not price a lease, and this sheet recommends none.",
    source: "Federal Council, 31 October 2025 (maximum rate from 1 January 2026, cash loans). Consumer Credit Act (KKG), as summarised by Moneyland, Beobachter (updated 22 July 2025) and Die Mobiliar (September 2026). TCS leasing-return booklet, 2018. Not legal advice. The official law text could not be opened for this sheet.",
    url: "https://www.admin.ch/de/newnsb/DDMAgqQLfpn8NHgjWIIrt",
    linkName: "Federal Council: highest interest rate for consumer credit from 1 January 2026",
    as_of: "2026-10-03",
    status: "dated",
  },
  "test-drive": {
    key: "test-drive",
    title: "Try it for 48 hours before you decide",
    body: "A short test drive shows how a car feels. It does not show whether your week works. The federal energy programme recommends a test drive and notes that many dealers offer a free trial. An extended test, two days or more, is the idea here: charge it where you would charge it, drive your own commute, take it on the motorway, and leave it overnight in the cold if you can. A 24-hour and a 3-day trial were part of an EnergieSchweiz campaign that ran from May to 31 July 2026 and has ended. No standing multi-day offer from a provider was found, so this is an idea and not a product. Car sharing or a rental does a similar job today. This is not an offer.",
    source: "EnergieSchweiz, electric cars for every day (undated). eco-auto of the VCS, 1 June 2026, on the test-drive campaign (ended 31 July 2026; the campaign page itself could not be opened). TCS, 19 February 2026, seven tips for buying an electric car. Comparis, 27 June 2024. Not a provider offer.",
    url: "https://energieschweiz.ch/programme/fahr-mit-dem-strom/elektroauto",
    linkName: "EnergieSchweiz: electric cars for every day",
    as_of: "2026-10-03",
    status: "concept",
  },
};

export type FactView = {
  kicker: string;
  /** A picture that reacts to taps on the sheet itself. */
  diagram?: "year-days" | "battery-age";
  /** Named, linked sources and examples. A manufacturer or a test provider is named as what it is. */
  links?: { name: string; href: string; note: string }[];
  figure?: { value: string; caption: string; fill?: number };
  compare?: { left: { value: string; label: string; amount: number }; right: { value: string; label: string; amount: number }; caption: string };
  lines: { label: string; text: string; more?: { label: string; text: string }[]; link?: { name: string; href: string } }[];
};

export const FACT_VIEW: Record<FactKey, FactView> = {
  "two-for-one": {
    kicker: "An idea worth knowing. Not an offer.",
    diagram: "year-days",
    lines: [
      { label: "The idea", text: "Own the car for ordinary days. Book a larger one for the few days it cannot do." },
      { label: "In writing, or it is not a plan", text: "Class, price, kilometres, insurance, permission to travel, and a fallback car." },
      { label: "What must be written down", text: "How many days a year are guaranteed. How early you book, and what happens in a peak week. Which class of car, with a roof box or bike rack if you need one. Who pays insurance, charging and damage. What ends the guarantee, and who is the other party." },
      { label: "Who could offer it", text: "A dealer pool is one example. A Renault agency was discussed for this project, and no public offer was found. Car sharing and an ordinary rental do the same job today." },
      { label: "In this check", text: "The switch “One class down” prices it: a smaller car, and the exceptional days booked as rental at an illustrative day rate." },
    ],
    links: [
      { name: "EnergieSchweiz: electric cars for every day", href: "https://energieschweiz.ch/programme/fahr-mit-dem-strom/elektroauto", note: "The federal energy programme. It names car sharing as one way to use an electric car without owning a big one." },
      { name: "The Mobility car-sharing network", href: "https://www.mobility.ch/", note: "A Swiss car-sharing cooperative: one example of booking a larger car by the hour or day. An example, not a recommendation, and not a quote." },
    ],
  },
  "mobile-charger": {
    kicker: "An idea worth knowing. Not confirmed for a home. Not in the year cost.",
    figure: {
      value: "21 kW",
      caption: "What one maker lists: a mobile DC charger, model 22-920, from Designwerk (Winterthur) that plugs into a 3-phase 400 V, 32 A socket. The maker names garages, dealerships and fleets as its use. Price not published on the page.",
    },
    lines: [
      { label: "The idea", text: "A charger that comes to the car and plugs into the building's existing power line, instead of rebuilding the garage." },
      { label: "The limit", text: "It needs that kind of socket nearby, and it depends on the building's connection and the other owners. A residential garage is not the use the maker lists, so ask both the maker and the building." },
      { label: "This check", text: "It stays out of the francs until there is a quote for your building." },
    ],
    links: [
      { name: "Designwerk: mobile DC charger 22-920", href: "https://www.designwerk.com/en/mobile-charger-22-920/", note: "The maker's own page. A manufacturer, so not a neutral source." },
      { name: "Charging in a rented building, EnergieSchweiz", href: "https://www.energieschweiz.ch/ladeinfrastruktur/werkzeuge/ladeinfrastruktur-in-mietobjekten/", note: "Neutral federal guidance on asking a landlord or owners." },
    ],
  },
  battery: {
    kicker: "A dated test, and a new free warranty. Not a price in this sum.",
    diagram: "battery-age",
    links: [
      { name: "Aviloo: battery warranty for used electric cars", href: "https://electrive.com/2026/09/08/aviloo-expands-battery-warranty-to-26-countries", note: "New since June 2026, Switzerland included by September 2026. Free with a qualifying Aviloo Flash Test: EUR 3,000 if the battery falls below its calculated limit, for one year or 20,000 km. Aviloo sells the test, so read its terms before you rely on it." },
      { name: "TCS: batteries of used electric cars, 27 November 2025", href: "https://www.tcs.ch/de/der-tcs/presse/medienmitteilungen-2025/e-occasionen-im-test.php", note: "About 130 cars, January to September 2025, measured with Aviloo equipment." },
    ],
    lines: [
      {
        label: "A certificate should show",
        text: "The date, the kilometres, the method, and the result.",
        more: [
          { label: "Date", text: "The day of the reading, not the day the advert was written." },
          { label: "Kilometres", text: "The distance on the car that day." },
          { label: "Method", text: "Read from the car, not guessed from its age. In that TCS sample the device was Aviloo, on the diagnostic plug." },
          { label: "Result", text: "State of health: how much of the original capacity is still there. A new car is 100 percent." },
        ],
        link: { name: "TCS release, 27 November 2025", href: "https://www.tcs.ch/de/der-tcs/presse/medienmitteilungen-2025/e-occasionen-im-test.php" },
      },
      {
        label: "It does not cover",
        text: "Brakes, charging hardware, and the car’s history.",
        more: [
          { label: "The reading", text: "It is a capacity figure. It does not inspect the housing, the seals, the fuses, the pumps, or the cables." },
          { label: "The rest of the car", text: "Brakes, the charging socket, and the service history are a different inspection." },
          { label: "A fuller test", text: "TCS says the quick reading stops there. A used-car test looks at the drivetrain parts it can reach." },
        ],
        link: { name: "What the TCS quick test does not say", href: "https://www.tcs.ch/de/der-tcs/sektionen/zuerich/news/batterietest-elektrofahrzeuge.php" },
      },
      {
        label: "Before a listing counts",
        text: "Ask what was tested, then read the four fields.",
        more: [
          { label: "Ask the seller", text: "For the certificate. Then check the date, the kilometres, the method, and the result." },
          { label: "The usual warranty", text: "Often 8 years or 160,000 km, down to 70 percent. It varies by maker. This check does not look up a brand. TCS says a test matters more once that cover is over." },
          { label: "This sum", text: "A certificate does not change the francs here. The used-car price stays a placeholder." },
        ],
        link: { name: "TCS advice on a used electric car", href: "https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/elektromobilitaet/elektroauto-occasion.php" },
      },
    ],
  },
  workplace: {
    kicker: "Used in the sum. Not your employer’s rule.",
    lines: [
      { label: "Why it matters", text: "If the car sits at work for a working day, that can be most of the kilometres." },
      { label: "In the sum", text: "An illustrative staff rate. Not free power." },
      { label: "What actually changes the case", text: "A yes or a no in writing." },
    ],
  },
  "public-tariff": {
    kicker: "An average. Not a live price.",
    links: [
      { name: "EnergieSchweiz: map of public charging points", href: "https://www.energieschweiz.ch/tools/ladeinfrastruktur-schweiz/", note: "Neutral, federal. Plugs, power and, for most points, free or taken right now. The best first look at a place." },
      { name: "ElCom: electricity prices by commune", href: "https://www.strompreis.elcom.admin.ch/", note: "The regulator's table of home electricity prices. Useful for the home share, not for public charging." },
      { name: "Z-Volt, a charging service run by Zurich Insurance", href: "https://www.zurich.ch/de/privat/mobilitaet-reisen/zurich-zvolt", note: "A provider, not a neutral source: an app and card with a start fee per charge, open to anyone with a Swiss residence, with different prices for its own insurance customers. Listed so you can compare it with other cards, not as a recommendation." },
    ],
    lines: [
      { label: "In the sum", text: "One public rate for every place: the TCS 2026 average for fast charging, about 59 rappen a kWh. With a subscription, about 51." },
      { label: "Why it can be off", text: "Providers differ by half or more, and roaming can add a lot. The price must be shown in francs per unit before you charge." },
      { label: "What this will not do", text: "Ask a chat model to invent the price." },
    ],
  },
  "tenant-right": {
    kicker: "A draft. Not law.",
    lines: [
      { label: "Today", text: "Article 260a of the Code of Obligations. A tenant changes the rented space only with written consent. A bay is for parking. Charging is not yet treated as that ordinary use." },
      { label: "The draft, until 12 October 2026", text: "Consultation opened 19 June 2026, Motion 23.3936. A person who lives there, and whose bay came with the home, could require a supply line, a way to meter use, and load management where needed. The owner would pay for that basic work and may pass it into the parking rent. The user pays for the charger. The work must stay reasonable." },
      { label: "Not this", text: "Not law. Not a workplace. Not a decision about a mobile charger. Not an answer for this building until someone writes one." },
      { label: "No date yet", text: "The Federal Council has published no date of entry into force. Any year you read elsewhere is a guess, including ours. This page is checked again after the consultation closes." },
      { label: "Meanwhile", text: "Ask in writing for a coordinated base installation for the whole garage, not one socket. Look for neighbours who want the same. Ask about load management. Check the cantonal and communal grants." },
    ],
    links: [
      { name: "Federal Council: better access to charging at home, 19 June 2026", href: "https://www.admin.ch/de/newnsb/66VYsJf9n5dbavk-IhLan", note: "The official release of the draft and the consultation. Not law." },
      { name: "Charging in a rented building, EnergieSchweiz", href: "https://www.energieschweiz.ch/ladeinfrastruktur/werkzeuge/ladeinfrastruktur-in-mietobjekten/", note: "Neutral federal guidance on asking a landlord or owners." },
    ],
  },
  winter: {
    kicker: "Other people’s answers. Not your trip.",
    figure: {
      value: "79%",
      fill: 0.79,
      caption: "Of voters who would not buy a pure electric car, the share who called limited range a very or rather important reason. gfs.bern Mobility Monitor, 13 September 2025, for auto-schweiz; the report’s summary prints 78. A survey, not a measurement of your car in winter.",
    },
    lines: [
      { label: "Not in the francs", text: "This check applies no winter factor to the kilometres or the money. One percentage would pretend to be your road, your speed and your heater." },
      { label: "What can be checked", text: "The longest trip you actually take in winter. Whether that trip is rare enough to borrow. A measured consumption on that kind of day. Not the brochure figure." },
      { label: "If the ordinary week is fine", text: "One bad trip is the smaller-car question. It is not a reason to size the car for the worst day." },
    ],
  },
  "not-for-me": {
    kicker: "A choice. Not a mistake in the sum.",
    lines: [
      { label: "The francs", text: "They stay a model." },
      { label: "The refusal", text: "It does not have to move. This check will not talk you out of it." },
      { label: "When they disagree", text: "If the number says the switch does not pay, the feeling and the money agree. If the number says it does pay, the feeling can still win." },
    ],
  },
  "canton-tax": {
    kicker: "One comparison. Not your tax bill.",
    compare: {
      left: { value: "CHF 0", label: "Glarus, Solothurn, Zurich", amount: 0 },
      right: { value: "CHF 921", label: "Fribourg", amount: 921 },
      caption: "The same electric car, tax for a year, in a TCS comparison from February 2026. A smaller electric car in that comparison paid much less.",
    },
    lines: [
      { label: "Already moving", text: "Geneva’s electric exemption has ended. Glarus decided on 3 May 2026 that electric cars pay from 1 January 2027, with 25 percent off until 2030. Solothurn’s parliament decided on 6 May 2026 to tax them by weight. The table here is still February 2026. Zurich’s zero is not a promise." },
      { label: "This check", text: "Pick a canton on the result. The tax line then uses this table for the nearest published car. It is not your registration." },
      { label: "What it is not", text: "Not a postcode, and not a tax bill. Insurance has no open list, so that line stays a class amount." },
    ],
  },
  "local-grant": {
    kicker: "Not in the francs. Not a promise if you name a town.",
    lines: [
      { label: "From the country", text: "No federal payment for buying the car." },
      { label: "From a canton", text: "Published lists disagree. One roundup, updated 10 September 2026, names only Ticino: 4,000 francs for a new electric car, with conditions, until the credit runs out. Other pages also name Basel-Stadt and Vaud. None of those amounts is subtracted here." },
      { label: "From a commune or a utility", text: "Sometimes a few hundred or a few thousand francs. The pot is capped and the rule expires. This check does not know your commune." },
      { label: "A solar roof", text: "A separate project. The federal one-off is paid after the panels are running. It is not taken off the car. The solar switch here only lowers an illustrative share of home charging. It does not price the roof." },
    ],
  },
  "wait-or-not": {
    kicker: "Global figures. Not a Swiss price.",
    figure: {
      value: "8%",
      caption: "How much the average battery pack price fell in 2025, in the BloombergNEF survey of 9 December 2025. The IEA reports the same drop. A global average, in dollars, for the pack only. A car has more parts than a battery.",
    },
    links: [
      { name: "IEA: electric vehicle batteries, Global EV Outlook 2026", href: "https://iea.org/reports/global-ev-outlook-2026/electric-vehicle-batteries", note: "The intergovernmental energy agency. Prices, the share of cheaper cell types, and how far sodium-ion and solid-state have come." },
      { name: "BloombergNEF: battery pack prices fall to $108 a kWh", href: "https://about.bnef.com/insights/commodities/lithium-ion-battery-pack-prices-fall-to-108-per-kilowatt-hour-despite-rising-metal-prices/", note: "An analyst firm's press release. Global averages, with China, Europe and North America apart." },
    ],
    lines: [
      { label: "What is changing", text: "Cheaper cell types are spreading. Sodium-ion exists in small numbers. Solid-state is still a prototype, with production announced between 2027 and 2030 and a mass market later." },
      { label: "What waiting costs", text: "A year of running the car you have. That is the figure on your result, and it is the honest price of waiting." },
      { label: "What a better car later does not mean", text: "That today's car is a bad one. Cars bought in 2020 still drive. A used electric car also keeps the battery question small if it has a certificate." },
      { label: "What nobody can tell you", text: "A Swiss price for a car in five years. This sheet gives none." },
    ],
  },
  "car-data": {
    kicker: "Every connected car, not only electric ones. No brand ranking.",
    links: [
      { name: "SRF: how car makers see what we do", href: "https://www.srf.ch/news/schweiz/datenkrake-auto-wie-uns-autobauer-ausspaehen", note: "Swiss broadcaster, 21 February 2017, on an ADAC examination of four cars. Old, and not a ranking." },
      { name: "Carscoops, 10 Sep 2023: a press report on the Mozilla study", href: "https://www.carscoops.com/2023/09/the-automotive-industry-is-the-worst-consumer-product-sector-for-data-privacy-study-claims/", note: "A car news site that reported the Mozilla Foundation's review of 25 brands' privacy terms. Terms, not measured traffic. Outside Switzerland. Mozilla's own page has moved to its Nothing Personal magazine, so the original article is no longer at its old address." },
      { name: "CNIL: location data from connected cars, June 2026", href: "https://www.cnil.fr/fr/recommandation-vehicules-connectes-localisation", note: "The French data-protection authority, in French. Guidance, not a test. Outside Switzerland." },
      { name: "Quebec: risks and ethical issues of connected vehicles", href: "https://www.ethique.gouv.qc.ca/publications/les-risques-et-enjeux-ethiques-des-vehicules-connectes/", note: "An expert report of August 2026 listing twelve issues. A risk map, not a measurement. Outside Switzerland." },
    ],
    lines: [
      { label: "What the evidence says", text: "No recent study that compared matching new electric and petrol cars found one worse. The drivetrain is a poor guide. The maker, the model year, the app and the settings decide." },
      { label: "What an electric car adds", text: "Public charging. The operator or the card provider can hold a record of where and when you charged. Charging at home or at work leaves a different trail." },
      { label: "At handover", text: "Open the car's privacy or connectivity settings together with the seller, and choose the most private option. Do not link an app account unless you want the remote functions. Ask how to reset the car for a second driver, and when you sell it." },
      { label: "In writing", text: "Ask the maker which data leave the car for your exact model and settings, who receives them, where they are processed, and for how long. The next-move card has the message to copy." },
    ],
  },
  "value-loss": {
    kicker: "A federal study of what a car costs. 2022 prices, new cars.",
    figure: {
      value: "43 to 72%",
      caption: "Purchase price and financing, minus what the car sells for, as a share of the total cost of owning it. The range runs over small cars to premium, combustion and electric. It is the biggest block, bigger than fuel or electricity.",
    },
    links: [
      { name: "Federal Office of Energy: full total-cost study, 23 March 2023", href: "https://www.newsd.admin.ch/newsd/message/attachments/76392.pdf", note: "The cost blocks for each size and drive are in tables 21 to 24, pages 30 to 33. 2022 prices, an insurance profile in Aarau." },
      { name: "EnergieSchweiz: factsheet on the total cost of a car", href: "https://www.newsd.admin.ch/newsd/message/attachments/76353.pdf", note: "The short version. It sets the eight-year window this check uses." },
    ],
    lines: [
      { label: "What a company does", text: "It writes the car off over a few years and counts a slice each year. That is an accounting rule, not money leaving the account." },
      { label: "What a household has", text: "A price paid now, or a loan, and a sale price later. The value loss is the gap between them, and you only know it when you sell." },
      { label: "Why the check asks for the extra price", text: "Because that is the money you put in. It then asks how long the cheaper running takes to cover it, and what happens if you sell sooner." },
      { label: "Why the resale value is yours to change", text: "A few thousand francs more or less at the end moves the result more than a few rappen on electricity. You can change it under What if." },
      { label: "What differs for an electric car", text: "Energy is a small block: 5 to 9 percent of the total, against 14 to 27 percent for a petrol car of the same size. The price you pay and the price you get back carry the result." },
    ],
  },
  leasing: {
    kicker: "Consumer sources and one federal release. Not legal advice. This check prices no lease.",
    links: [
      { name: "Federal Council: highest interest rate for consumer credit from 1 January 2026", href: "https://www.admin.ch/de/newnsb/DDMAgqQLfpn8NHgjWIIrt", note: "A federal press release of 31 October 2025. It names cash loans and overdrafts and does not say whether leasing is covered." },
      { name: "Consumer Credit Act (KKG), official text", href: "https://www.fedlex.admin.ch/eli/cc/2002/593/de", note: "The federal law itself. It opens as a web app, and Article 16 gives the right to withdraw." },
      { name: "TCS: returning a leased car (booklet, 2018)", href: "https://www.tcs.ch/mam/Digital-Media/PDF/Booklets/leasing-rueckgabe.pdf", note: "The Swiss touring club, 2018. How the return is checked, what is billed, and how to report damage." },
      { name: "Beobachter: the leasing contract", href: "https://www.beobachter.ch/beratung/rechtsratgeber/konsum/kauf-und-leasing/leasing/auto-der-leasingvertrag", note: "A consumer magazine, a company and not a public body. 22 April 2022: the Consumer Credit Act, the 14-day withdrawal, what to read in the contract." },
      { name: "Moneyland: leasing explained", href: "https://www.moneyland.ch/de/leasing-definition", note: "A comparison provider, a company and not a public body. Undated. The scope of the Consumer Credit Act and the interest cap." },
      { name: "Die Mobiliar: car leasing in Switzerland", href: "https://www.mobiliar.ch/ratgeber/autoleasing-schweiz", note: "An insurer's guide, a company and not a neutral source. September 2026: residual-value table, kilometre limit, damage, early exit." },
    ],
    lines: [
      { label: "What it is in law", text: "A credit contract. Between 500 and 80,000 francs it falls under the Consumer Credit Act, with a right to withdraw after signing (14 days in most sources, 7 in one cantonal leaflet: check the law)." },
      { label: "What it does not do", text: "Remove the value loss. The lessor prices it into the monthly rate. At the end you return the car and have no car and no sale price." },
      {
        label: "Ask for these in writing",
        text: "The effective yearly interest rate. The residual value in the contract, and who carries the risk if the car is worth less. The kilometres included and the price per extra kilometre. The exact cost of leaving early.",
        more: [
          { label: "And these", text: "The list of what counts as damage beyond normal wear. The insurance the lessor requires and what it costs. What the buy-out price is at the end, and whether it matches the residual value in the contract." },
        ],
      },
      { label: "Leaving early", text: "Usually costly, because a car loses value fastest in its first years. Work out what you would pay at year two before you sign." },
      { label: "For an electric car", text: "The residual value is the lessor's guess about the battery and the second-hand market. Ask what it assumes and how a battery certificate at the end would be treated." },
    ],
  },
  "test-drive": {
    kicker: "An idea worth knowing. Not an offer.",
    links: [
      { name: "EnergieSchweiz: electric cars for every day", href: "https://energieschweiz.ch/programme/fahr-mit-dem-strom/elektroauto", note: "The federal energy programme. It recommends a test drive, notes that many dealers offer a free trial, and points to car sharing as another way to try." },
      { name: "TCS: seven tips for buying an electric car", href: "https://www.tcs.ch/de/der-tcs/presse/medienmitteilungen-2026/tipps-zum-kauf-eines-elektroautos.php", note: "The Swiss touring club, 19 February 2026. How much range to plan for, and what to check on warranty and battery." },
      { name: "eco-auto (VCS): test an electric car in daily life", href: "https://eco-auto.info/article/e-autos-im-alltag-testen-1-tag-bis-3-monate-probefahrt-aktion", note: "An environmental transport association, 1 June 2026. It describes the EnergieSchweiz trial campaign of May to July 2026, which has ended." },
      { name: "Mobility: electric car sharing", href: "https://mobility.ch/elektromobilitaet/fahr-mit-dem-strom", note: "A car-sharing provider, a company and not a neutral source. Its free-months campaign ran from May to 31 July 2026 and has ended. Listed as an example of trying an electric car by the hour." },
    ],
    lines: [
      { label: "The idea", text: "Two days with the car, not twenty minutes. Enough to see whether your own week works." },
      { label: "What to try in them", text: "Charge it where you would charge it. Drive your own commute and the motorway. If you can, leave it outside overnight in the cold and pre-heat it while plugged in." },
      { label: "How much range to trust", text: "The TCS suggests planning for two to four days of use between charges. For winter trips it suggests a rated range of about twice the distance to your first break." },
      { label: "What exists today", text: "Free trials at many dealers, car sharing, and rental. The federal 24-hour and 3-day trial campaign ended on 31 July 2026. No standing multi-day offer from a provider was found." },
      { label: "What to ask for", text: "The days, the kilometres, who insures it, what you pay if you do not buy, and a charger you may use. In writing, as with any 2:1 or lease arrangement." },
    ],
  },
};
