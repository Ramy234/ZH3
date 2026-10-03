// Small, dependency-free pictures for the result page. Every length is a share of an axis in years, so the ruler and
// the tornado line up. Nothing here calculates money: the numbers come from sensitivity.ts and the model's Result.
import type { Driver, Outcome } from "@/lib/navigator/sensitivity";
import { CAP_YEARS, paybackWord } from "@/lib/navigator/sensitivity";
import type { Result } from "@/lib/navigator/model";
import { chf } from "@/lib/navigator/model";

const yrs = (o: Outcome) => (o.payback == null ? CAP_YEARS : Math.min(CAP_YEARS, o.payback));

/** One shared axis, in years. Wide enough for the hard case, never past the cap. */
export function axisMax(frame: number, worst: Outcome | null): number {
  const hard = worst ? yrs(worst) + 2 : 16;
  const max = Math.min(CAP_YEARS, Math.max(16, frame + 4, Math.ceil(hard)));
  return max <= 24 ? Math.ceil(max / 4) * 4 : Math.ceil(max / 8) * 8;
}

function ticks(max: number): number[] {
  const step = max <= 24 ? 4 : 8;
  const out: number[] = [];
  for (let y = 0; y <= max; y += step) out.push(y);
  return out;
}

const pos = (y: number, max: number) => `${Math.min(100, Math.max(0, (y / max) * 100))}%`;

/** Battery-cell progress. One cell per question, the result fills the battery. */
export function BatteryProgress({ filled, total, label, tone = "light" }: { filled: number; total: number; label: string; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <div className="flex items-center" role="img" aria-label={label}>
      <ol className={`flex flex-1 gap-1 rounded-[0.4rem] border-2 p-[3px] ${dark ? "border-white/70" : "border-ink/80"}`}>
        {Array.from({ length: total }, (_, i) => (
          <li key={i} className="min-w-0 flex-1">
            <span
              className={`block h-2.5 rounded-[2px] transition-colors duration-300 ${
                i < filled ? (dark ? "bg-volt" : "bg-spruce") : dark ? "bg-white/20" : "bg-line"
              }`}
            />
          </li>
        ))}
      </ol>
      <span className={`ml-0.5 h-2.5 w-1 rounded-r-sm ${dark ? "bg-white/70" : "bg-ink/80"}`} aria-hidden />
    </div>
  );
}

/** Where the extra price is covered, with the range when the assumptions move together. */
export function PaybackRuler({
  base,
  best,
  worst,
  frame,
  tone = "light",
  scenario = null,
}: {
  base: Outcome;
  best: Outcome | null;
  worst: Outcome | null;
  frame: number;
  tone?: "light" | "dark";
  /** The case with the sliders moved. Drawn as a diamond next to the real result, never in place of it. */
  scenario?: Outcome | null;
}) {
  const max = axisMax(frame, worst);
  const dark = tone === "dark";
  const never = base.payback == null;
  const baseAt = never ? max : Math.min(max, base.payback ?? 0);
  const label =
    `Payback ruler. Most likely ${paybackWord(base)}.` +
    (best && worst ? ` Between ${paybackWord(best)} and ${paybackWord(worst)} when the assumptions move together.` : "") +
    (scenario ? ` With your changes: ${paybackWord(scenario)}.` : "") +
    ` The reference window is 8 years, from a federal study.`;
  const line = dark ? "bg-white/25" : "bg-line";
  const text = dark ? "text-white/70" : "text-muted";
  return (
    <figure className="m-0">
      <div role="img" aria-label={label} className="relative h-[4.25rem] select-none">
        {/* the 8-year study window */}
        <div className={`absolute top-6 h-3 rounded-l-full ${dark ? "bg-white/15" : "bg-moss"}`} style={{ left: 0, width: pos(8, max) }} />
        <div className={`absolute top-[1.85rem] h-1 w-full rounded-full ${line}`} />
        {best && worst ? (
          <div
            className={`absolute top-[1.55rem] h-2.5 rounded-full ${dark ? "bg-volt/40" : "bg-spruce/25"}`}
            style={{ left: pos(yrs(best), max), width: `calc(${pos(yrs(worst), max)} - ${pos(yrs(best), max)})` }}
          />
        ) : null}
        {frame !== 8 ? (
          <span className={`absolute top-4 h-7 w-px ${dark ? "bg-white/70" : "bg-ink"}`} style={{ left: pos(frame, max) }} aria-hidden />
        ) : null}
        {scenario ? (
          <span
            className={`absolute top-[1.3rem] h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-2 ${dark ? "border-white bg-volt" : "border-ink bg-volt"}`}
            style={{ left: pos(scenario.payback == null ? max : Math.min(max, scenario.payback), max) }}
            aria-hidden
          />
        ) : null}
        <span
          className={`absolute top-[1.2rem] h-[1.1rem] w-[1.1rem] -translate-x-1/2 rounded-full border-[3px] ${dark ? "border-volt bg-spruce" : "border-spruce bg-card"}`}
          style={{ left: pos(baseAt, max) }}
          aria-hidden
        />
        <div className={`absolute top-0 left-0 text-[11px] leading-none ${text}`}>
          <span className="block whitespace-nowrap">{frame === 8 ? "Reference: 8 years" : "8 yr ref."}</span>
        </div>
        {frame !== 8 ? (
          <div className={`absolute top-0 -translate-x-1/2 text-[11px] leading-none whitespace-nowrap ${text}`} style={{ left: pos(frame, max) }}>
            You keep it {frame}
          </div>
        ) : null}
        <div className="absolute top-12 left-0 w-full text-[11px] leading-none tabular-nums">
          {ticks(max).map((y) => (
            <span key={y} className={`absolute -translate-x-1/2 ${text}`} style={{ left: pos(y, max) }}>
              {y === 0 ? "Now" : y}
            </span>
          ))}
        </div>
      </div>
      <figcaption className={`mt-1 grid grid-cols-3 gap-2 text-sm leading-tight ${dark ? "text-white" : "text-ink"}`}>
        <span>
          <span className={`block text-[11px] tracking-wide uppercase ${text}`}>Fast case</span>
          {best ? paybackWord(best) : "-"}
        </span>
        <span>
          <span className={`block text-[11px] tracking-wide uppercase ${text}`}>Likely</span>
          <span className="font-semibold">{paybackWord(base)}</span>
        </span>
        <span>
          <span className={`block text-[11px] tracking-wide uppercase ${text}`}>Slow case</span>
          {worst ? paybackWord(worst) : "-"}
        </span>
      </figcaption>
    </figure>
  );
}

/** What moves the payback year most. Each bar runs from the kind end to the hard end of one assumption. */
export function Tornado({ drivers, base, frame, worst }: { drivers: Driver[]; base: Outcome; frame: number; worst: Outcome }) {
  const max = axisMax(frame, worst);
  const baseAt = base.payback == null ? max : Math.min(max, base.payback);
  return (
    <ul className="m-0 list-none space-y-4 p-0">
      {drivers.slice(0, 5).map((d) => (
        <li key={d.id}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">{d.label}</span>
            <span className="text-xs text-muted">{d.moved}</span>
          </div>
          <div
            className="relative mt-1.5 h-4"
            role="img"
            aria-label={`${d.label}: ${paybackWord(d.better)} at best, ${paybackWord(d.worse)} at worst. Most likely ${paybackWord(base)}.`}
          >
            <div className="absolute top-1.5 h-1 w-full rounded-full bg-line" />
            <div
              className="absolute top-0.5 h-3 rounded-full bg-spruce/80"
              style={{ left: pos(yrs(d.better), max), width: `max(6px, calc(${pos(yrs(d.worse), max)} - ${pos(yrs(d.better), max)}))` }}
            />
            <span className="absolute top-0 h-4 w-0.5 bg-ink" style={{ left: pos(baseAt, max) }} aria-hidden />
          </div>
          <p className="mt-1 flex justify-between gap-3 text-xs leading-snug text-muted">
            <span>
              <span className="font-medium text-ink">{paybackWord(d.better)}</span> at {d.better.input}
            </span>
            <span className="text-right">
              <span className="font-medium text-ink">{paybackWord(d.worse)}</span> at {d.worse.input}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}

/** A year of running costs, line by line, keep against switch. */
export function CostBars({ parts }: { parts: Result["parts"] }) {
  const rows = parts.filter((p) => p.keep > 0 || p.swap > 0);
  const top = Math.max(1, ...rows.flatMap((p) => [p.keep, p.swap]));
  return (
    <ul className="m-0 list-none space-y-3 p-0">
      {rows.map((p) => (
        <li key={p.label}>
          <p className="text-sm font-medium">{p.label}</p>
          {(
            [
              ["Keep", p.keep, "bg-ink/70"],
              ["Switch", p.swap, "bg-spruce"],
            ] as const
          ).map(([name, value, color]) => (
            <div key={name} className="mt-1 flex items-center gap-2">
              <span className="w-12 shrink-0 text-xs text-muted">{name}</span>
              <span className="h-2.5 min-w-0 flex-1">
                <span className={`block h-2.5 rounded-full ${color}`} style={{ width: `${Math.max(1, (value / top) * 100)}%` }} />
              </span>
              <span className="w-[4.5rem] shrink-0 text-right text-xs tabular-nums">{chf(value)}</span>
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}
