// "My place" parts that are about charging and about rules still being decided. They draw what the pure modules decide
// (charging.ts, watch.ts). Nothing here calculates money, and nothing here is required to get the result.
import { Check } from "lucide-react";
import { CHARGE_MAP } from "@/lib/navigator/actions";
import { EXAMPLE_TARIFFS, chargeVerdict, costPer100, setupDone, type ChargeSetup } from "@/lib/navigator/charging";
import { STAGE_LABEL, watchOverdue, type Watch } from "@/lib/navigator/watch";
import { dateLabel } from "@/components/navigator/numbers-ui";
import type { FactKey } from "@/lib/navigator/facts";

type Opt<T extends string> = { id: T; label: string };

function Row<T extends string>({ question, hint, value, options, onPick }: { question: string; hint: string; value: T | null; options: Opt<T>[]; onPick: (v: T | null) => void }) {
  return (
    <div className="mt-4 first:mt-3">
      <p className="text-sm font-medium">{question}</p>
      <p className="mt-0.5 text-xs leading-snug text-muted">{hint}</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={question}>
        {options.map((o) => {
          const on = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(on ? null : o.id)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm ${on ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-sheet"}`}
            >
              {on ? <Check className="h-4 w-4" aria-hidden /> : null}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ChargeCheck({
  setup,
  onSetup,
  workAccess,
  parking,
  kwhPer100,
  onNext,
}: {
  setup: ChargeSetup;
  onSetup: (next: ChargeSetup) => void;
  workAccess: string | null;
  parking: string | null;
  kwhPer100: number;
  onNext: () => void;
}) {
  const verdict = chargeVerdict(setup, workAccess);
  const own = parking === "house" || parking === "own";
  const tone =
    verdict?.level === "holds" ? "border-spruce bg-moss text-moss-ink" : verdict ? "border-amber-ink/30 bg-amber text-amber-ink" : "border-line bg-sheet";
  return (
    <section id="charge-check" className="rounded-2xl border border-line bg-card p-4 lg:p-5" aria-labelledby="charge-check-title">
      <p className="text-xs font-medium tracking-widest text-muted uppercase">Optional · three taps</p>
      <h2 id="charge-check-title" className="font-serif mt-1 text-xl leading-snug">
        Would a normal week of charging work?
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {own
          ? "You said you have a place of your own, so the main one is settled. A second place is still worth a thought. This changes the next move, never the francs."
          : "Not a place on a map, a set-up you could live with: one regular place, and a second one in case the first is full. This changes the next move, never the francs."}
      </p>
      <Row
        question="A regular main place to charge?"
        hint="At work, or about ten minutes' walk from home, where the car could charge for four hours or more."
        value={setup.main}
        options={[
          { id: "yes", label: "Yes" },
          { id: "maybe", label: "Maybe" },
          { id: "no", label: "No" },
        ]}
        onPick={(main) => onSetup({ ...setup, main })}
      />
      <Row
        question="A second place, run by someone else?"
        hint="Near home or on your usual route. One public point is not a plan: it can be full or out of order."
        value={setup.backup}
        options={[
          { id: "yes", label: "Yes" },
          { id: "no", label: "No" },
        ]}
        onPick={(backup) => onSetup({ ...setup, backup })}
      />
      <Row
        question="Would you charge while the car stands anyway?"
        hint="Overnight, at work, at the shop. Not a trip made only to charge."
        value={setup.standing}
        options={[
          { id: "yes", label: "Yes" },
          { id: "no", label: "No" },
        ]}
        onPick={(standing) => onSetup({ ...setup, standing })}
      />
      {verdict ? (
        <div className={`mt-4 rounded-2xl border p-3 ${tone}`} role="status">
          <p className="font-medium">{verdict.title}</p>
          <p className="mt-1 text-sm leading-relaxed">{verdict.text}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onNext} className="inline-flex min-h-11 items-center rounded-full bg-spruce px-4 text-sm font-medium text-spruce-ink">
              See the move this suggests
            </button>
            <a
              className="inline-flex min-h-11 items-center rounded-full border border-spruce px-4 text-sm font-medium text-spruce"
              href={CHARGE_MAP}
              target="_blank"
              rel="noopener noreferrer"
            >
              EnergieSchweiz map of charging points
            </a>
          </div>
        </div>
      ) : setup.main != null || setup.backup != null || setup.standing != null ? (
        <p className="mt-3 text-sm text-muted">{setupDone(setup) ? "" : "Answer all three, or leave it. Nothing here is required."}</p>
      ) : null}
      <details className="mt-3 border-t border-line pt-1">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-spruce">What a price means per 100 km</summary>
        <p className="text-sm leading-relaxed text-muted">
          Price per kWh times the kWh your car uses per 100 km. These four prices are only to show the spread, not quotes. Your own figure is whatever the place charges, plus any parking, time or blocking fee.
        </p>
        <table className="mt-2 w-full text-sm tabular-nums">
          <caption className="sr-only">Cost per 100 km at four example prices per kWh</caption>
          <thead>
            <tr className="text-left text-xs text-muted">
              <th scope="col" className="py-1 font-medium">Price per kWh</th>
              <th scope="col" className="py-1 text-right font-medium">Per 100 km</th>
            </tr>
          </thead>
          <tbody>
            {EXAMPLE_TARIFFS.map((t) => (
              <tr key={t} className="border-t border-line">
                <td className="py-2">CHF {t.toFixed(2)}</td>
                <td className="py-2 text-right">CHF {costPer100(kwhPer100, t).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted">Uses {kwhPer100} kWh per 100 km, the class figure in this check. Not your car.</p>
      </details>
    </section>
  );
}

export function WatchList({ rows, onFact, today }: { rows: Watch[]; onFact: (fact: FactKey) => void; today: string }) {
  return (
    <section id="watch" className="rounded-2xl border border-line bg-card p-4 lg:p-5" aria-labelledby="watch-title">
      <h2 id="watch-title" className="font-medium">
        Rules still being decided
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Not law, and not in the francs. Each says how far it has got and when it is looked at again.
      </p>
      <ul className="mt-3 flex flex-col gap-3">
        {rows.map((w: Watch) => (
          <li key={w.id} className="rounded-2xl bg-sheet p-3">
            <p className="text-xs font-medium tracking-widest text-muted uppercase">{STAGE_LABEL[w.stage]}</p>
            <p className="mt-1 text-sm font-medium">{w.title}</p>
            <details className="mt-1">
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-spruce">What it says</summary>
              <p className="text-sm leading-relaxed">{w.text}</p>
              <p className="mt-2 text-sm leading-relaxed">
                <span className="font-medium">Meanwhile. </span>
                {w.meanwhile}
              </p>
              <p className="mt-2 text-xs text-muted">
                {w.source}. Checked {dateLabel(w.asOf)}. Looked at again after {dateLabel(w.nextCheck)}
                {watchOverdue(w, today) ? ". That date has passed, so check the source." : "."}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-4">
                <a className="inline-flex min-h-11 items-center text-sm font-medium text-spruce underline underline-offset-2" href={w.url} target="_blank" rel="noopener noreferrer">
                  The official page
                </a>
                {w.fact ? (
                  <button type="button" onClick={() => onFact(w.fact!)} className="min-h-11 text-sm font-medium text-spruce underline underline-offset-2">
                    What a tenant can ask for today
                  </button>
                ) : null}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
