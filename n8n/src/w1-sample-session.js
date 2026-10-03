// Sample session from the worked example, with junk added on purpose (a postcode, a sentence, a script tag).
// After a run, check the Switch output: the junk must be gone. Postgres stays unconnected until a test table exists.
return [{ json: { body: {
 "workflow": "bev-navigator",
 "cohort": "I3",
 "actions": ["share", "share", "fold_why", "<script>", "buy_now"],
 "stage": "final",
 "clientSession": "0f8e2c1a-1111-4a2b-9c3d-123456789abc",
 "nodes": [
  {
   "id": "barrier",
   "output": "charging"
  },
  {
   "id": "classify",
   "output": {
    "situation": "urbanRenter",
    "confidence": 0.62
   }
  },
  {
   "id": "price",
   "output": {
    "annualKeep": 3854,
    "annualSwap": 2081,
    "cash": 27900,
    "saving": 1773,
    "paybackYears": 15.7,
    "withinHorizon": false,
    "dataset": "placeholder-2026-10-02",
    "model": "2026-10-02-r2",
    "homeSource": "elcom-h4-2026-ZH",
    "canton": "ZH"
   }
  },
  {
   "id": "solutions",
   "output": {
    "home": true,
    "work": true,
    "rightSize": false,
    "used": false,
    "publicPlan": false,
    "tariff": false,
    "pv": false,
    "insDiscount": false
   }
  }
 ],
 "claimsOpened": [
  "battery",
  "I live at Seestrasse 4"
 ],
 "fromSample": true,
 "answers": {
  "barrier": "charging",
  "carClass": "compact",
  "fuel": "diesel",
  "uses": [
   "commute",
   "everyday",
   "<script>"
  ],
  "kmBand": "mid",
  "parking": "shared",
  "workAccess": "ask",
  "postcode": "8001",
  "note": "call me"
 }
} } }];