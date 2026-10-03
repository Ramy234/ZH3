// Rules still being decided, kept apart from facts. A fact is something a source states today. A watch row is a change that
// is not law yet, with the stage it has reached and the date it should be looked at again. Nothing here enters the francs,
// and no row ever states a date of entry into force that the Federal Council has not published.

export const WATCH_STAGES = ["draft", "consultation", "parliament", "decided", "in_force"] as const;
export type WatchStage = (typeof WATCH_STAGES)[number];

export type Watch = {
  id: string;
  title: string;
  stage: WatchStage;
  /** Plain sentence. Says "not law" until the stage is in_force. */
  text: string;
  /** What a person can do now that does not depend on the outcome. */
  meanwhile: string;
  source: string;
  url: string;
  asOf: string;
  nextCheck: string;
  codes: string[];
  fact?: "tenant-right";
};

export const STAGE_LABEL: Record<WatchStage, string> = {
  draft: "A draft",
  consultation: "In consultation",
  parliament: "In parliament",
  decided: "Decided, not yet in force",
  in_force: "In force",
};

export const WATCH_SEED: Watch[] = [
  {
    id: "right-to-charge",
    title: "A tenant's right to a base charging installation",
    stage: "consultation",
    text: "The Federal Council opened a consultation on 19 June 2026, open until 12 October 2026. A person who lives in the building and whose bay comes with the home could require a supply line, a way to meter use and load management where needed. The owner would usually pass the cost into the parking rent. The work must stay reasonable. Not law. No date of entry into force has been published.",
    meanwhile: "Ask in writing for a coordinated base installation for the whole garage, not only one socket. Look for neighbours who want the same, and ask about load management.",
    source: "Federal Council, 19 June 2026 (Motion 23.3936)",
    url: "https://www.admin.ch/de/newnsb/66VYsJf9n5dbavk-IhLan",
    asOf: "2026-10-03",
    nextCheck: "2026-10-13",
    codes: ["H2.2", "H3.3"],
    fact: "tenant-right",
  },
  {
    id: "ev-levy-2030",
    title: "A federal levy on electric cars from 2030",
    stage: "consultation",
    text: "On 26 September 2025 the Federal Council put two variants forward: about 5.4 rappen a kilometre, or 22.8 rappen a kWh charged. The consultation ran until 9 January 2026. Either variant needs a change to the constitution and a popular vote. Not law, and not in the francs of this check.",
    meanwhile: "Nothing to do now. The reminder file lists it, so it is checked again when you look again.",
    source: "Federal Council, 26 September 2025",
    url: "https://www.admin.ch/de/newnsb/j3TBwKn8BYPoEGhRbvbwc",
    asOf: "2026-10-03",
    nextCheck: "2026-12-01",
    codes: ["H3.3"],
  },
];

export function watchOverdue(w: Watch, today: string): boolean {
  return w.nextCheck < today;
}
