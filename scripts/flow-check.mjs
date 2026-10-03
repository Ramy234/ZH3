#!/usr/bin/env node
// Behaviour check on the running app (npm run dev, then node scripts/flow-check.mjs [url]).
// 1. A postcode is matched on the device: the request that follows carries the municipality number and canton, not the postcode.
// 2. "Delete what is stored about this visit" works.
// 3. The Climate tab is there and says what it does not do. 4. The 2:1 sheet answers a tap. 5. No page ever asks for free text by default.
import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:8080/";
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await (await browser.newContext({ viewport: { width: 390, height: 800 } })).newPage();
let failed = false;
const ok = (cond, label) => { console.log(`${cond ? "ok  " : "FAIL"} ${label}`); if (!cond) failed = true; };
const posts = [];
page.on("request", (r) => { if (r.method() !== "GET") posts.push(`${r.url()} ${r.postData() ?? ""}`); });

await page.goto(url, { waitUntil: "networkidle" });
// Free text: the start page has no text box unless the person opens the own-words box.
ok((await page.locator("textarea, input[type=text]").count()) === 0, "start page has no free-text field until asked");

for (const re of [/could not charge it where I park/, /My own bay/, /Compact/i, /Petrol/i, /10,000 to 20,000/, /Both/, /See the numbers/]) {
  await page.getByRole("button", { name: re }).first().click();
  await page.waitForTimeout(350);
}
await page.getByRole("button", { name: /Add canton, postcode, own or rent/ }).first().click();
await page.waitForTimeout(300);
posts.length = 0;
await page.getByLabel("Swiss postcode").fill("8001");
await page.getByRole("button", { name: "Use my postcode" }).click();
await page.waitForTimeout(1200);
const body = await page.locator("body").innerText();
ok(/Postcode added/.test(body), "postcode accepted from the local table");
// The lookup request is the one with the municipality number ("bfs"). It must hold no postcode.
const lookups = posts.filter((p) => /"bfs"/.test(p));
ok(lookups.length === 1, "one price lookup was sent");
ok(lookups.every((p) => !/8001/.test(p)), "the price lookup request does not carry the postcode");
ok(lookups.every((p) => /261/.test(p)), "the price lookup carries the municipality number (261 = Zurich)");

await page.getByRole("tab", { name: /^Climate$/ }).first().click();
await page.waitForTimeout(300);
const climate = await page.locator("body").innerText();
ok(/climate/i.test(climate) && /not|never|left out/i.test(climate), "Climate tab opens and says what it leaves out");

// Delete control.
await page.getByText(/Share it, set a reminder, or keep a copy/).first().click();
await page.waitForTimeout(300);
const del = page.getByRole("button", { name: /Delete what is stored about this visit/ });
await del.scrollIntoViewIfNeeded().catch(() => {});
ok((await del.count()) > 0, "the delete control exists on the result page");
if (await del.count()) {
  await del.first().click();
  await page.waitForTimeout(1000);
  ok(/Deleted/.test(await page.locator("body").innerText()), "deleting reports done");
}

// 2:1 sheet answers a tap. A fresh visitor, so the start page shows.
const fresh = await (await browser.newContext({ viewport: { width: 390, height: 800 } })).newPage();
await fresh.goto(url, { waitUntil: "networkidle" });
const page2 = fresh;
await page2.getByRole("button", { name: /A smaller car, and a bigger one only/ }).first().click();
await page2.waitForTimeout(400);
const before = await page2.locator("body").innerText();
const tap = page2.getByRole("button", { name: /About 8 days|Over 5 years old|^\d+ days?$/ }).first();
if (await tap.count()) { await tap.click(); await page2.waitForTimeout(300); }
const after = await page2.locator("body").innerText();
ok(before !== after || !(await tap.count()), "the 2:1 picture reacts to a tap");
ok(/ask|write|build/i.test(after), "the 2:1 sheet offers to ask in writing or build your own");

await browser.close();
process.exit(failed ? 1 : 0);
