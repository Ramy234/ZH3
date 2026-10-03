#!/usr/bin/env node
// Walks the whole path at 360 and 390 px (phones) and 1280 px (desktop) and fails if any screen is wider than the window.
// Needs the dev server: npm run dev, then node scripts/overflow-check.mjs [http://localhost:8080/]
// Set PW_CHROMIUM to a Chromium path if Playwright's own browser is not installed.
import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:8080/";
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const taps = [/could not charge it where I park/, /My own bay/, /Compact/i, /Petrol/i, /10,000 to 20,000/, /Both/, /See the numbers/];
let failed = false;
for (const width of [360, 390, 1280]) {
  const page = await (await browser.newContext({ viewport: { width, height: width >= 1000 ? 900 : 800 } })).newPage();
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
  // The idea sheets open from the start page. Each has a picture that reacts to a tap.
  for (const [open, label] of [[/A smaller car, and a bigger one only/, "2:1"], [/A used car's battery, checked by its age/, "battery"], [/Charging in a shared garage without/, "charger"], [/Should I wait for better batteries/, "wait or not"], [/Does a connected car track me/, "car data"]]) {
    await page.getByRole("button", { name: open }).first().click();
    await page.waitForTimeout(400);
    const tap = page.getByRole("button", { name: /About 8 days|Over 5 years old/ }).first();
    if (await tap.count()) await tap.click();
    await check(`idea sheet ${label}`);
    await page.getByRole("button", { name: "Back" }).first().click();
    await page.waitForTimeout(300);
  }
  for (const [i, re] of taps.entries()) {
    await page.getByRole("button", { name: re }).first().click();
    await page.waitForTimeout(450);
    await check(i === taps.length - 1 ? "result" : `after tap ${i + 1}`);
  }
  // The cost chart can show a third line (no car). Open it and the card under it.
  await page.getByRole("button", { name: "No car", exact: true }).first().click();
  await page.waitForTimeout(400);
  await check("no-car line and card");
  // The result page has four panels, one open at a time. Walk all of them, then the sliders and the extra levers.
  for (const name of [/^My week$/, /^My place$/, /^Sources$/, /^What if$/]) {
    await page.getByRole("tab", { name }).first().click();
    await page.waitForTimeout(300);
    await check(`panel ${String(name)}`);
  }
  // The charging set-up check and the rules-being-decided list live in "My place". Answer all three taps, open a rule.
  await page.getByRole("tab", { name: /^My place$/ }).first().click();
  await page.waitForTimeout(250);
  const group = (q) => page.getByRole("group", { name: q });
  await group(/regular main place/).getByRole("button", { name: "Maybe" }).click();
  await group(/second place/).getByRole("button", { name: "No" }).click();
  await group(/while the car stands/).getByRole("button", { name: "Yes" }).click();
  await page.waitForTimeout(250);
  await check("charging check answered");
  await page.getByText(/What a price means per 100 km/).first().click();
  await page.getByText(/^What it says$/).first().click();
  await page.waitForTimeout(250);
  await check("price table and a rule open");
  await page.getByRole("tab", { name: /^What if$/ }).first().click();
  await page.waitForTimeout(250);
  const slider = page.getByRole("slider").first();
  if (await slider.count()) {
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    await check("after moving a slider");
  }
  const more = page.getByText(/Switches, what you use the car for/).first();
  if (await more.count()) {
    await more.click();
    await page.waitForTimeout(300);
    await check("more levers open");
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
