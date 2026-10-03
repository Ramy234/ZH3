import { BANDS, band, cleanPostcode, money } from "./bands.ts";
import { ACTION_IDS, cleanOutcomes } from "./actions.ts";
import { chargeVerdict, cleanSetup, setupDone } from "./charging.ts";
import { gapCodesFor } from "./gapcodes.ts";
import { WATCH_SEED, WATCH_STAGES, type Watch } from "./watch.ts";
import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { FACTS, type Fact, type FactKey } from "@/lib/navigator/facts";
import { DATASET, MODEL } from "@/lib/navigator/model";
import { cleanActions, cleanCohort, cleanVia } from "@/lib/navigator/telemetry";
import { SEED_VERSION, seedRows, type DatasetRow } from "@/lib/navigator/dataset";

export type OfficialHome = { homeChf: number; n: number; year: string; place: string };

const CANTON_BFS: Record<string, string> = {
  ZH: "1",
  BE: "2",
  LU: "3",
  UR: "4",
  SZ: "5",
  OW: "6",
  NW: "7",
  GL: "8",
  ZG: "9",
  FR: "10",
  SO: "11",
  BS: "12",
  BL: "13",
  SH: "14",
  AR: "15",
  AI: "16",
  SG: "17",
  GR: "18",
  AG: "19",
  TG: "20",
  TI: "21",
  VD: "22",
  VS: "23",
  NE: "24",
  GE: "25",
  JU: "26",
};

export const CANTONS: { code: string; name: string }[] = [
  { code: "ZH", name: "Zurich" },
  { code: "BE", name: "Bern" },
  { code: "LU", name: "Lucerne" },
  { code: "UR", name: "Uri" },
  { code: "SZ", name: "Schwyz" },
  { code: "OW", name: "Obwalden" },
  { code: "NW", name: "Nidwalden" },
  { code: "GL", name: "Glarus" },
  { code: "ZG", name: "Zug" },
  { code: "FR", name: "Fribourg" },
  { code: "SO", name: "Solothurn" },
  { code: "BS", name: "Basel-Stadt" },
  { code: "BL", name: "Basel-Landschaft" },
  { code: "SH", name: "Schaffhausen" },
  { code: "AR", name: "Appenzell Ausserrhoden" },
  { code: "AI", name: "Appenzell Innerrhoden" },
  { code: "SG", name: "St. Gallen" },
  { code: "GR", name: "Graubünden" },
  { code: "AG", name: "Aargau" },
  { code: "TG", name: "Thurgau" },
  { code: "TI", name: "Ticino" },
  { code: "VD", name: "Vaud" },
  { code: "VS", name: "Valais" },
  { code: "NE", name: "Neuchâtel" },
  { code: "GE", name: "Geneva" },
  { code: "JU", name: "Jura" },
];

let officialCache: { at: number; value: OfficialHome | null } | null = null;

const ELCOM_QUERY = `PREFIX elcom: <https://energy.ld.admin.ch/elcom/electricityprice/dimension/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT (AVG(?total) AS ?avg) (COUNT(?total) AS ?n) WHERE {
  GRAPH <https://lindas.admin.ch/elcom/electricityprice> {
    ?obs elcom:category <https://energy.ld.admin.ch/elcom/electricityprice/category/H4> ;
         elcom:product <https://energy.ld.admin.ch/elcom/electricityprice/product/standard> ;
         elcom:period "2026"^^xsd:gYear ;
         elcom:total ?total .
  }
}`;

export const officialHomeRate = createServerFn({ method: "GET" }).handler(async (): Promise<OfficialHome | null> => {
  const now = Date.now();
  if (officialCache && now - officialCache.at < (officialCache.value ? 12 : 0.25) * 60 * 60 * 1000) return officialCache.value;
  try {
    const res = await fetch("https://ld.admin.ch/query", {
      method: "POST",
      headers: {
        Accept: "application/sparql-results+json",
        "Content-Type": "application/sparql-query",
      },
      body: ELCOM_QUERY,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as {
      results?: { bindings?: { avg?: { value?: string }; n?: { value?: string } }[] };
    };
    const row = json.results?.bindings?.[0];
    const avg = Number(row?.avg?.value);
    const n = Number(row?.n?.value);
    if (!Number.isFinite(avg) || avg < 10 || avg > 80 || !Number.isFinite(n) || n < 100) throw new Error("range");
    const value = { homeChf: Math.round(avg) / 100, n, year: "2026", place: "Switzerland" };
    officialCache = { at: now, value };
    return value;
  } catch {
    officialCache = { at: now, value: null };
    return null;
  }
});

const cantonCache = new Map<string, { at: number; value: OfficialHome | null }>();

async function loadCantonMean(code: string): Promise<OfficialHome | null> {
  const bfs = CANTON_BFS[code];
  const name = CANTONS.find((row) => row.code === code)?.name;
  if (!bfs || !name) return null;
  const now = Date.now();
  const hit = cantonCache.get(code);
  if (hit && now - hit.at < (hit.value ? 12 : 0.25) * 60 * 60 * 1000) return hit.value;
  const query = `PREFIX elcom: <https://energy.ld.admin.ch/elcom/electricityprice/dimension/>
PREFIX schema: <http://schema.org/>
SELECT (AVG(?total) AS ?avg) (COUNT(?total) AS ?n) WHERE {
  GRAPH <https://lindas.admin.ch/elcom/electricityprice> {
    ?obs elcom:municipality ?muni ;
         elcom:category <https://energy.ld.admin.ch/elcom/electricityprice/category/H4> ;
         elcom:product <https://energy.ld.admin.ch/elcom/electricityprice/product/standard> ;
         elcom:period "2026"^^<http://www.w3.org/2001/XMLSchema#gYear> ;
         elcom:total ?total .
  }
  ?muni schema:containedInPlace <https://ld.admin.ch/canton/${bfs}> .
}`;
  try {
    const res = await fetch("https://ld.admin.ch/query", {
      method: "POST",
      headers: { Accept: "application/sparql-results+json", "Content-Type": "application/sparql-query" },
      body: query,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as {
      results?: { bindings?: { avg?: { value?: string }; n?: { value?: string } }[] };
    };
    const row = json.results?.bindings?.[0];
    const avg = Number(row?.avg?.value);
    const n = Number(row?.n?.value);
    if (!Number.isFinite(avg) || avg < 10 || avg > 80 || !Number.isFinite(n) || n < 1) throw new Error("range");
    const value = { homeChf: Math.round(avg) / 100, n, year: "2026", place: name };
    cantonCache.set(code, { at: now, value });
    return value;
  } catch {
    cantonCache.set(code, { at: now, value: null });
    return null;
  }
}

export const cantonHomeRate = createServerFn({ method: "POST" })
  .validator((code: string) => code)
  .handler(async ({ data: code }) => loadCantonMean(code));

const muniCache = new Map<string, { at: number; value: { homeChf: number; n: number } }>();

/**
 * The home electricity price of one municipality (ElCom, 2026), by its BFS number. The postcode is looked up in the browser
 * (postcodes.ts), so this server function never sees it: only a municipality number and a canton code arrive here.
 * Falls back to the canton mean, and to null if neither can be read.
 */
export const lookupMunicipality = createServerFn({ method: "POST" })
  .validator((input: { bfs: number; canton: string; place: string }) => input)
  .handler(async ({ data }): Promise<{ canton: string; place: string; homeChf: number; n: number; year: string } | null> => {
    const canton = String(data?.canton ?? "");
    if (!CANTON_BFS[canton]) return null;
    const place = String(data?.place ?? "").slice(0, 80) || CANTONS.find((item) => item.code === canton)?.name || canton;
    const bfs = Number(data?.bfs);
    const muni = Number.isInteger(bfs) && bfs > 0 && bfs < 10000 ? String(bfs) : "";
    if (!muni) {
      const mean = await loadCantonMean(canton);
      if (!mean) return { canton, place, homeChf: 0, n: 0, year: "2026" };
      return { canton, place: mean.place, homeChf: mean.homeChf, n: mean.n, year: mean.year };
    }
    const now = Date.now();
    const hit = muniCache.get(muni);
    if (hit && now - hit.at < 12 * 60 * 60 * 1000) {
      return { canton, place, homeChf: hit.value.homeChf, n: hit.value.n, year: "2026" };
    }
    const query = `PREFIX elcom: <https://energy.ld.admin.ch/elcom/electricityprice/dimension/>
SELECT (AVG(?total) AS ?avg) (COUNT(?total) AS ?n) WHERE {
  GRAPH <https://lindas.admin.ch/elcom/electricityprice> {
    ?obs elcom:municipality <https://ld.admin.ch/municipality/${muni}> ;
         elcom:category <https://energy.ld.admin.ch/elcom/electricityprice/category/H4> ;
         elcom:product <https://energy.ld.admin.ch/elcom/electricityprice/product/standard> ;
         elcom:period "2026"^^<http://www.w3.org/2001/XMLSchema#gYear> ;
         elcom:total ?total .
  }
}`;
    try {
      const res = await fetch("https://ld.admin.ch/query", {
        method: "POST",
        headers: { Accept: "application/sparql-results+json", "Content-Type": "application/sparql-query" },
        body: query,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as {
        results?: { bindings?: { avg?: { value?: string }; n?: { value?: string } }[] };
      };
      const avg = Number(json.results?.bindings?.[0]?.avg?.value);
      const n = Number(json.results?.bindings?.[0]?.n?.value);
      if (!Number.isFinite(avg) || avg < 10 || avg > 80 || !Number.isFinite(n) || n < 1) throw new Error("range");
      const value = { homeChf: Math.round(avg) / 100, n };
      muniCache.set(muni, { at: now, value });
      return { canton, place, ...value, year: "2026" };
    } catch {
      const mean = await loadCantonMean(canton);
      // The postcode did match a place on the device. If no price can be had, say the place and let the page keep its mean.
      if (!mean) return { canton, place, homeChf: 0, n: 0, year: "2026" };
      return { canton, place: mean.place, homeChf: mean.homeChf, n: mean.n, year: mean.year };
    }
  });

const KEYS = new Set<string>(Object.keys(FACTS));

export const listFacts = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<Fact>`select key, title, body, source, url, as_of, status from bev_facts`;
  const byKey = new Map(rows.filter((row) => KEYS.has(row.key)).map((row) => [row.key, row]));
  return (Object.keys(FACTS) as FactKey[]).map((key) => {
    const base = FACTS[key];
    const row = byKey.get(key);
    if (!row) return base;
    return { ...base, ...row, url: row.url || base.url || null };
  });
});

/** Rules still being decided. The table is edited by a person; the seed in watch.ts is the same two rows and the fallback. */
export const listWatch = createServerFn({ method: "GET" }).handler(async (): Promise<Watch[]> => {
  try {
    const sql = await getSql();
    const rows = await sql<{ id: string; title: string; stage: string; body: string; meanwhile: string; source: string; url: string; as_of: string; next_check: string; codes: string[] }>`
      select id, title, stage, body, meanwhile, source, url, as_of::text as as_of, next_check::text as next_check, codes from bev_watch order by id`;
    const out: Watch[] = rows
      .filter((r) => (WATCH_STAGES as readonly string[]).includes(r.stage) && r.url.startsWith("https://"))
      .map((r) => ({
        id: r.id,
        title: r.title,
        stage: r.stage as Watch["stage"],
        text: r.body,
        meanwhile: r.meanwhile,
        source: r.source,
        url: r.url,
        asOf: r.as_of.slice(0, 10),
        nextCheck: r.next_check.slice(0, 10),
        codes: r.codes ?? [],
        fact: WATCH_SEED.find((w) => w.id === r.id)?.fact,
      }));
    if (out.length > 0) return out;
  } catch {
    // table not migrated yet: the seed is the same rows
  }
  return WATCH_SEED;
});

/**
 * Deletes everything stored under one visit's random session number: the saved answers and the postcode, if one was added.
 * Nothing else can be linked to a person, so this is the whole record. Returns how many rows went.
 */
export const forgetSession = createServerFn({ method: "POST" })
  .validator((input: { clientSession: string }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean; sessions: number; places: number }> => {
    const id = String(data?.clientSession ?? "");
    if (!/^[0-9a-f-]{16,80}$/i.test(id)) return { ok: false, sessions: 0, places: 0 };
    try {
      const sql = await getSql();
      const places = await sql<{ n: number }>`with d as (delete from bev_locations where client_session = ${id} returning 1) select count(*)::int as n from d`;
      const sessions = await sql<{ n: number }>`with d as (delete from bev_sessions where client_session = ${id} returning 1) select count(*)::int as n from d`;
      return { ok: true, sessions: sessions[0]?.n ?? 0, places: places[0]?.n ?? 0 };
    } catch {
      return { ok: false, sessions: 0, places: 0 };
    }
  });

export type PublicEvent = { id: string; title: string; startsOn: string; place: string; canton: string | null; organiser: string; url: string; note: string | null };

/** Public in-person events, live and not past. Empty until a person adds rows. Reading collects nothing from the visitor. */
export const listEvents = createServerFn({ method: "GET" }).handler(async (): Promise<PublicEvent[]> => {
  try {
    const sql = await getSql();
    const rows = await sql<{ id: string; title: string; starts_on: string; ends_on: string | null; place: string; canton: string | null; organiser: string; url: string; note: string | null }>`
      select id, title, starts_on::text as starts_on, ends_on::text as ends_on, place, canton, organiser, url, note
      from bev_events
      where status = 'live' and coalesce(ends_on, starts_on) >= current_date
      order by starts_on asc limit 50`;
    return rows
      .filter((r) => r.url.startsWith("https://"))
      .map((r) => ({ id: r.id, title: r.title, startsOn: r.starts_on.slice(0, 10), place: r.place, canton: r.canton, organiser: r.organiser, url: r.url, note: r.note }));
  } catch {
    // table not migrated yet: nothing is listed
    return [];
  }
});

export type DatasetPayload = { version: string; rows: DatasetRow[]; source: "database" | "seed" };

/** Newest published dataset version. Falls back to the built-in seed if the table is missing or empty. */
export const loadDataset = createServerFn({ method: "GET" }).handler(async (): Promise<DatasetPayload> => {
  try {
    const sql = await getSql();
    const latest = await sql<{ dataset_version: string }>`select dataset_version from bev_dataset order by valid_from desc, dataset_version desc limit 1`;
    const version = latest[0]?.dataset_version;
    if (version) {
      const rows = await sql<DatasetRow>`select key, value, unit, status, publisher, published_on::text as published_on, source_url, note from bev_dataset where dataset_version = ${version}`;
      if (rows.length > 0) return { version, rows, source: "database" };
    }
  } catch {
    // table not migrated yet: the seed is the same numbers
  }
  return { version: SEED_VERSION, rows: seedRows(), source: "seed" };
});

type Stage = "mid" | "final";

export type SessionBag = {
  clientSession: string;
  stage: Stage;
  barrier: string | null;
  carClass: string | null;
  fuel: string | null;
  uses: string[];
  kmBand: string | null;
  parking: string | null;
  workAccess: string | null;
  tripFreq: string | null;
  usedStance: string | null;
  costSting: string | null;
  mobileInterest: string | null;
  worry: string | null;
  unclear: string | null;
  openedFacts: string[];
  persona: string;
  personaProbability: number;
  toggles: Record<string, boolean>;
  annualKeep: number;
  annualSwap: number;
  cash: number;
  saving: number;
  paybackYears: number | null;
  withinHorizon: boolean;
  homeOfficial?: boolean;
  canton?: string | null;
  homeGrain?: "municipality" | null;
  listPrice?: number | null;
  resalePrice?: number | null;
  keepYears?: number | null;
  mixHome?: number | null;
  mixWork?: number | null;
  mixPublic?: number | null;
  litres?: number | null;
  gearQuote?: number | null;
  rentDays?: number | null;
  /** Optional. Four digits, typed by the person. Stored apart from the session (bev_locations), never in the payload. */
  postcode?: string | null;
  /** Optional. Asked as three taps when no postcode is given. */
  settlement?: string | null;
  /** Optional. Own or rent the home. A closed value, used only to show the right rules and links. */
  tenure?: string | null;
  /** The next move shown first (an action id), and the person's taps on moves: "<id>.done" and so on. Closed lists. */
  moveShown?: string | null;
  outcomes?: string[];
  /** Optional. Three taps from the charging set-up check: main place, backup, standing time. Closed values only. */
  chargeSetup?: { main: string | null; backup: string | null; standing: string | null } | null;
  fromSample?: boolean;
  datasetVersion?: string;
  cohort?: string | null;
  actions?: string[];
  barrierVia?: string | null;
};

const ONE_OF = {
  barrier: ["charging", "cost", "trips", "trust", "unsure"],
  carClass: ["small", "compact", "mid", "suv", "van"],
  fuel: ["petrol", "diesel", "hybrid", "electric"],
  use: ["commute", "everyday", "long", "holiday", "towing", "business"],
  kmBand: ["lt10", "mid", "gt20", "unsure"],
  parking: ["house", "own", "shared", "none", "unsure"],
  workAccess: ["yes", "ask", "no"],
  tripFreq: ["rare", "yearly", "often"],
  usedStance: ["yes", "new", "no"],
  costSting: ["price", "month", "both"],
  mobileInterest: ["yes", "no"],
  worry: ["tenant", "winter", "refuse"],
  unclear: ["km", "payback", "price", "wording"],
  settlement: ["city", "town", "rural"],
  tenure: ["own", "rent"],
  canton: ["ZH", "BE", "LU", "UR", "SZ", "OW", "NW", "GL", "ZG", "FR", "SO", "BS", "BL", "SH", "AR", "AI", "SG", "GR", "AG", "TG", "TI", "VD", "VS", "NE", "GE", "JU"],
  persona: ["urbanRenter", "familyHome", "distance", "cost", "skeptic", "occasional"],
  toggle: ["home", "work", "rightSize", "used", "publicPlan", "tariff", "pv", "insDiscount"],
} as const;

function one(value: unknown, allowed: readonly string[]): string | null {
  return typeof value === "string" && allowed.includes(value) ? value : null;
}

function openedFacts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && KEYS.has(item) && !out.includes(item)) out.push(item);
    if (out.length >= 12) break;
  }
  return out;
}

export const saveSession = createServerFn({ method: "POST" })
  .validator((input: SessionBag) => input)
  .handler(async ({ data }) => {
    const clientSession = data.clientSession;
    if (!/^[0-9a-f-]{16,80}$/i.test(clientSession)) throw new Error("Bad session");
    const stage: Stage = data.stage === "mid" ? "mid" : "final";
    const postcode = cleanPostcode(data.postcode);
    const toggles: Record<string, boolean> = {};
    for (const key of ONE_OF.toggle) toggles[key] = Boolean(data.toggles?.[key]);
    const setup = cleanSetup(data.chargeSetup);
    const chargeLevel = chargeVerdict(setup, one(data.workAccess, ONE_OF.workAccess))?.level ?? null;
    const opened = openedFacts(data.openedFacts);
    const payload = {
      workflow: "bev-navigator",
      stage,
      clientSession,
      nodes: [
        { id: "barrier", n8n: "Form trigger", engine: "user", output: one(data.barrier, ONE_OF.barrier) },
        {
          id: "classify",
          n8n: "TypeSafe choice",
          engine: "rules",
          output: {
            situation: one(data.persona, ONE_OF.persona),
            confidence: Math.max(0, Math.min(1, Number(data.personaProbability) || 0)),
          },
          note: "Same option list when a TypeSafe node replaces the rules. It must not write the advice.",
        },
        {
          id: "price",
          n8n: "Code",
          engine: "browser",
          output: {
            annualKeep: band(data.annualKeep, BANDS.annual),
            annualSwap: band(data.annualSwap, BANDS.annual),
            cash: band(data.cash, BANDS.cash),
            saving: band(data.saving, BANDS.saving),
            paybackYears:
              data.paybackYears == null || !Number.isFinite(Number(data.paybackYears))
                ? null
                : Math.round(Number(data.paybackYears) / BANDS.payback) * BANDS.payback,
            // Worked out from the exact figure before it is rounded, so a rounded 8.0 never flips the ending.
            ending:
              data.paybackYears != null && Number.isFinite(Number(data.paybackYears)) && Number(data.paybackYears) <= 8
                ? "covered_within_8"
                : "keep_or_later",
            withinHorizon: Boolean(data.withinHorizon),
            dataset: typeof data.datasetVersion === "string" && /^[a-z0-9-]{1,40}$/.test(data.datasetVersion) ? data.datasetVersion : DATASET,
            model: MODEL,
            cited: ["tco-2023"],
            homeSource: data.homeGrain === "municipality"
              ? "elcom-h4-2026-municipality"
              : one(data.canton, ONE_OF.canton)
                ? `elcom-h4-2026-${one(data.canton, ONE_OF.canton)}`
                : data.homeOfficial
                  ? "elcom-h4-2026"
                  : "placeholder",
            canton: one(data.canton, ONE_OF.canton),
          },
          note: "cited is only the study that set the 8-year window. The classifier does not choose sources. The francs are the named dataset, and they are placeholders.",
        },
        { id: "solutions", n8n: "Switch", engine: "finite", output: toggles },
        { id: "analytics", n8n: "Postgres", engine: "batch", output: stage },
      ],
      claimsOpened: opened,
      // The gaps this sitting touched, in the codes of the INFRAS barrier list. Derived from closed answers only.
      gapCodes: gapCodesFor({
        barrier: one(data.barrier, ONE_OF.barrier),
        worry: one(data.worry, ONE_OF.worry),
        unclear: one(data.unclear, ONE_OF.unclear),
        costSting: one(data.costSting, ONE_OF.costSting),
        usedStance: one(data.usedStance, ONE_OF.usedStance),
        openedFacts: opened,
        chargeLevel,
      }),
      chargeSetup: setupDone(setup) ? { ...setup, level: chargeLevel } : null,
      fromSample: data.fromSample === true,
      cohort: cleanCohort(data.cohort),
      actions: cleanActions(data.actions),
      barrierVia: cleanVia(data.barrierVia),
      nextMove: { shown: typeof data.moveShown === "string" && ACTION_IDS.includes(data.moveShown) ? data.moveShown : null, outcomes: cleanOutcomes(data.outcomes) },
      // Coarse place only. The postcode itself goes to bev_locations below, not into this payload.
      location: {
        canton: one(data.canton, ONE_OF.canton),
        settlement: one(data.settlement, ONE_OF.settlement),
        tenure: one(data.tenure, ONE_OF.tenure),
        plz2: postcode ? postcode.slice(0, 2) : null,
      },
      answers: {
        barrier: one(data.barrier, ONE_OF.barrier),
        carClass: one(data.carClass, ONE_OF.carClass),
        fuel: one(data.fuel, ONE_OF.fuel),
        uses: Array.isArray(data.uses) ? data.uses.map((u) => one(u, ONE_OF.use)).filter((u): u is string => u != null) : [],
        kmBand: one(data.kmBand, ONE_OF.kmBand),
        parking: one(data.parking, ONE_OF.parking),
        workAccess: one(data.workAccess, ONE_OF.workAccess),
        tripFreq: one(data.tripFreq, ONE_OF.tripFreq),
        usedStance: one(data.usedStance, ONE_OF.usedStance),
        costSting: one(data.costSting, ONE_OF.costSting),
        mobileInterest: one(data.mobileInterest, ONE_OF.mobileInterest),
        worry: one(data.worry, ONE_OF.worry),
        unclear: one(data.unclear, ONE_OF.unclear),
        listPrice: data.listPrice == null ? null : band(data.listPrice, BANDS.price),
        resalePrice: data.resalePrice == null ? null : band(data.resalePrice, BANDS.price),
        keepYears: data.keepYears === 4 || data.keepYears === 12 || data.keepYears === 16 || data.keepYears === 24 || data.keepYears === 32 ? data.keepYears : null,
        mix:
          [data.mixHome, data.mixWork, data.mixPublic].every((n) => typeof n === "number" && n >= 0 && n <= 1)
            ? { home: data.mixHome, work: data.mixWork, public: data.mixPublic }
            : null,
        litres: typeof data.litres === "number" && data.litres >= 3 && data.litres <= 14 ? Math.round(data.litres / BANDS.litres) * BANDS.litres : null,
        gearQuote: data.gearQuote == null ? null : band(data.gearQuote, BANDS.quote),
        rentDays: data.rentDays === 0 || data.rentDays === 2 || data.rentDays === 4 || data.rentDays === 8 ? data.rentDays : null,
      },
    };
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`insert into bev_sessions (id, client_session, stage, payload) values (${id}, ${clientSession}, ${stage}, ${JSON.stringify(payload)})`;
    if (postcode) {
      // The page saves again after every change. Write the postcode once per value, not once per save.
      try {
        await sql`insert into bev_locations (client_session, postcode, canton, settlement)
          select ${clientSession}::text, ${postcode}::text, ${one(data.canton, ONE_OF.canton)}::text, ${one(data.settlement, ONE_OF.settlement)}::text
          where not exists (select 1 from bev_locations where client_session = ${clientSession}::text and postcode = ${postcode}::text)`;
      } catch {
        // table not migrated yet: the session itself is already saved
      }
    }
    // Retention, kept here so the promise on the page needs no scheduler: postcodes older than twelve months are deleted.
    try {
      await sql`delete from bev_locations where created_at < now() - interval '12 months'`;
    } catch {
      // table not migrated yet
    }
    return { id };
  });

export { BANDS, band, cleanPostcode };
export type { FactKey };
