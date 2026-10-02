#!/usr/bin/env node
// Walks the whole path at 360 and 390 px and fails if any screen is wider than the phone.
// Needs the dev server: npm run dev, then node scripts/overflow-check.mjs [http://localhost:8080/]
// Set PW_CHROMIUM to a Chromium path if Playwright's own browser is not installed.
import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:8080/";
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const taps = [/Not where the car sleeps/, /My own bay/, /Compact/i, /Petrol/i, /10,000 to 20,000/, /Both/, /See the numbers/];
let failed = false;
for (const width of [360, 390]) {
  const page = await (await browser.newContext({ viewport: { width, height: 800 } })).newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  const check = async (label) => {
    const wide = await page.evaluate(() => {
      const inner = [...document.querySelectorAll("div")].filter((d) => getComputedStyle(d).overflowY === "auto" && !d.closest("[data-hscroll]")).map((d) => d.scrollWidth - d.clientWidth);
      return Math.max(document.documentElement.scrollWidth - innerWidth, ...inner);
    });
    console.log(`${width}px ${label}: ${wide <= 0 ? "ok" : `${wide}px too wide`}`);
    if (wide > 0) failed = true;
  };
  await check("start");
  for (const [i, re] of taps.entries()) {
    await page.getByRole("button", { name: re }).first().click();
    await page.waitForTimeout(450);
    await check(i === taps.length - 1 ? "result" : `after tap ${i + 1}`);
  }
  for (const name of [/Why this result/, /What went into the number/]) {
    await page.getByRole("button", { name }).click();
    await page.waitForTimeout(300);
    await check(`fold ${String(name)}`);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
