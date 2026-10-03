// The new parts of the result page: the next move, the four-panel explorer, and the sliders. They draw what the pure
// modules decide (actions.ts, sensitivity.ts). Nothing here calculates money.
import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { OUTCOMES, type Outcome, type Ranked } from "@/lib/navigator/actions";
import { moveAt, paybackWord, sliderDrivers, type Sensitivity } from "@/lib/navigator/sensitivity";
import { statusWord } from "@/lib/navigator/numbers";
import { describe, type DatasetRow } from "@/lib/navigator/dataset";
import { dateLabel } from "@/components/navigator/numbers-ui";
import { chf, type Result } from "@/lib/navigator/model";
import { olderThanUsual } from "@/lib/navigator/freshness";
import { GLOSSARY } from "@/lib/navigator/glossary";

const OUTCOME_LABEL: Record<Outcome, string> = { done: "I did it", not_for_me: "Not for me", unclear: "I did not understand" };
const KIND_LABEL = { ask: "Ask", write: "Write", test: "Try", read: "Read", remind: "Remind", local: "Local", plan: "Plan" } as const;

export function NextMove({
  ranked,
  outcomes,
  onOutcome,
  onTry,
  onRemind,
  onCopy,
}: {
  ranked: Ranked[];
  outcomes: string[];
  onOutcome: (key: string) => void;
  onTry: (item: Ranked) => void;
  onRemind: () => void;
  onCopy: (text: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const handled = (id: string) => outcomes.some((o) => o === `${id}.done` || o === `${id}.not_for_me`);
  const open = ranked.filter((r) => !handled(r.action.id));
  const current = open.find((r) => r.action.id === picked) ?? open[0] ?? null;
  const others = open.filter((r) => r !== current).slice(0, 2);
  const doneCount = ranked.filter((r) => outcomes.includes(`${r.action.id}.done`)).length;

  if (!current) {
    return (
      <section id="next-move" className="rounded-2xl border border-line bg-card p-4 lg:p-5">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">Your next move</p>
        <p className="mt-2 font-medium">That is the list for now.</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">Change an answer or a figure and new moves can appear. Keeping the car is still a fair result.</p>
      </section>
    );
  }
  const a = current.action;
  const mark = (o: Outcome) => outcomes.includes(`${a.id}.${o}`);
  return (
    <section id="next-move" className="rounded-2xl border-2 border-spruce bg-card p-4 lg:p-5" aria-labelledby="next-move-title">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">Your next move</p>
        <p className="text-xs text-muted">
          {KIND_LABEL[a.kind]} · about {a.minutes} {a.minutes === 1 ? "minute" : "minutes"}
        </p>
      </div>
      <h2 id="next-move-title" className="font-serif mt-2 text-xl leading-snug">
        {a.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed">{a.text}</p>
      {a.lines ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {a.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {a.template ? (
        <div className="mt-3 rounded-2xl bg-sheet p-3">
          <p className="text-sm leading-relaxed [overflow-wrap:anywhere]">{a.template}</p>
          <button
            type="button"
            onClick={() => {
              onCopy(a.template!);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            }}
            className="mt-2 min-h-11 text-sm font-medium text-spruce underline underline-offset-2"
          >
            {copied ? "Copied" : "Copy the message"}
          </button>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {a.link ? (
          <a
            className="inline-flex min-h-11 items-center rounded-full bg-spruce px-4 text-sm font-medium text-spruce-ink"
            href={a.link.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {a.link.name}
          </a>
        ) : null}
        {a.link ? <p className="w-full text-xs text-muted">Published by {a.link.publisher}{a.link.checked ? `. Opened and read on ${dateLabel(a.link.checked)}.` : "."}</p> : null}
        {a.run === "reminder" ? (
          <button type="button" onClick={onRemind} className="inline-flex min-h-11 items-center rounded-full bg-spruce px-4 text-sm font-medium text-spruce-ink">
            Download the reminder
          </button>
        ) : null}
        {a.panel ? (
          <button type="button" onClick={() => onTry(current)} className="inline-flex min-h-11 items-center rounded-full border border-spruce px-4 text-sm font-medium text-spruce">
            {a.lever ? "Try it on the chart" : "Open it"}
          </button>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">{current.because}</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="How did that go?">
        {OUTCOMES.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={mark(o)}
            onClick={() => onOutcome(`${a.id}.${o}`)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm ${mark(o) ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-sheet"}`}
          >
            {mark(o) ? <Check className="h-4 w-4" aria-hidden /> : null}
            {OUTCOME_LABEL[o]}
          </button>
        ))}
      </div>
      {mark("unclear") ? <p className="mt-2 text-sm text-muted">Noted. Nothing here rewrites itself, so the sources are in the Sources panel below.</p> : null}
      {doneCount > 0 ? <p className="mt-2 text-xs text-muted">{doneCount} done so far. Nobody sees this but you, and it is not a score.</p> : null}
      {others.length > 0 ? (
        <details className="mt-3 border-t border-line pt-2">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-spruce">Other ways to start</summary>
          <ul className="flex flex-col gap-2">
            {others.map((o) => (
              <li key={o.action.id}>
                <button type="button" onClick={() => setPicked(o.action.id)} className="w-full rounded-2xl border border-line bg-sheet px-3 py-2 text-left">
                  <span className="block text-sm font-medium">{o.action.title}</span>
                  <span className="block text-xs text-muted">
                    {KIND_LABEL[o.action.kind]} · about {o.action.minutes} {o.action.minutes === 1 ? "minute" : "minutes"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

export type PanelDef = { id: "whatif" | "week" | "place" | "sources"; label: string };

export function ExploreTabs({ panels, value, onChange, children }: { panels: PanelDef[]; value: PanelDef["id"]; onChange: (id: PanelDef["id"]) => void; children: ReactNode }) {
  return (
    <section id="explore" className="scroll-mt-4">
      <div role="tablist" aria-label="Explore your result" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {panels.map((p) => (
          <button
            key={p.id}
            id={`tab-${p.id}`}
            role="tab"
            type="button"
            aria-selected={value === p.id}
            aria-controls={`panel-${p.id}`}
            onClick={() => onChange(p.id)}
            className={`min-h-11 rounded-full border px-3 text-sm font-medium ${value === p.id ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-card"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div id={`panel-${value}`} role="tabpanel" aria-labelledby={`tab-${value}`} className="mt-4 flex flex-col gap-4">
        {children}
      </div>
    </section>
  );
}

const DRIVER_KEY = (id: string, r: Result): string | null =>
  id === "pump" ? "pump.petrol" : id === "home" ? "rate.home" : id === "public" ? "rate.public" : id === "price" ? `spec.${r.bevClass}.${r.toggles.used ? "bevUsed" : "bevNew"}` : id === "resale" ? `spec.${r.iceClass}.resale` : null;

/** One slider per assumption. Moving it re-runs the same sum; the chart and the numbers above follow. */
export function WhatIf({
  result,
  sens,
  picks,
  onPick,
  onReset,
  scenario,
  rows,
  children,
}: {
  result: Result;
  sens: Sensitivity;
  picks: Record<string, number>;
  onPick: (id: string, v: number) => void;
  onReset: () => void;
  scenario: Result | null;
  rows: DatasetRow[];
  children: ReactNode;
}) {
  const [all, setAll] = useState(false);
  const drivers = sliderDrivers(result, sens);
  const shown = all ? drivers : drivers.slice(0, 3);
  const moved = Object.values(picks).some((v) => v !== 0);
  const sc = scenario ? { payback: scenario.paybackYears != null && scenario.saving > 40 ? scenario.paybackYears : null, saving: scenario.saving } : null;
  return (
    <section className="rounded-2xl border border-line bg-card p-4 lg:p-5">
      <h2 className="font-medium">Move a figure, watch the chart</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        These are assumptions, not quotes. Drag one and the same sum runs again. The dashed line above is your result with your change.
      </p>
      <p className="mt-3 text-sm leading-relaxed" aria-live="polite">
        {moved && sc ? (
          <>
            With your changes: <span className="font-medium">{paybackWord({ payback: sc.payback, saving: sc.saving })}</span>, saving {chf(sc.saving)} a year. Without: <span className="font-medium">{paybackWord(sens.base)}</span>, {chf(result.saving)}.
          </>
        ) : (
          <>
            All assumptions moved the kind way: <span className="font-medium">{paybackWord(sens.best)}</span>. The hard way: <span className="font-medium">{paybackWord(sens.worst)}</span>. Yours: <span className="font-medium">{paybackWord(sens.base)}</span>.
          </>
        )}
      </p>
      <ul className="m-0 mt-4 list-none space-y-5 p-0">
        {shown.map((d) => {
          const v = picks[d.id] ?? 0;
          const now = moveAt(result, d.id, v / 4).input;
          const row = (() => {
            const key = DRIVER_KEY(d.id, result);
            return key ? describe(rows, key) : undefined;
          })();
          return (
            <li key={d.id}>
              <label htmlFor={`slider-${d.id}`} className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{d.label}</span>
                <span className="text-sm tabular-nums">{now}</span>
              </label>
              <input
                id={`slider-${d.id}`}
                type="range"
                min={-4}
                max={4}
                step={1}
                value={v}
                onChange={(e) => onPick(d.id, Number(e.target.value))}
                aria-valuetext={now}
                className="mt-2 h-11 w-full accent-[var(--color-spruce)]"
              />
              <div className="flex justify-between gap-3 text-xs leading-snug text-muted">
                <span>{d.low}</span>
                <span className="text-right">{d.high}</span>
              </div>
              <p className="mt-1 text-xs leading-snug text-muted">
                {d.id === "km"
                  ? "Your tap. The bands are under 10,000, 10,000 to 20,000 and over 20,000 km a year."
                  : row
                    ? `${statusWord(row.status)}${row.publisher ? `: ${row.publisher}` : ""}${dateLabel(row.published_on) ? `, ${dateLabel(row.published_on)}` : ""}.${olderThanUsual(row.key, row.published_on) ? " Older than usual for this kind of figure." : ""}`
                    : "A rough class figure."}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-x-5">
        {drivers.length > 3 ? (
          <button type="button" aria-expanded={all} onClick={() => setAll((x) => !x)} className="min-h-11 text-sm font-medium text-spruce underline underline-offset-2">
            {all ? "Fewer assumptions" : `All ${drivers.length} assumptions`}
          </button>
        ) : null}
        {moved ? (
          <button type="button" onClick={onReset} className="min-h-11 text-sm font-medium text-spruce underline underline-offset-2">
            Back to my answers
          </button>
        ) : null}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        This is a range, not a forecast, and it carries no probability. The end points are our choice, not a measured spread. Taxes, grants and winter are not in it.
      </p>
      {children}
    </section>
  );
}


export function Glossary({ id }: { id?: string }) {
  return (
    <section id={id} className="rounded-2xl border border-line bg-card p-4" aria-labelledby={`${id ?? "glossary"}-title`}>
      <h2 id={`${id ?? "glossary"}-title`} className="font-medium">
        Words used here
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">In plain words. None of these changes a figure.</p>
      <dl className="mt-2 divide-y divide-line">
        {GLOSSARY.map((w) => (
          <div key={w.term} className="py-3">
            <dt className="text-sm font-medium">{w.term}</dt>
            <dd className="mt-0.5 text-sm leading-relaxed text-muted">{w.plain}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
