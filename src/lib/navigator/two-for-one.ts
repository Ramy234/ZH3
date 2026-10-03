// The 2:1 sheet's own tools: which days of a year a bigger car is needed, and a message to ask for it in writing.
// No francs and no company: the message names a class and a number of days, nothing else.

export type Pattern = "spread" | "summer" | "winter";
export const PATTERNS: { id: Pattern; label: string }[] = [
  { id: "spread", label: "Spread through the year" },
  { id: "summer", label: "A summer holiday" },
  { id: "winter", label: "A winter holiday and a few weekends" },
];
export const MIN_DAYS = 1;
export const MAX_DAYS = 30;

/** Which of the 365 days (0 = 1 January) need the bigger car. Always exactly `days` of them. */
export function bigDays(days: number, pattern: Pattern): Set<number> {
  const n = Math.max(MIN_DAYS, Math.min(MAX_DAYS, Math.round(days)));
  const out = new Set<number>();
  if (pattern === "spread") {
    for (let i = 0; i < 365; i++) if (Math.floor(((i + 1) * n) / 365) > Math.floor((i * n) / 365)) out.add(i);
    return out;
  }
  // A block from the start of July (day 181), or of February (day 31): the first holiday week, the rest as single days in the weeks around.
  const start = pattern === "summer" ? 181 : 31;
  const block = Math.min(n, 7);
  for (let i = 0; i < block; i++) out.add(start + i);
  let day = start + 7 + 14;
  while (out.size < n) {
    if (!out.has(day % 365)) out.add(day % 365);
    day += pattern === "summer" ? 9 : 23;
    if (out.size < n && day > start + 2000) break;
  }
  for (let d = 0; out.size < n; d++) out.add(d % 365);
  return out;
}

/** A plain message to send to whoever might offer it. A request, not an order, and it names no company. */
export function askForTwoForOne(days: number, smallerClass: string | null): string {
  const n = Math.max(MIN_DAYS, Math.min(MAX_DAYS, Math.round(days)));
  const car = smallerClass ? `a ${smallerClass} car` : "a smaller car";
  return [
    "Hello,",
    `I am thinking of ${car} for my everyday driving, and a larger vehicle only on about ${n} days a year.`,
    "Can you offer that? If so, please confirm in writing:",
    `1. How many days a year are guaranteed, and how early I must book (also in a peak week).`,
    "2. Which class of car I would get, and whether a roof box or bike rack can be added.",
    "3. The price per day, the kilometres included and the price per extra kilometre.",
    "4. Who pays insurance, charging or fuel, and damage.",
    "5. Whether I may drive it abroad.",
    "6. What the fallback is if no car is free, and what ends the guarantee.",
    "This is a question, not an order. Thank you.",
  ].join("\n");
}
