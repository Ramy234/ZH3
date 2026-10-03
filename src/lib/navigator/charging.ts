// The charging set-up check. Three optional taps about where a car without its own plug would really charge. It returns
// one plain sentence and the next thing to do. It never touches the francs, and a set-up that rests on fast charging alone
// is never shown as fine. Pure, so the same rules can be tested.

export const CHARGE_MAIN = ["yes", "maybe", "no"] as const;
export const CHARGE_BACKUP = ["yes", "no"] as const;
export const CHARGE_STANDING = ["yes", "no"] as const;

export type ChargeSetup = {
  main: (typeof CHARGE_MAIN)[number] | null;
  backup: (typeof CHARGE_BACKUP)[number] | null;
  standing: (typeof CHARGE_STANDING)[number] | null;
};

export const NO_SETUP: ChargeSetup = { main: null, backup: null, standing: null };

export type ChargeLevel = "holds" | "backup" | "test" | "timing" | "missing";

export type ChargeVerdict = {
  level: ChargeLevel;
  title: string;
  text: string;
  /** An action id from the catalogue, the move that fits this level. */
  next: string;
};

function pick<T extends string>(value: unknown, list: readonly T[]): T | null {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : null;
}

export function cleanSetup(value: unknown): ChargeSetup {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return { main: pick(v.main, CHARGE_MAIN), backup: pick(v.backup, CHARGE_BACKUP), standing: pick(v.standing, CHARGE_STANDING) };
}

export function setupDone(s: ChargeSetup): boolean {
  return s.main != null && s.backup != null && s.standing != null;
}

/**
 * Order matters: a missing main option comes first, then an untested one, then charging time that would cost extra trips,
 * then a missing backup. Only a main option, a backup and time that is spent anyway count as a set-up that holds.
 * `workAccess` only picks which question to ask first when the main option is missing.
 */
export function chargeVerdict(s: ChargeSetup, workAccess: string | null): ChargeVerdict | null {
  if (!setupDone(s)) return null;
  if (s.main === "no") {
    return {
      level: "missing",
      title: "No regular main place to charge yet",
      text: "Fast charging alone can work, but it is usually the costly and tiring way to run an electric car. The most useful first step is a written question to the place that could give you a regular one.",
      next: workAccess === "no" ? "ask-building" : "ask-employer",
    };
  }
  if (s.main === "maybe") {
    return {
      level: "test",
      title: "A maybe becomes a yes by testing it",
      text: "Look at the place at the hours you would really use it, for one week. Free at the time, allowed to park, a card or app that works, and the real price.",
      next: "test-charging-week",
    };
  }
  if (s.standing === "no") {
    return {
      level: "timing",
      title: "Charging would cost you extra trips",
      text: "A set-up works best when the car charges while it stands anyway: at work, overnight, at the shop. If you would drive somewhere only to charge, the week gets longer, not easier.",
      next: "test-charging-week",
    };
  }
  if (s.backup === "no") {
    return {
      level: "backup",
      title: "Good main place. Add a second one",
      text: "One public point next to home is not a plan. It can be full, broken or fenced off for roadworks. A second place with a different operator, within a short walk or on your route, is what makes it dependable.",
      next: "test-charging-week",
    };
  }
  return {
    level: "holds",
    title: "This set-up holds for an ordinary week",
    text: "A regular main place, a second one, and charging time you spend anyway. Test each at your own hours before you rely on it. This does not change the francs in your check.",
    next: "test-charging-week",
  };
}

/** Francs per 100 km at a tariff, plus fees that come with one charging stop. Arithmetic only; the tariff is whatever the person finds. */
export function costPer100(kwhPer100: number, tariff: number, feePerCharge = 0, kwhPerCharge = 20): number {
  if (!(kwhPer100 > 0) || !(tariff >= 0)) return 0;
  const fees = kwhPerCharge > 0 ? (kwhPer100 / kwhPerCharge) * feePerCharge : 0;
  return Math.round((kwhPer100 * tariff + fees) * 100) / 100;
}

/** Tariffs to show next to each other. Illustration of what a price means per 100 km, not a quote. */
export const EXAMPLE_TARIFFS = [0.35, 0.5, 0.7, 0.85] as const;
