// Captures genuine Markezly UI from the locally running app (bun run dev in the repo root).
// Every frame is the real interface at 2x device scale; nothing is mocked.
// Two text substitutions are applied before each screenshot (documented in README.md):
//   1. Brand: "Markazly" -> "Markezly" (approved brand spelling for the film).
//   2. Sample owner: "Yehia Hazem" -> "Nadia Samir", so no real person's name appears.
// Usage: APP_URL=http://127.0.0.1:5173 node scripts/capture.mjs
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const APP = process.env.APP_URL ?? "http://127.0.0.1:5173";
const OUT = join(process.cwd(), "public", "captures");
mkdirSync(OUT, { recursive: true });
const manifest = {};

const substitute = async (page) =>
  page.evaluate(() => {
    const swaps = [
      [/Markazly/g, "Markezly"],
      [/Yehia Hazem/g, "Nadia Samir"],
      [/\bYehia\b/g, "Nadia"],
    ];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      let v = n.nodeValue ?? "";
      for (const [re, to] of swaps) v = v.replace(re, to);
      if (v.trim() === "YH") v = v.replace("YH", "NS");
      if (v !== n.nodeValue) n.nodeValue = v;
    }
  });

// Bounding box (CSS px, page coordinates) of the card that contains an exact text label.
const boxOf = (page, label, minW = 200, minH = 80) =>
  page.evaluate(
    ([label, minW, minH]) => {
      const all = [...document.querySelectorAll("body *")].filter(
        (e) => e.childElementCount === 0 && e.textContent?.trim() === label,
      );
      for (const leaf of all) {
        let e = leaf;
        while (e && (e.offsetWidth < minW || e.offsetHeight < minH)) e = e.parentElement;
        if (!e) continue;
        const r = e.getBoundingClientRect();
        if (r.width === 0) continue;
        return { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
      }
      return null;
    },
    [label, minW, minH],
  );
const boxOfLocator = async (page, loc) => {
  const r = await loc.boundingBox();
  const s = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  return r && { x: Math.round(r.x + s.x), y: Math.round(r.y + s.y), w: Math.round(r.width), h: Math.round(r.height) };
};

// Tall pages: grow the window to the page height and let layout settle before capturing.
// (Playwright's fullPage mode resizes mid-capture, which re-renders the shell.)
const shot = async (page, name, { full = false, boxes = {} } = {}) => {
  await page.mouse.move(2, 2);
  const height = full ? await page.evaluate(() => document.documentElement.scrollHeight) : 1080;
  if (full) await page.setViewportSize({ width: 1920, height });
  await page.waitForTimeout(full ? 1200 : 250);
  await substitute(page);
  const file = `${name}.jpg`;
  await page.screenshot({ path: join(OUT, file), type: "jpeg", quality: 92 });
  if (full) { await page.setViewportSize({ width: 1920, height: 1080 }); await page.waitForTimeout(600); }
  const size = { h: height };
  manifest[name] = { file, width: 1920, height: size.h, boxes };
  console.log("captured", name, full ? `${size.h}px tall` : "", Object.keys(boxes).filter((k) => !boxes[k]).map((k) => `MISSING ${k}`).join(" "));
};

const nav = async (page, label) => {
  await page.getByRole("link", { name: label, exact: true }).first().click();
  await page.waitForTimeout(1200);
  await page.evaluate(() => scrollTo(0, 0));
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { try { localStorage.setItem("centeros-lang", "en"); localStorage.setItem("centeros-sidebar-collapsed", "false"); } catch {} });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(`${APP}/overview`);
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);

// Record three demo payments through the real form so "Collected today" reflects today's activity.
for (const [opt, amount, method] of [[3, "1200", null], [11, "850", "InstaPay"], [20, "450", null]]) {
  await page.getByRole("button", { name: "Record payment" }).first().click();
  await page.waitForTimeout(400);
  const d = page.getByRole("dialog");
  await d.getByRole("combobox").nth(0).click();
  await page.waitForTimeout(250);
  await page.getByRole("option").nth(opt).click();
  await d.locator("#pay-amount").fill(amount);
  if (method) {
    await d.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: method, exact: true }).click();
    await d.locator("#pay-ref").fill("IP4471920" + opt);
  }
  await d.getByRole("button", { name: "Add to demo data" }).click();
  await page.waitForTimeout(500);
}
await page.waitForTimeout(6000); // let toasts clear

// 1. Overview
const ovBoxes = {
  collected: await boxOf(page, "Collected today", 250, 120),
  revenue: await boxOf(page, "Period revenue", 300, 200),
  students: await boxOf(page, "Active students", 300, 200),
  attendance: await boxOf(page, "Attendance rate", 300, 200),
  outstanding: await boxOf(page, "Outstanding balances", 300, 200),
  analytics: await boxOf(page, "Revenue analytics", 700, 300),
  activity: await boxOf(page, "Recent activity", 300, 300),
  hero: await boxOf(page, "Classes today", 1200, 300),
};
await shot(page, "overview", { full: true, boxes: ovBoxes });

// 2. Finance
await nav(page, "Finance");
const finBoxes = {
  billed: await boxOf(page, "Billed revenue", 250, 150),
  gross: await boxOf(page, "Gross collections", 250, 150),
  net: await boxOf(page, "Net collections", 250, 150),
  outstanding: await boxOf(page, "Outstanding receivables", 250, 150),
  methods: await boxOf(page, "Payment methods", 300, 300),
  reconcile: await boxOf(page, "Collections reconciliation", 500, 200),
  transactions: await boxOf(page, "All methods", 1200, 400),
};
await shot(page, "finance", { full: true, boxes: finBoxes });

// 3. Students directory + live search
await nav(page, "Students");
const search = page.getByPlaceholder("Search by name, ID or phone");
await shot(page, "students", { full: false, boxes: { search: await boxOfLocator(page, search), table: await boxOf(page, "Grade", 1300, 900) } });
let typed = "";
for (const ch of "Rana") {
  typed += ch;
  await search.fill(typed);
  await page.waitForTimeout(350);
  await shot(page, `students-search-${typed.length}`, { boxes: { search: await boxOfLocator(page, search) } });
}
const firstRow = page.locator("tbody tr").first();
const rowLink = firstRow.locator("a").first();
manifest["students-search-4"].boxes.row = await boxOfLocator(page, firstRow);
manifest["students-search-4"].boxes.rowLink = await boxOfLocator(page, rowLink);

// 4. Student profile
await rowLink.click();
await page.waitForTimeout(1300);
await shot(page, "profile", {
  full: false,
  boxes: {
    header: await boxOf(page, "Balance today", 1100, 200),
    balance: await boxOf(page, "Balance today", 250, 70),
    statement: await boxOf(page, "Recent statement", 800, 250),
    guardian: await boxOf(page, "Guardian", 300, 150),
  },
});

// 5. Classes
await nav(page, "Classes");
const cards = page.locator("text=Enrolled students").locator("xpath=ancestor::*[contains(@class,'rounded')][1]");
const classBoxes = { kpis: await boxOf(page, "Classes", 1500, 100) };
for (let i = 0; i < 8; i++) classBoxes[`card${i}`] = await boxOfLocator(page, page.locator("text=Enrolled students").nth(i).locator("xpath=ancestor::*[.//button][3]"));
await shot(page, "classes", { full: true, boxes: classBoxes });

// 6. Attendance — a per-session class held today, so marking Present previews real charges.
await nav(page, "Attendance");
await page.getByRole("combobox").nth(1).click();
await page.waitForTimeout(300);
await page.getByRole("option", { name: /Physics · Prep 3/ }).click();
await page.waitForTimeout(800);
const summary = async () => ({
  counters: await boxOf(page, "Unmarked", 900, 60),
  preview: await boxOf(page, "Billing preview", 300, 300),
  bar: await boxOfLocator(page, page.getByRole("button", { name: /^Finalize/ }).first().locator("xpath=..")),
});
await shot(page, "att-0", { boxes: { ...(await summary()), rows: await boxOf(page, "Student roster", 700, 300) } });
const plan = ["Present", "Present", "Present", "Absent", "Present", "Present"];
for (let i = 0; i < plan.length; i++) {
  const btn = page.locator(`button[aria-label^="${plan[i]} · "]`).nth(i);
  const target = await boxOfLocator(page, btn);
  await btn.click();
  await page.waitForTimeout(350);
  await shot(page, `att-${i + 1}`, { boxes: { target, ...(await summary()) } });
}
const allBtn = page.getByRole("button", { name: "Mark all unmarked present" });
const allTarget = await boxOfLocator(page, allBtn);
await allBtn.click();
await page.waitForTimeout(400);
await shot(page, "att-all", { boxes: { target: allTarget, ...(await summary()) } });

manifest._meta = { app: APP, capturedAt: new Date().toISOString(), deviceScaleFactor: 2, errors };
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("errors:", errors);
await browser.close();
