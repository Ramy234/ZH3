// What applies to this person: rules, tax and help that depend on where they live and whether they own or rent.
// Every row says what a published source says, with its date. None of it enters the francs, and nothing here is a promise.
// Links open public bodies (federal office, canton, EnergieSchweiz, TCS). No company, no offer.

import type { Result } from "./model.ts";

export type Tenure = "own" | "rent";
export const TENURES: readonly Tenure[] = ["own", "rent"];

export type RightsLink = { name: string; href: string; note: string };
export type RightsRow = {
  id: string;
  title: string;
  /** Short label for the row's state, in plain words. */
  tag: string;
  text: string;
  links: RightsLink[];
  asOf: string;
};

export const RIGHTS_LINKS = {
  tcsTax: { name: "TCS: vehicle tax by canton", href: "https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/umwelt-mobilitaet/motorfahrzeugsteuer.php", note: "Touring Club Schweiz, February 2026 comparison." },
  energiefranken: { name: "Energiefranken: programmes by postcode", href: "https://www.energiefranken.ch/de", note: "A database of federal, cantonal, communal and utility programmes. You enter the building's postcode there, not here." },
  advice: { name: "EnergieSchweiz: local energy advice by postcode", href: "https://www.energieschweiz.ch/beratung/energieberatung/", note: "Free and paid advice centres, by postcode and topic." },
  tenantGuide: { name: "Charging in a rented building, EnergieSchweiz", href: "https://www.energieschweiz.ch/ladeinfrastruktur/werkzeuge/ladeinfrastruktur-in-mietobjekten/", note: "Neutral federal guidance. It points to a separate guide for condominium owners." },
  tenantDraft: { name: "Federal Council: better access to charging at home, 19 June 2026", href: "https://www.admin.ch/de/newnsb/66VYsJf9n5dbavk-IhLan", note: "The official release of the draft. Not law." },
  sonnendach: { name: "Sonnendach.ch: is your roof suited to solar?", href: "https://www.uvek-gis.admin.ch/BFE/sonnendach/?lang=de", note: "Federal Office of Energy. Free, by address on their site, not here." },
  solarPayment: { name: "EnergieSchweiz: one-off solar payments", href: "https://www.energieschweiz.ch/wohnen/einmalverguetungen/", note: "The federal payment for a solar system, applied for through Pronovo." },
  zhCharging: { name: "Canton Zurich: support for charging in residential buildings", href: "https://www.zh.ch/de/mobilitaet/gesamtverkehrsplanung/dinamo/foerderprogramm-ladeinfrastruktur/foerderung-der-ladeinfrastruktur-in-wohngebaeuden.html", note: "Canton of Zurich. The page does not say whether the credit is still open." },
  luDeduction: { name: "Canton Luzern tax office: energy and environment deduction, FAQ", href: "https://steuern.lu.ch/-/media/Steuern/Dokumente/SteuerBulletin/2022/SteuerPraxis202210AbzugEnergieundUmweltschutzmassnahmeStGFAQaktualisiert20230406.pdf", note: "One canton's rule, as an example. Other cantons differ." },
  tcsUsed: { name: "TCS: buying a used electric car", href: "https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/elektromobilitaet/elektroauto-occasion.php", note: "Touring Club Schweiz guide." },
} as const satisfies Record<string, RightsLink>;

const ASOF = "2026-10-03";

export function rightsFor(input: { canton: string | null; tenure: Tenure | null; postcodeSet: boolean; result: Result }): RightsRow[] {
  const { canton, tenure, postcodeSet, result } = input;
  const rows: RightsRow[] = [];

  const tax = result.parts.find((p) => p.label === "Tax");
  rows.push({
    id: "tax",
    title: "Vehicle tax",
    tag: canton ? `Canton ${canton}` : "Not set",
    text: canton
      ? (tax?.how ?? "")
      : "A canton sets the tax. Pick one above and the tax line uses the TCS table for the nearest published car. Until then it is a fixed amount for the class.",
    links: [RIGHTS_LINKS.tcsTax],
    asOf: "2026-02-01",
  });

  rows.push({
    id: "grants",
    title: "Grants and support",
    tag: "Not in the francs",
    text:
      "The federal government pays nothing toward buying the car. Cantons, communes and utilities run their own programmes. Rules change and credits run out, so nothing is subtracted here." +
      (postcodeSet ? " You added a postcode here. The search below asks for it again, because it is a different site." : ""),
    links: [RIGHTS_LINKS.energiefranken, RIGHTS_LINKS.advice],
    asOf: ASOF,
  });

  if (canton === "ZH") {
    rows.push({
      id: "zh-charging",
      title: "Zurich: charging in an existing home",
      tag: "Owner applies",
      text: "The canton's page offers support per parking space to the owners of existing residential buildings, not to tenants. A tenant can show the page to the owner. The page does not say whether the credit is open now.",
      links: [RIGHTS_LINKS.zhCharging],
      asOf: ASOF,
    });
  }

  if (tenure === "rent") {
    rows.push({
      id: "tenant",
      title: "If you rent",
      tag: "A draft, not law",
      text:
        "Today a tenant changes the rented space only with the landlord's written consent (Code of Obligations, Article 260a), and charging is not yet treated as ordinary use of a bay. A federal draft would give a tenant who lives in the building the right to a basic installation. It was in consultation until 12 October 2026 and is not law. No date has been published.",
      links: [RIGHTS_LINKS.tenantDraft, RIGHTS_LINKS.tenantGuide],
      asOf: ASOF,
    });
  }

  if (tenure === "own") {
    rows.push({
      id: "owner",
      title: "If you own",
      tag: "Depends on the building",
      text:
        "In your own house you decide, within building rules. In a condominium the owners decide together, and EnergieSchweiz has a separate guide for that case. Whether the cost of a charger is deductible from tax depends on the canton: Luzern's tax office, for example, treats a fixed charger installed together with a solar system as deductible under its energy and environment deduction. Ask your own tax office.",
      links: [RIGHTS_LINKS.tenantGuide, RIGHTS_LINKS.luDeduction],
      asOf: ASOF,
    });
    rows.push({
      id: "solar",
      title: "A solar roof",
      tag: "Separate from the car",
      text:
        "The federal one-off payment covers up to 30 percent of the reference cost of a comparable system, is applied for through Pronovo and is paid after the application. It is a separate project from the car and stays out of the francs. The solar switch under What if only lowers an illustrative share of home charging.",
      links: [RIGHTS_LINKS.sonnendach, RIGHTS_LINKS.solarPayment],
      asOf: ASOF,
    });
  }

  rows.push({
    id: "commune",
    title: "Your commune",
    tag: "Local rules",
    text: "Parking rules, building permits and many grants sit with the commune. This check does not know yours. The energy-advice directory lists local centres by postcode.",
    links: [RIGHTS_LINKS.advice],
    asOf: ASOF,
  });

  return rows;
}

export type ExploreGroup = { id: string; title: string; links: RightsLink[] };

/** The bottom of the last page: where to read more, by situation. Information only. */
export function exploreMore(tenure: Tenure | null): ExploreGroup[] {
  const owner: ExploreGroup = {
    id: "own",
    title: "If you own your home",
    links: [RIGHTS_LINKS.sonnendach, RIGHTS_LINKS.solarPayment, RIGHTS_LINKS.tenantGuide],
  };
  const renter: ExploreGroup = {
    id: "rent",
    title: "If you rent",
    links: [RIGHTS_LINKS.tenantGuide, RIGHTS_LINKS.tenantDraft],
  };
  const everyone: ExploreGroup = {
    id: "all",
    title: "For everyone",
    links: [RIGHTS_LINKS.advice, RIGHTS_LINKS.energiefranken, RIGHTS_LINKS.tcsUsed],
  };
  return tenure === "own" ? [owner, everyone] : tenure === "rent" ? [renter, everyone] : [owner, renter, everyone];
}
