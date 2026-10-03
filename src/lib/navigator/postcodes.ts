// Postcode to canton and municipality, looked up in the browser. The postcode never leaves the device for this step.
// The table is built by scripts/gen-postcodes.mjs from swisstopo's official directory of localities.
export type LocalPlace = { canton: string; bfs: number; place: string; others: number };
type Table = { meta: { newestValidity: string; downloaded: string; postcodes: number }; plz: Record<string, [string, number, string, number?]> };

let table: Promise<Table> | null = null;
const load = () => (table ??= import("./postcodes.json").then((m) => (m.default ?? m) as unknown as Table));

export const POSTCODE_SOURCE = {
  publisher: "Federal Office of Topography swisstopo",
  title: "Official directory of localities (AMTOVZ)",
  url: "https://opendata.swiss/en/dataset/amtliches-ortschaftenverzeichnis-mit-postleitzahl-und-perimeter",
  credit: "©swisstopo",
};

/** Null for anything that is not a Swiss postcode in the table (including Liechtenstein). */
export async function localPostcode(input: string): Promise<LocalPlace | null> {
  const plz = String(input ?? "").trim();
  if (!/^[1-9]\d{3}$/.test(plz)) return null;
  const hit = (await load()).plz[plz];
  return hit ? { canton: hit[0], bfs: hit[1], place: hit[2], others: hit[3] ?? 0 } : null;
}

export async function postcodeTableInfo() {
  const { meta } = await load();
  return meta;
}
