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
  | "local-grant";

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
    body: "Most trips are ordinary. The 2:1 idea sizes the car you own for those, and books a larger vehicle for the rest. A dealer pool can do that — a Renault agency is one example discussed for this project — but only if the class, price, kilometres, insurance, permission to travel, and a fallback car are in writing. Car sharing or a normal rental does the same job. This is not an offer.",
    source: "Project concept, October 2026. Not a dealer price.",
    as_of: "2026-10-02",
    status: "concept",
  },
  "mobile-charger": {
    key: "mobile-charger",
    title: "Charging without rebuilding the garage",
    body: "Some multi-unit buildings look at a mobile DC charger on an existing power line, instead of a new supply in the underground garage. Designwerk is one manufacturer in that category. Whether it is allowed depends on that building’s connection and the other owners. It is not a general right, and it is not in the year cost until there is a quote.",
    source: "Project meeting note. Not confirmed with the manufacturer.",
    as_of: "2026-10-02",
    status: "unverified",
  },
  battery: {
    key: "battery",
    title: "A used electric car is a number, or it is a guess",
    body: "A battery-health certificate should show the date, the kilometres, the method and the result. It does not replace a full inspection of brakes, charging hardware and history. Ask what a centre such as TCS actually tests before you treat a listing as safe.",
    source: "TCS, 27 November 2025, about 130 used electric cars. Not a test price in this check.",
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
    body: "Cantons do not tax a car the same way. A TCS comparison from February 2026, still the reference used in 2026 roundups, put one electric car at 0 francs a year in Glarus, Solothurn and Zurich, and at 921 francs in Fribourg. A smaller electric car in the same comparison paid much less. Geneva’s electric exemption has ended. Glarus decided on 3 May 2026 that electric cars pay from 1 January 2027, with 25 percent off until 2030. Solothurn’s parliament decided on 6 May 2026 to tax them by weight. Without a canton this check uses one illustrative tax per car class. If you pick a canton on the result, the tax line uses the February 2026 table for the nearest published car. It is not your registration.",
    source: "TCS vehicle-tax comparison, February 2026. Not this model, and not a tax assessment.",
    url: "https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/umwelt-mobilitaet/motorfahrzeugsteuer.php",
    linkName: "TCS vehicle-tax comparison, February 2026",
    as_of: "2026-10-02",
    status: "dated",
  },
  "local-grant": {
    key: "local-grant",
    title: "No commune grant is in this sum",
    body: "Switzerland pays no federal cheque for buying an electric car. Lists of cantonal purchase grants disagree. A Motoro roundup updated on 10 September 2026, using the TCS tax comparison, names Ticino as the only canton with a purchase premium: 4,000 francs for a new electric car, with conditions, until a credit of 11 million francs runs out. Other write-ups also name Basel-Stadt and Vaud. This check does not pick a winner and does not subtract any of them. Communes and local utilities sometimes add their own amount. Those programmes are small, capped, and they expire. A solar roof is a different investment: a federal one-off payment after the system is running, plus cantonal amounts, none of which is taken off the price of the car. The solar switch in this check only cheapens an illustrative share of home charging. It is not a roof. Naming a commune would be close to naming an address, and it would still not make the grant a promise.",
    source: "Motoro canton roundup, updated 10 September 2026, for the Ticino premium and the disagreement with other lists. Pronovo pays the federal solar one-off. Not this model.",
    as_of: "2026-10-02",
    status: "dated",
  },
};

export type FactView = {
  kicker: string;
  figure?: { value: string; caption: string; fill: number };
  compare?: { left: { value: string; label: string; amount: number }; right: { value: string; label: string; amount: number }; caption: string };
  lines: { label: string; text: string; more?: { label: string; text: string }[]; link?: { name: string; href: string } }[];
};

export const FACT_VIEW: Record<FactKey, FactView> = {
  "two-for-one": {
    kicker: "An idea. Not an offer.",
    lines: [
      { label: "The idea", text: "Own the car for ordinary days. Book a larger one for the days it cannot do." },
      { label: "In writing, or it is not a plan", text: "Class, price, kilometres, insurance, permission to travel, and a fallback car." },
      { label: "Who can do it", text: "A dealer pool is one example. So is car sharing, or a normal rental. A Renault agency was discussed for this project. It is not a quote." },
    ],
  },
  "mobile-charger": {
    kicker: "Not confirmed. Not in the year cost.",
    lines: [
      { label: "The idea", text: "A mobile charger on the building’s existing power line, instead of rebuilding the garage." },
      { label: "The limit", text: "It depends on that building’s connection and the other owners. Designwerk is one manufacturer, not an offer." },
      { label: "This check", text: "It stays out of the francs until there is a quote." },
    ],
  },
  battery: {
    kicker: "A dated test. Not a price in this sum.",
    figure: {
      value: "87%",
      fill: 0.87,
      caption: "Of the younger, lower-mileage cars in a TCS sample had more than 90 percent of the original battery capacity. About 130 cars, January to September 2025, at TCS centres in Zurich, Bern, Biel and Vaud. Not every used car, and not the one in an advert.",
    },
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
};
