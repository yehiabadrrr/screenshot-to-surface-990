// Real Markezly UI states for the POV reel, captured from the running app at 2x.
// Same honesty rules as marketing/launch-video: real interactions, sample data, and two text swaps
// applied just before each screenshot: "Markazly" -> "Markezly" (approved brand spelling) and the
// sample owner "Yehia Hazem" -> "Nadia Samir" (no real person's name in a public film).
// Usage (project root): APP_URL=http://127.0.0.1:5173 node scripts/capture-ui.mjs
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, copyFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const APP = process.env.APP_URL ?? "http://127.0.0.1:5173";
const OUT = join(process.cwd(), "assets", "cap");
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
const boxOf = (page, label, minW = 200, minH = 60) => page.evaluate(([label, minW, minH]) => {
  const leaves = [...document.querySelectorAll("body *")].filter((e) => e.childElementCount === 0 && e.textContent?.trim() === label);
  for (const leaf of leaves) {
    let e = leaf;
    while (e && (e.offsetWidth < minW || e.offsetHeight < minH)) e = e.parentElement;
    if (!e) continue;
    const r = e.getBoundingClientRect();
    if (r.width) return { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  }
  return null;
}, [label, minW, minH]);
const boxLoc = async (page, loc) => {
  const r = await loc.boundingBox();
  const s = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  return r && { x: Math.round(r.x + s.x), y: Math.round(r.y + s.y), w: Math.round(r.width), h: Math.round(r.height) };
};
const shot = async (page, name, boxes = {}) => {
  await page.mouse.move(2, 2);
  await page.waitForTimeout(300);
  await substitute(page);
  await page.screenshot({ path: join(OUT, `${name}.jpg`), type: "jpeg", quality: 92 });
  manifest[name] = { file: `${name}.jpg`, width: 1920, height: 1080, boxes };
  console.log("captured", name, Object.entries(boxes).filter(([, v]) => !v).map(([k]) => `MISSING ${k}`).join(" "));
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

// 1. Record an InstaPay transfer with its reference, through the real form.
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
await shot(page, "pay-dialog", {
  dialog: await boxLoc(page, d),
  method: await boxLoc(page, d.getByRole("combobox").nth(1)),
  ref: await boxLoc(page, d.locator("#pay-ref")),
  amount: await boxLoc(page, d.locator("#pay-amount")),
  save: await boxLoc(page, d.getByRole("button", { name: "Add to demo data" })),
});
await d.getByRole("button", { name: "Add to demo data" }).click();
await page.waitForTimeout(6500);

// 2. The ledger row it created, on Finance.
await page.getByRole("link", { name: "Finance", exact: true }).first().click();
await page.waitForTimeout(1300);
const row = page.locator("tbody tr").first();
await row.scrollIntoViewIfNeeded();
await page.evaluate(() => scrollBy(0, 120));
await page.waitForTimeout(500);
const vbox = async (loc) => { const r = await loc.boundingBox(); return r && { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
await shot(page, "fin-row", { row: await vbox(row) });
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(500);
await shot(page, "fin-top", { payables: await boxOf(page, "Teacher payables", 220, 100), gross: await boxOf(page, "Gross collections", 250, 150) });

// 3. Who owes: one tap on the Owing filter.
await page.getByRole("link", { name: "Students", exact: true }).first().click();
await page.waitForTimeout(1300);
const chip = page.locator("button", { hasText: "Owing" }).first();
const chipBox = await boxLoc(page, chip);
await shot(page, "students-all", { chip: chipBox });
await chip.click();
await page.waitForTimeout(700);
await shot(page, "students-owing", { chip: chipBox, table: await boxOf(page, "Grade", 1300, 600) });

// 4. Teacher pay models.
await page.getByRole("link", { name: "Teachers", exact: true }).first().click();
await page.waitForTimeout(1300);
await shot(page, "teachers", {
  card0: await boxOf(page, "Dr. Hesham Abdelaziz", 400, 280),
  card1: await boxOf(page, "Mona El-Sherif", 400, 280),
  share0: await boxOf(page, "40% of collected tuition", 380, 50),
});

// 5. Reuse the verified attendance states from the launch film.
const LF = join(process.cwd(), "..", "..", "launch-video", "public", "captures");
const lfm = JSON.parse(readFileSync(join(LF, "manifest.json"), "utf8"));
for (const n of ["att-0", "att-1", "att-2", "att-3", "att-4", "att-5", "att-6", "att-all", "overview"]) {
  copyFileSync(join(LF, lfm[n].file), join(OUT, lfm[n].file));
  manifest[n] = lfm[n];
}

manifest._meta = { app: APP, capturedAt: new Date().toISOString(), deviceScaleFactor: 2, errors };
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("errors:", errors);
await browser.close();
