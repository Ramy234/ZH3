import { test } from "node:test";
import assert from "node:assert/strict";
import { CLIMATE_KM, twoPaybacks } from "./paybacks.ts";
import { readFileSync } from "node:fs";
import { SOURCES } from "./model.ts";

test("monthly view agrees with the payback: the gain per month beats the extra per month exactly when the payback fits the window", () => {
  for (const cash of [1000, 6000, 12000, 30000]) {
    for (const saving of [200, 800, 1500, 3000]) {
      const p = twoPaybacks({ cash, saving, km: 12000, horizon: 8, alreadyElectric: false });
      const within = cash / saving <= 8;
      assert.equal(p.monthlyGain! * 1 >= p.monthlyExtra! - 1, within || Math.abs(cash / saving - 8) < 0.2, `${cash}/${saving}`);
    }
  }
});

test("no extra price, no saving, already electric: nothing is made up", () => {
  const p = twoPaybacks({ cash: 0, saving: 10, km: 12000, horizon: 8, alreadyElectric: true });
  assert.deepEqual(p, { monthlyExtra: null, monthlyGain: null, climateYears: null });
});

test("climate payback in years follows the two federal distances, and both sources exist in the app", () => {
  const p = twoPaybacks({ cash: 1, saving: 1, km: 15000, horizon: 8, alreadyElectric: false });
  assert.deepEqual(p.climateYears, [2, 3.3]);
  assert.ok(CLIMATE_KM.low < CLIMATE_KM.high);
  assert.ok(CLIMATE_KM.lowSource in SOURCES && CLIMATE_KM.highSource in SOURCES);
  assert.match(SOURCES["bfe-2020"].url, /^https:\/\/pubdb\.bfe\.admin\.ch\//);
});

test("the francs never read the climate figures: model.ts does not import this module", () => {
  const model = readFileSync(new URL("./model.ts", import.meta.url), "utf8");
  assert.doesNotMatch(model, /paybacks|CLIMATE_KM/);
});
