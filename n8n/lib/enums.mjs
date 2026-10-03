// The closed lists a stored session may contain. One definition, three readers:
// the app's types in model.ts, the "TypeSafe choice" node in W1, and the tests that compare them.
export const ENUMS = {
  barrier: ["charging", "cost", "trips", "trust", "unsure"],
  carClass: ["small", "compact", "mid", "suv", "van"],
  fuel: ["petrol", "diesel", "hybrid", "electric"],
  use: ["commute", "everyday", "long", "holiday", "towing", "business"],
  kmBand: ["lt10", "mid", "gt20", "unsure"],
  parking: ["house", "own", "shared", "none", "unsure"],
  workAccess: ["yes", "ask", "no"],
  tripFreq: ["rare", "yearly", "often"],
  usedStance: ["yes", "new", "no"],
  costSting: ["price", "month", "both"],
  mobileInterest: ["yes", "no"],
  worry: ["tenant", "winter", "refuse"],
  unclear: ["km", "payback", "price", "wording"],
  persona: ["urbanRenter", "familyHome", "distance", "cost", "skeptic", "occasional"],
  via: ["tap", "words"],
  action: ["fold_why", "fold_evidence", "share", "picture", "reminder", "try_lever", "dossier", "charge_check"],
  fact: ["two-for-one", "mobile-charger", "battery", "workplace", "public-tariff", "tenant-right", "winter", "not-for-me", "canton-tax", "local-grant", "wait-or-not", "car-data"],
};
export const CANTONS = ["ZH", "BE", "LU", "UR", "SZ", "OW", "NW", "GL", "ZG", "FR", "SO", "BS", "BL", "SH", "AR", "AI", "SG", "GR", "AG", "TG", "TI", "VD", "VS", "NE", "GE", "JU"];
