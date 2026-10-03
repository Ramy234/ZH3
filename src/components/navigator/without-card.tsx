// The third line of the cost chart: no car. A travel card as the ceiling for public transport, a few rented days for the rare
// trips, and the car sold once. It is shown beside Keep and Switch, never as the headline and never as advice.
import { chf, type Result } from "@/lib/navigator/model";

export function WithoutCard({ result }: { result: Result }) {
  const w = result.without;
  const last = result.series.length - 1;
  const keepTotal = result.series[last]?.keep ?? 0;
  const swapTotal = result.series[last]?.swap ?? 0;
  const withoutTotal = w.series[last] ?? 0;
  return (
    <div className="mt-2 rounded-2xl border border-line bg-sheet p-3" role="status">
      <p className="font-medium">
        Without a car: <span className="tabular-nums">{chf(w.annual)}</span> a year
      </p>
      <ul className="mt-2 space-y-1 text-sm leading-snug">
        <li>
          A travel card for all public transport: <span className="tabular-nums">{chf(w.card)}</span> a year (second class, from 13 December 2026).
        </li>
        <li>
          {w.days} rented {w.days === 1 ? "day" : "days"} for the trips a train cannot do: <span className="tabular-nums">{chf(w.rentalCost)}</span>.
        </li>
        <li>
          Selling your car brings in about <span className="tabular-nums">{chf(w.creditBack)}</span> once, so this line starts below zero.
        </li>
      </ul>
      <p className="mt-2 text-sm leading-snug tabular-nums">
        After {last} years, total cost: keep {chf(keepTotal)}, switch {chf(swapTotal)}, without a car {chf(withoutTotal)}.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        This only works if your ordinary week can be done by public transport and a few rented days. The check cannot know that. A half-fare card with single tickets can cost less if you travel little, so the travel card is the ceiling. The card price is the federal release of 4 August 2026. Not an offer and not advice.
      </p>
      <a
        className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-spruce underline underline-offset-2"
        href="https://www.wbf.admin.ch/de/newnsb/AU8_APWrkLN5RPPMOlCGk"
        target="_blank"
        rel="noopener noreferrer"
      >
        Where the travel card price comes from (federal release, 4 August 2026)
      </a>
    </div>
  );
}
