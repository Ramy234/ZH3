// Pictures for the idea sheets. They react to a tap on the sheet itself and calculate no francs.
import { useState } from "react";

import { askForTwoForOne, bigDays, MAX_DAYS, MIN_DAYS, PATTERNS, type Pattern } from "@/lib/navigator/two-for-one";

const DAYS = [
  { n: 2, label: "A couple of days" },
  { n: 4, label: "About 4 days" },
  { n: 8, label: "About 8 days" },
] as const;

/** A year as 365 small squares. The days the smaller car cannot do are lit. Build your own number, then ask for it in writing. */
export function YearDays() {
  const [days, setDays] = useState<number>(4);
  const [pattern, setPattern] = useState<Pattern>("spread");
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const lit = bigDays(days, pattern);
  async function copy() {
    const text = askForTwoForOne(days, null);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ text });
        setCopied("copied");
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  }
  return (
    <div className="mt-5 rounded-2xl border border-line bg-card p-4">
      <p className="text-sm font-medium">A year with a smaller car</p>
      <div
        className="mt-3 grid gap-[3px]"
        style={{ gridTemplateColumns: "repeat(26, minmax(0, 1fr))" }}
        role="img"
        aria-label={`365 days. The smaller car does ${365 - days} of them. ${days} days are booked as a larger car.`}
      >
        {Array.from({ length: 365 }, (_, i) => (
          <span key={i} className={`aspect-square rounded-[2px] ${lit.has(i) ? "bg-volt ring-1 ring-spruce" : "bg-spruce/35"}`} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="How many days a year need a bigger car">
        {DAYS.map((d) => (
          <button
            key={d.n}
            type="button"
            aria-pressed={days === d.n}
            onClick={() => setDays(d.n)}
            className={`min-h-11 rounded-full border px-3 text-sm ${days === d.n ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-sheet"}`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2" role="group" aria-label="Your own number of days">
        <button type="button" aria-label="One day fewer" onClick={() => setDays((d) => Math.max(MIN_DAYS, d - 1))} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-sheet text-lg">
          −
        </button>
        <span className="min-w-24 text-center text-sm font-medium tabular-nums">{days} days a year</span>
        <button type="button" aria-label="One day more" onClick={() => setDays((d) => Math.min(MAX_DAYS, d + 1))} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-sheet text-lg">
          +
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="When the bigger car is needed">
        {PATTERNS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={pattern === p.id}
            onClick={() => setPattern(p.id)}
            className={`min-h-11 rounded-full border px-3 text-sm ${pattern === p.id ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-sheet"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm leading-relaxed">
        <span className="font-medium">{365 - days} days</span> the smaller car does everything. <span className="font-medium">{days} days</span> a larger car is booked. No francs here: the check prices it when you switch on “One class down”.
      </p>
      <div className="mt-3 border-t border-line pt-3">
        <p className="text-sm font-medium">Ask for it in writing</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">A message with your number of days and the six things to get confirmed. It names no company and no price. Send it to a dealer, a car-sharing service or a rental firm, and compare the answers.</p>
        <button type="button" onClick={() => void copy()} className="mt-2 min-h-11 rounded-full bg-spruce px-5 text-sm font-medium text-spruce-ink">
          Copy or send the message
        </button>
        {copied !== "idle" ? (
          <p role="status" className="mt-1 text-xs text-muted">
            {copied === "copied" ? "Done. Paste it into an email or a form." : "That did not work. Select the text on the page instead."}
          </p>
        ) : null}
        <details className="mt-1 text-xs text-muted">
          <summary className="min-h-9 cursor-pointer py-2 font-medium text-spruce">Show the message</summary>
          <pre className="mt-1 whitespace-pre-wrap font-sans leading-relaxed">{askForTwoForOne(days, null)}</pre>
        </details>
      </div>
    </div>
  );
}

const AGES = [
  { id: "young", label: "Up to 5 years old" },
  { id: "old", label: "Over 5 years old" },
] as const;
const KMS = [
  { id: "low", label: "Up to 75,000 km" },
  { id: "high", label: "Over 75,000 km" },
] as const;

type Group = { headline: string; text: string; share?: number; risk: string };

// TCS, 27 November 2025, about 130 used electric cars, Aviloo readings. Numbers are as the release prints them.
const GROUPS: Record<string, Group> = {
  "young-low": {
    headline: "87 percent above 90",
    text: "Of the younger, lower-mileage cars, 87 percent had more than 90 percent of the original capacity, and none fell below 85. This was nearly two thirds of the whole sample.",
    share: 0.87,
    risk: "The risk is small. A certificate is still a good habit, and now it can bring a free warranty.",
  },
  "young-high": {
    headline: "Held up despite hard use",
    text: "Newer cars with high mileage also showed good readings in the sample, even after intensive use. The release gives no single percentage for this group.",
    risk: "Ask for the certificate. High kilometres on a young car are less worrying than they sound, but check.",
  },
  "old-low": {
    headline: "6 of 17 near 90 or higher",
    text: "Of 17 older cars with lower mileage, six were near 90 percent or higher. The readings spread more widely than in the younger group.",
    risk: "Do not price this car without a certificate. Age, not distance, is what varies here.",
  },
  "old-high": {
    headline: "Nearly half near 90 or higher",
    text: "Of the older, high-mileage cars, nearly half were near 90 percent or higher, so the other half were lower. Every battery at the end of its life in the sample was a first-generation car older than eight years.",
    risk: "Take extra care with first-generation models and cars over 200,000 km. A certificate is the minimum.",
  },
};

/** The TCS used-car battery test, sorted by the age and kilometres of the car you are looking at. */
export function BatteryAge() {
  const [age, setAge] = useState<"young" | "old">("young");
  const [km, setKm] = useState<"low" | "high">("low");
  const g = GROUPS[`${age}-${km}`]!;
  return (
    <div className="mt-5 rounded-2xl border border-line bg-card p-4">
      <p className="text-sm font-medium">The car you are looking at</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Age of the car">
        {AGES.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={age === a.id}
            onClick={() => setAge(a.id)}
            className={`min-h-11 rounded-full border px-3 text-sm ${age === a.id ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-sheet"}`}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Kilometres on the car">
        {KMS.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={km === a.id}
            onClick={() => setKm(a.id)}
            className={`min-h-11 rounded-full border px-3 text-sm ${km === a.id ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-sheet"}`}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div className="mt-4" aria-live="polite">
        <p className="font-serif text-2xl leading-tight">{g.headline}</p>
        {g.share != null ? (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
            <div className="h-full rounded-full bg-spruce" style={{ width: `${Math.round(g.share * 100)}%` }} />
          </div>
        ) : null}
        <p className="mt-2 text-sm leading-relaxed text-muted">{g.text}</p>
        <p className="mt-2 text-sm font-medium leading-relaxed">{g.risk}</p>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">A sample of about 130 cars at TCS centres, January to September 2025. Not every used car, and not the one in an advert.</p>
    </div>
  );
}
