// Pieces of the result page about where the person lives and what they can read next. All information, none of it a sale.
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { chf, labelClass, type Result } from "@/lib/navigator/model";
import { RIGHTS_LINKS, TENURES, exploreMore, type RightsLink, type RightsRow, type Tenure } from "@/lib/navigator/rights";
import type { PublicEvent } from "@/lib/navigator/session";

function LinkList({ links, compact = false }: { links: readonly RightsLink[]; compact?: boolean }) {
  return (
    <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
      {links.map((l) => (
        <li key={l.href}>
          <a href={l.href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-start gap-2 rounded-xl border border-line bg-sheet px-3 py-2">
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-spruce" aria-hidden />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-spruce underline underline-offset-2">{l.name}</span>
              {compact ? null : <span className="block text-xs leading-snug text-muted">{l.note}</span>}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Rights, tax and help that depend on the canton and on owning or renting. Not in the francs. */
export function RightsCard({ rows, tenure, onTenure }: { rows: RightsRow[]; tenure: Tenure | null; onTenure: (t: Tenure | null) => void }) {
  const LABEL: Record<Tenure, string> = { own: "I own my home", rent: "I rent" };
  return (
    <section id="rights" className="rounded-2xl border border-line bg-card p-4 lg:p-5" aria-labelledby="rights-title">
      <h2 id="rights-title" className="font-medium">
        What applies to you
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Tax, rights and help depend on where you live and whether you own or rent. This is what published sources say, with their dates. None of it is in the francs, and none of it is advice.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Do you own or rent your home?">
        {TENURES.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tenure === t}
            onClick={() => onTenure(tenure === t ? null : t)}
            className={`min-h-12 rounded-2xl border px-3 text-sm font-medium ${tenure === t ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-card"}`}
          >
            {LABEL[t]}
          </button>
        ))}
      </div>
      <ul className="m-0 mt-4 list-none divide-y divide-line p-0">
        {rows.map((r) => (
          <li key={r.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-medium">{r.title}</h3>
              <span className="shrink-0 rounded-full bg-moss px-2 py-0.5 text-xs text-moss-ink">{r.tag}</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted">{r.text}</p>
            <LinkList links={r.links} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The bottom of the last page: where to read more, by situation. */
export function MoreToExplore({ tenure }: { tenure: Tenure | null }) {
  const groups = exploreMore(tenure);
  return (
    <section id="more" className="rounded-2xl border border-line bg-card p-4" aria-labelledby="more-title">
      <h2 id="more-title" className="font-medium">
        More to explore
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {tenure ? "Public pages, for your situation." : "Public pages. Say whether you own or rent under My place, and this shows only yours."}
      </p>
      {groups.map((g) => (
        <div key={g.id} className="mt-3">
          <h3 className="text-xs font-medium tracking-widest text-muted uppercase">{g.title}</h3>
          <LinkList links={g.links} compact />
        </div>
      ))}
    </section>
  );
}

/** Public in-person events. Closed until opened, and empty until a person lists one. Reading collects nothing. */
export function InPerson({ canton, load }: { canton: string | null; load: () => Promise<PublicEvent[]> }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const shown = events.filter((e) => canton == null || e.canton == null || e.canton === canton);
  return (
    <details
      className="rounded-2xl border border-line bg-card px-4"
      onToggle={(e) => {
        if (!(e.currentTarget as HTMLDetailsElement).open || state !== "idle") return;
        setState("loading");
        load()
          .then((rows) => {
            setEvents(rows);
            setState("done");
          })
          .catch(() => setState("failed"));
      }}
    >
      <summary className="min-h-12 cursor-pointer py-3 text-sm font-medium">Meet people in person</summary>
      <div className="pb-4">
        <p className="text-sm leading-relaxed text-muted">
          Information evenings and charging days run by public bodies, associations and communes. Listing one needs no sign-in here, and visiting this list stores nothing.
        </p>
        {state === "loading" ? <p className="mt-2 text-sm text-muted">Looking…</p> : null}
        {state === "failed" ? <p className="mt-2 text-sm text-muted">The list did not load. Nothing is lost.</p> : null}
        {state === "done" && shown.length === 0 ? (
          <p className="mt-2 text-sm">{canton ? `Nothing listed yet for ${canton}.` : "Nothing listed yet."} When a public event is added, it appears here.</p>
        ) : null}
        {shown.length > 0 ? (
          <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
            {shown.map((e) => (
              <li key={e.id}>
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-line bg-sheet px-3 py-2">
                  <span className="block text-sm font-medium text-spruce underline underline-offset-2">{e.title}</span>
                  <span className="block text-xs leading-snug text-muted">
                    {e.startsOn} · {e.place}
                    {e.canton ? ` (${e.canton})` : ""} · {e.organiser}
                  </span>
                  {e.note ? <span className="mt-0.5 block text-xs leading-snug text-muted">{e.note}</span> : null}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}

/** Shown when the result is "keep": the price a used electric car would have to be at, from the same sum run backwards. */
export function UsedPriceCard({ result }: { result: Result }) {
  const u = result.usedCeiling;
  if (!u) return null;
  const never = u.saving <= 40;
  return (
    <section id="used-price" className="rounded-2xl border border-line bg-card p-4" aria-labelledby="used-price-title">
      <h2 id="used-price-title" className="font-medium">
        If you look at used electric cars: the price to watch for
      </h2>
      <p className="mt-2 text-sm leading-relaxed">
        {never
          ? `On running costs alone, nothing covers the extra price for a ${labelClass(result.bevClass).toLowerCase()}. A used one only comes out even if it costs about `
          : `For a certified used ${labelClass(result.bevClass).toLowerCase()} to cover its extra price inside ${u.window} years on these figures, it would have to cost no more than about `}
        <span className="font-semibold tabular-nums">{chf(u.chf)}</span>.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {u.reachable
          ? `The class reference for a used one is ${chf(u.classUsed)}, so a typical one fits under this line.`
          : `The class reference for a used one is ${chf(u.classUsed)}, which is above it. A typical one does not fit. A cheaper one, or a smaller class, might.`}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        How it is worked out: what your car sells for ({chf(u.resale)}), plus the yearly saving ({chf(u.saving)}) times {u.window} years, minus the charging gear and battery check ({chf(u.gear)}). A class figure, not a listing and not an offer. It uses the class consumption, not a specific car. Ask for the battery health certificate before any price talk.
      </p>
      <LinkList links={[RIGHTS_LINKS.tcsUsed]} />
    </section>
  );
}
