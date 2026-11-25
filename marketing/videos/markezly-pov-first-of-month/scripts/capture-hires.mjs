// 4x-density crops of the proof regions, so camera punch-ins stay sharp at phone size.
// Same real flows as capture-ui.mjs (and the launch film's attendance flow), same text swaps.
// Each crop is laid over its 2x capture at the same CSS-px rect: cap4/manifest.json { name: { file, base, clip } }.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const APP = process.env.APP_URL ?? "http://127.0.0.1:5173";
const OUT = join(process.cwd(), "assets", "cap4");
mkdirSync(OUT, { recursive: true });
const manifest = {};

const substitute = (page) => page.evaluate(() => {
  const swaps = [[/Markazly/g, "Markezly"], [/Yehia Hazem/g, "Nadia Samir"], [/\bYehia\b/g, "Nadia"]];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    let v = n.nodeValue ?? "";
    for (const [re, to] of swaps) v = v.replace(re, to);
    if (v.trim() === "YH") v = v.replace("YH", "NS");
    if (v !== n.nodeValue) n.nodeValue = v;
  }
});
const crop = async (page, name, base, clip) => {
  await page.mouse.move(2, 2);
  await page.waitForTimeout(250);
  await substitute(page);
  await page.screenshot({ path: join(OUT, `${name}.jpg`), type: "jpeg", quality: 93, clip: { x: clip.x, y: clip.y, width: clip.w, height: clip.h } });
  manifest[name] = { file: `${name}.jpg`, base, clip };
  console.log("crop", name, JSON.stringify(clip));
};
const vbox = async (loc) => { const r = await loc.boundingBox(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 4 });
await ctx.addInitScript(() => { try { localStorage.setItem("centeros-lang", "en"); localStorage.setItem("centeros-sidebar-collapsed", "false"); } catch {} });
const page = await ctx.newPage();
await page.goto(`${APP}/overview`);
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);

// payment form (identical inputs to capture-ui.mjs)
await page.getByRole("button", { name: "Record payment" }).first().click();
await page.waitForTimeout(500);
const d = page.getByRole("dialog");
await d.getByRole("combobox").nth(0).click();
await page.waitForTimeout(300);
await page.getByRole("option").nth(11).click();
await d.locator("#pay-amount").fill("850");
await d.getByRole("combobox").nth(1).click();
await page.getByRole("option", { name: "InstaPay", exact: true }).click();
await d.locator("#pay-ref").fill("IP447192011");
await page.waitForTimeout(300);
await crop(page, "pay-dialog", "pay-dialog", await vbox(d));
await d.getByRole("button", { name: "Add to demo data" }).click();
await page.waitForTimeout(6500);

// the ledger row (same scroll as capture-ui.mjs)
await page.getByRole("link", { name: "Finance", exact: true }).first().click();
await page.waitForTimeout(1300);
const row = page.locator("tbody tr").first();
await row.scrollIntoViewIfNeeded();
await page.evaluate(() => scrollBy(0, 120));
await page.waitForTimeout(500);
const rb = await vbox(row);
await crop(page, "fin-row", "fin-row", { x: rb.x, y: rb.y - 40, w: rb.w, h: rb.h + 80 });
await page.evaluate(() => scrollTo(0, 0));

// students: Owing chip, then the balance column
await page.getByRole("link", { name: "Students", exact: true }).first().click();
await page.waitForTimeout(1300);
const chip = page.locator("button", { hasText: "Owing" }).first();
await crop(page, "students-all", "students-all", { x: 369, y: 170, w: 620, h: 64 });
await chip.click();
await page.waitForTimeout(700);
await crop(page, "students-owing", "students-owing", { x: 369, y: 170, w: 620, h: 64 });
await crop(page, "students-owing-bal", "students-owing", { x: 1340, y: 340, w: 440, h: 560 });

// teachers: the first card's pay model
await page.getByRole("link", { name: "Teachers", exact: true }).first().click();
await page.waitForTimeout(1300);
await crop(page, "teachers", "teachers", { x: 369, y: 365, w: 465, h: 302 });

// attendance: Physics · Prep 3, Present ×3, Absent, Present ×2, then Mark all (the launch film's att-all state)
await page.getByRole("link", { name: "Attendance", exact: true }).first().click();
await page.waitForTimeout(1200);
await page.getByRole("combobox").nth(1).click();
await page.waitForTimeout(300);
await page.getByRole("option", { name: /Physics · Prep 3/ }).click();
await page.waitForTimeout(800);
const plan = ["Present", "Present", "Present", "Absent", "Present", "Present"];
for (let i = 0; i < plan.length; i++) { await page.locator(`button[aria-label^="${plan[i]} · "]`).nth(i).click(); await page.waitForTimeout(200); }
await page.getByRole("button", { name: "Mark all unmarked present" }).click();
await page.waitForTimeout(500);
await crop(page, "att-all", "att-all", { x: 1456, y: 338, w: 352, h: 380 });
const tile = await page.evaluate(() => {
  const l = [...document.querySelectorAll("*")].find((e) => e.childElementCount === 0 && e.textContent.trim() === "Charges on finalize");
  const r = l.parentElement.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
});
manifest._tile17 = tile;
console.log("tile 17 box", JSON.stringify(tile));

writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
await browser.close();
