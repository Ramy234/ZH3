import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { loadDataset } from "@/lib/navigator/session";
import { seedRows, type DatasetRow } from "@/lib/navigator/dataset";
import { DATASET, SOURCES } from "@/lib/navigator/model";
import { LEFT_OUT, STEPS } from "@/lib/navigator/method";
import { Glossary } from "@/components/navigator/result-parts";
import { DatasetLine, dateLabel } from "@/components/navigator/numbers-ui";
import type { SheetLine } from "@/lib/navigator/numbers";

export const Route = createFileRoute("/method")({
  head: () => ({
    meta: [
      { title: "How the check works · BEV Navigator" },
      { name: "description", content: "Every figure the BEV Navigator uses, with its source and date, and what it leaves out on purpose. Switzerland only." },
    ],
  }),
  component: Method,
});

const CLASS_NAME: Record<string, string> = { small: "Small city car", compact: "Compact", mid: "Mid-size", suv: "SUV", van: "Van or large" };
const FIELD: Record<string, string> = {
  iceL: "Fuel use (litres per 100 km), petrol",
  iceIns: "Insurance, petrol or diesel car",
  iceTax: "Road tax, petrol or diesel car",
  iceMaint: "Service, petrol or diesel car",
  resale: "What the current car sells for",
  bevNew: "Electric car, new",
  bevUsed: "Electric car, used",
  kwh: "Electric use (kWh per 100 km)",
  battery: "Usable battery (kWh), only for the week strip",
  bevIns: "Insurance, electric car",
  bevTax: "Road tax, electric car",
  bevMaint: "Service, electric car",
};
const NAME: Record<string, string> = {
  "rate.home": "Electricity at home",
  "rate.homeSpecial": "Electricity at home, off-peak tariff",
  "rate.work": "Charging at work",
  "rate.public": "Charging on the road",
  "rate.publicPlan": "Charging on the road, with a plan",
  "rate.pv": "Own solar power",
  "rate.pvShare": "Share of home charging from solar",
  "rate.rentalDay": "One rental day",
  "rate.wallbox": "Wallbox and installation",
  "rate.sharedInstall": "Share of a shared-garage installation",
  "rate.batteryCheck": "Battery check, used car",
  "rate.horizon": "Years in the picture",
  "pump.petrol": "Petrol, per litre",
  "pump.diesel": "Diesel, per litre",
  "pump.hybrid": "Hybrid (reads the petrol price)",
};
const UNIT: Record<string, string> = { "CHF/litre": "francs a litre", "CHF/kWh": "francs a kWh", "CHF/year": "francs a year", "CHF/day": "francs a day", CHF: "francs", "l/100km": "l/100 km", "kWh/100km": "kWh/100 km", years: "years", share: "share" };

function toLine(r: DatasetRow): SheetLine {
  const [g, a, b] = r.key.split(".");
  const label = g === "spec" ? `${CLASS_NAME[a!] ?? a}: ${FIELD[b!] ?? b}` : (NAME[r.key] ?? r.key);
  const v = r.unit === "CHF" || r.unit === "CHF/year" ? `CHF ${Math.round(r.value).toLocaleString("de-CH")}` : `${r.value} ${UNIT[r.unit] ?? r.unit}`;
  return { key: r.key, label, value: v, status: r.status, publisher: r.publisher, published_on: r.published_on, source_url: r.source_url, note: r.note };
}

const EFFECT = { shorter: "Would shorten the payback", longer: "Would lengthen the payback", unclear: "Could go either way" } as const;

function Method() {
  const fetchRows = useServerFn(loadDataset);
  const [data, setData] = useState<{ version: string; rows: DatasetRow[]; source: string }>({ version: DATASET, rows: seedRows(), source: "seed" });
  useEffect(() => {
    void fetchRows().then((d) => setData({ version: d.version, rows: d.rows as DatasetRow[], source: d.source })).catch(() => undefined);
  }, []);
  const energy = data.rows.filter((r) => r.key.startsWith("rate.") || r.key.startsWith("pump."));
  const specs = data.rows.filter((r) => r.key.startsWith("spec."));
  const firm = data.rows.filter((r) => r.status !== "placeholder").length;
  const classes = Object.keys(CLASS_NAME);
  const newest = data.rows.map((r) => r.published_on).filter(Boolean).sort().at(-1) ?? null;

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="border-b border-line bg-sheet">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-5 lg:px-8">
          <Link to="/" className="flex min-h-11 items-center gap-2 text-sm font-medium text-spruce">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to the check
          </Link>
          <p className="text-sm text-muted">Switzerland only</p>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-8 lg:px-8 lg:py-12">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">BEV Navigator</p>
        <h1 className="font-serif mt-2 text-4xl leading-tight lg:text-5xl">How the check works</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed">
          Would an electric car already work for an ordinary week? This page shows every figure behind the answer, where it comes from, how old it is, and what the check leaves out on purpose. Keeping your car is a fair result.
        </p>

        <section className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="Summary">
          <div className="rounded-2xl bg-spruce p-4 text-spruce-ink">
            <p className="text-xs tracking-widest text-spruce-ink/70 uppercase">Figures version</p>
            <p className="font-serif mt-1 text-xl">{data.version}</p>
            <p className="mt-1 text-xs text-spruce-ink/70">{data.source === "database" ? "Read live from the dataset" : "Built-in copy"}</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="text-xs tracking-widest text-muted uppercase">With a named source</p>
            <p className="font-serif mt-1 text-xl tabular-nums">
              {firm} of {data.rows.length}
            </p>
            <p className="mt-1 text-xs text-muted">The rest are rough class figures, labelled as such.</p>
          </div>
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="text-xs tracking-widest text-muted uppercase">Newest source date</p>
            <p className="font-serif mt-1 text-xl">{dateLabel(newest) ?? "-"}</p>
            <p className="mt-1 text-xs text-muted">Pump prices are the average of this year's TCS entries.</p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl">The five steps</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-line bg-card p-4">
                <p className="text-xs font-medium tracking-widest text-muted uppercase">Step {i + 1}</p>
                <p className="mt-1 font-medium">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            The payback year is the extra money at the start divided by how much less a year costs. If the saving is CHF 40 a year or less, there is no payback year. The federal cost study behind the eight-year window:{" "}
            <a className="font-medium text-spruce underline" href={SOURCES["tco-2023"].url} target="_blank" rel="noopener noreferrer">
              {SOURCES["tco-2023"].publisher}, {SOURCES["tco-2023"].published}
            </a>
            .
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl">Fuel and electricity</h2>
          <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-card px-4">
            {energy.map((r) => (
              <DatasetLine key={r.key} row={toLine(r)} />
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl">Cars, by class</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">Class figures are rough: one number for a whole class, never a quote and never a particular model.</p>
          <div className="mt-3 flex flex-col gap-3">
            {classes.map((c) => (
              <details key={c} className="rounded-2xl border border-line bg-card px-4">
                <summary className="flex min-h-12 cursor-pointer items-center font-medium">{CLASS_NAME[c]}</summary>
                <ul className="divide-y divide-line pb-2">
                  {specs
                    .filter((r) => r.key.startsWith(`spec.${c}.`))
                    .map((r) => (
                      <DatasetLine key={r.key} row={toLine(r)} />
                    ))}
                </ul>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl">Left out on purpose</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">None of these enter the francs. Each says which way it would push the answer, so that leaving it out is a choice you can see.</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {LEFT_OUT.map((l) => (
              <li key={l.id} className="rounded-2xl border border-line bg-card p-4">
                <p className="font-medium">{l.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{l.why}</p>
                <p className="mt-2 text-xs font-medium">{EFFECT[l.effect]}</p>
                {l.source ? (
                  <a className="mt-1 inline-block text-xs font-medium text-spruce underline" href={l.source.href} target="_blank" rel="noopener noreferrer">
                    {l.source.name}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-2xl">What is kept when you use it</h2>
          <div className="mt-3 max-w-2xl rounded-2xl border border-line bg-card p-4 text-sm leading-relaxed">
            <p>
              Everything you tap stays in your browser until the result. Then one record is saved: your closed answers, banded money values, and a random session number. That number is pseudonymous, not anonymous: it lets a later visit of yours be linked to an earlier one, nothing more. No name, no address, no free text.
            </p>
            <p className="mt-3">
              An optional postcode is kept apart from the answers, deleted after 12 months, and shown outside the team only for groups of at least 10 people.
            </p>
            <p className="mt-3">
              What stood in the way is counted in the seven groups of the Zurich study on barriers to charging at home and at work (INFRAS for the Canton of Zurich, 1 July 2026). A few answers add a code from that list, and only a group of at least 10 is ever reported. The counts show where information is missing, never who you are.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <Glossary id="method-glossary" />
        </section>

        <p className="mt-12 max-w-2xl text-xs leading-relaxed text-muted">
          Indicative only. Not financial, insurance, tax or purchase advice. For Swiss drivers and Swiss prices. Where a figure is a rough class figure, the result page shows how far the answer moves if it is off.
        </p>
      </main>
    </div>
  );
}
