// A calendar reminder to look at the check again. A plain .ics file made in the browser.
// It holds a date and a sentence. Nothing about the person or their answers is in it.

const pad = (n: number) => String(n).padStart(2, "0");
const day = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Same day number `months` later, or the last day of that month when it does not exist (31 Aug + 6 months = 28 Feb). */
export function monthsLater(from: Date, months: number): Date {
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth() + months;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(from.getUTCDate(), last)));
}

export function revisitIcs(now: Date, months = 6, url: string | null = null): string {
  const when = monthsLater(now, months);
  const next = new Date(when.getTime() + 24 * 3600 * 1000);
  const stamp = `${day(now)}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BEV Navigator//Revisit//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:bev-navigator-revisit-${day(now)}@bev-navigator`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day(when)}`,
    `DTEND;VALUE=DATE:${day(next)}`,
    `SUMMARY:${esc("Look at the electric-car check again")}`,
    `DESCRIPTION:${esc("Prices, tax and your own plans change. Tap through the check again; it takes about a minute. This reminder holds no answers from you.")}`,
    ...(url ? [`URL:${url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
