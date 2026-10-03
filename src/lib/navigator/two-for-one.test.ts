import { test } from "node:test";
import assert from "node:assert/strict";
import { askForTwoForOne, bigDays, MAX_DAYS, PATTERNS } from "./two-for-one.ts";

test("every pattern lights exactly the number of days asked for, inside the year", () => {
  for (const p of PATTERNS) {
    for (const n of [1, 2, 4, 8, 14, 30]) {
      const set = bigDays(n, p.id);
      assert.equal(set.size, n, `${p.id} ${n}`);
      for (const d of set) assert.ok(d >= 0 && d < 365);
    }
  }
  assert.equal(bigDays(99, "spread").size, MAX_DAYS);
  assert.equal(bigDays(0, "summer").size, 1);
});

test("a summer holiday starts in July, a winter one in February", () => {
  assert.ok(bigDays(7, "summer").has(181));
  assert.ok(bigDays(7, "winter").has(31));
});

test("the ask is a request in writing: six points, no company, no price", () => {
  const t = askForTwoForOne(6, "compact");
  assert.match(t, /about 6 days/);
  assert.match(t, /a compact car/);
  assert.match(t, /not an order/);
  assert.doesNotMatch(t, /Renault|Mobility|Sixt|Hertz|CHF|\d{3,}/i);
  assert.equal((t.match(/^\d\. /gm) ?? []).length, 6);
  assert.match(askForTwoForOne(3, null), /a smaller car/);
});
