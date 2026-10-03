// Pictures for the idea sheets. They react to a tap on the sheet itself and calculate no francs.
import { useState } from "react";

const DAYS = [
  { n: 2, label: "A couple of days" },
  { n: 4, label: "About 4 days" },
  { n: 8, label: "About 8 days" },
] as const;

/** A year as 365 small squares. The days the smaller car cannot do are lit. */
export function YearDays() {
  const [days, setDays] = useState<number>(4);
  return (
    <div className="mt-5 rounded-2xl border border-line bg-card p-4">
      <p className="text-sm font-medium">A year with a smaller car</p>
      <div
        className="mt-3 grid gap-[3px]"
        style={{ gridTemplateColumns: "repeat(26, minmax(0, 1fr))" }}
        role="img"
        aria-label={`365 days. The smaller car does ${365 - days} of them. ${days} days are booked as a larger car.`}
      >
        {Array.from({ length: 365 }, (_, i) => {
          // the bigger-car days are spread through the year, not bunched
          const lit = Math.floor(((i + 1) * days) / 365) > Math.floor((i * days) / 365);
          return <span key={i} className={`aspect-square rounded-[2px] ${lit ? "bg-volt ring-1 ring-spruce" : "bg-spruce/35"}`} />;
        })}
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
      <p className="mt-3 text-sm leading-relaxed">
        <span className="font-medium">{365 - days} days</span> the smaller car does everything. <span className="font-medium">{days} days</span> a larger car is booked. No francs here: the check prices it when you switch on “One class down”.
      </p>
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
