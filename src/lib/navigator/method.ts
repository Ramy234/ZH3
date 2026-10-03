// What the check leaves out on purpose, and which way each would push the answer.
// This is the "show the omitted objects" list. The model never reads it: nothing here enters the francs.
export type Left = {
  id: string;
  title: string;
  why: string;
  /** The direction the omitted thing would move the payback year, if it were counted. */
  effect: "shorter" | "longer" | "unclear";
  source?: { name: string; href: string };
};

export const LEFT_OUT: Left[] = [
  {
    id: "insurance-ceiling",
    title: "Zurich's insurance discount of up to 20 %",
    why: "A ceiling on the insurer's own page, not a typical premium. Comparis found full cover cheaper for an electric car in 70 % of cases, and dearer in the rest.",
    effect: "shorter",
    source: { name: "Comparis, 19 August 2025", href: "https://www.comparis.ch/autoversicherung/praemien/elektroauto-versicherung" },
  },
  {
    id: "grants",
    title: "Grants and subsidies",
    why: "They differ by canton and commune, change often and can run out. A check that counted them would go out of date within weeks.",
    effect: "shorter",
  },
  {
    id: "levy",
    title: "The federal levy on electric cars from 2030",
    why: "Proposed by the Federal Council on 26 September 2025 (about 5.4 rappen a kilometre or 22.8 rappen a kWh). It is a draft, not law.",
    effect: "longer",
  },
  {
    id: "winter",
    title: "A winter factor",
    why: "Cold raises an electric car's use, but no Swiss figure by class was found that is fair to apply to everyone. The range under 'How sure is this?' moves the price of electricity instead.",
    effect: "longer",
  },
  {
    id: "interest",
    title: "Interest or lease cost on the extra money",
    why: "People finance cars in very different ways. The check counts the extra money once and does not add what it could earn or cost elsewhere.",
    effect: "longer",
  },
  {
    id: "value-loss",
    title: "How fast each car loses value",
    why: "The check uses what your car would sell for today. It does not guess what either car sells for in 8 years.",
    effect: "unclear",
  },
  {
    id: "climate",
    title: "Climate, shown beside the money",
    why: "The federal study on when a switch lowers greenhouse gases is shown by distance driven, in Sources. It never enters the francs and is not a personal figure.",
    effect: "unclear",
    source: { name: "EnergieSchweiz, January 2025", href: "https://pubdb.bfe.admin.ch/de/publication/download/12158" },
  },
  {
    id: "time",
    title: "Time and convenience",
    why: "Charging stops, a trip to the garage, a rental pick-up. Worth something to you, but there is no fair franc figure to put on it.",
    effect: "unclear",
  },
];

export const STEPS: { title: string; body: string }[] = [
  { title: "You tap", body: "Six taps: what would stop you, where you park, your car, its fuel, how far you drive, and one question about your situation. Nothing is typed." },
  { title: "Numbers are looked up", body: "Prices and consumption come from a dated list of figures. Each one has a status: sourced to a named publisher, official, or a rough class figure." },
  { title: "The sum runs in your browser", body: "A year of running each car, the extra money at the start, and the year the saving catches up. Plain arithmetic, the same every time. No AI writes the verdict, the steps or a source." },
  { title: "Moving one figure at a time", body: "The result page re-runs the same sum with each main assumption pushed to a kind and a hard value, to show how far the answer could move." },
  { title: "One anonymous record", body: "When the result opens, one record of your taps and the numbers is saved, with prices rounded to bands. No name, no address, no sentence. A postcode is stored only if you choose to add one, apart from the record, and deleted after twelve months." },
];
