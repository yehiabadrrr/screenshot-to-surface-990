// Real Markezly UI states for storyline A ("One transfer, followed"), captured from the running app on a phone
// viewport (390×844 CSS px at 3×). Every state is a real interaction with the app's sample data.
// One text swap before each screenshot: the sample owner "Yehia Hazem" → "Nadia Samir" (no real person's name in a
// public film). Usage (repo root app running on :5173): node scripts/capture.mjs en|ar
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const APP = process.env.APP_URL ?? "http://127.0.0.1:5173";
const lang = process.argv[2] === "ar" ? "ar" : "en";
const OUT = join(process.cwd(), "film", "assets", "cap", lang);
mkdirSync(OUT, { recursive: true });

const L = {
  en: { record: "Record payment", save: "Add to demo data", payments: "Payments", students: "Students", overview: "Overview", more: "More", teachers: "Teachers", confirm: "Confirm", instapay: "InstaPay", pending: "Pending (awaiting confirmation)", cash: "Cash" },
  ar: { record: "تسجيل دفعة", save: "إضافة إلى البيانات التجريبية", payments: "المدفوعات", students: "الطلاب", overview: "نظرة عامة", more: "المزيد", teachers: "المدرسون", confirm: "تأكيد", instapay: "إنستاباي", pending: "معلقة (بانتظار التأكيد)", cash: "كاش" },
}[lang];

// The story's real data (see SPEC.md): Youssef Naguib owes EGP 800 for Physics · Thanaweya 2 (Dr. Hesham, 40%).
const HERO = { id: "S-1095", name: "Youssef Naguib", amount: "800", ref: "IP2611784403" };
const EARLIER = [{ id: "S-1103", amount: "1200" }, { id: "S-1017", amount: "450" }];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 1600 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await ctx.addInitScript((l) => { try { localStorage.setItem("centeros-lang", l); localStorage.setItem("centeros-theme", "light"); } catch {} }, lang);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const manifest = {};

const swap = () => page.evaluate(() => {
  const swaps = [[/Yehia Hazem/g, "Nadia Samir"], [/\bYehia\b/g, "Nadia"], [/يحيى حازم/g, "نادية سمير"]];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    let v = n.nodeValue ?? "";
    for (const [re, to] of swaps) v = v.replace(re, to);
    if (v.trim() === "YH") v = v.replace("YH", "NS");
    if (v !== n.nodeValue) n.nodeValue = v;
  }
});
const box = async (loc) => {
  const r = await loc.boundingBox().catch(() => null);
  return r && { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
};
const shot = async (name, boxes = {}) => {
  await page.waitForTimeout(350);
  await swap();
  await page.screenshot({ path: join(OUT, `${name}.jpg`), type: "jpeg", quality: 95 });
  const b = {};
  for (const [k, loc] of Object.entries(boxes)) b[k] = await box(loc);
  manifest[name] = { file: `${name}.jpg`, width: 390, height: 1600, scale: 3, boxes: b };
  console.log(lang, name, Object.entries(b).filter(([, v]) => !v).map(([k]) => `MISSING ${k}`).join(" "));
};
const nav = async (label) => { await page.getByRole("link", { name: label, exact: true }).last().click(); await page.waitForTimeout(1200); };
const dialog = () => page.getByRole("dialog");
const PAYABLES = { en: "Teacher payables", ar: "مستحقات المدرسين" }[lang];
const tile = (label) => page.locator("div").filter({ has: page.getByText(label, { exact: true }) }).filter({ hasText: /EGP|ج\.م/ }).last();
const COLLECTED = { en: "Collected today", ar: "المحصّل اليوم" }[lang];
const BALANCE = { en: "Balance today", ar: "الرصيد اليوم" }[lang];
const payablesCard = () => page.locator("div").filter({ has: page.getByText(PAYABLES, { exact: true }) }).filter({ hasText: /EGP|ج\.م/ }).last();
const pick = async (comboIndex, optionName) => {
  await dialog().getByRole("combobox").nth(comboIndex).click();
  await page.waitForTimeout(250);
  await page.getByRole("option", { name: optionName, exact: true }).click();
  await page.waitForTimeout(250);
};
const openPayment = async () => { await page.getByRole("button", { name: L.record }).first().click(); await page.waitForTimeout(600); };

await page.goto(`${APP}/overview`);
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);

// Earlier in the day: two cash payments already collected.
for (const p of EARLIER) {
  await openPayment();
  await dialog().getByRole("combobox").nth(0).click();
  await page.waitForTimeout(250);
  await page.getByRole("option", { name: new RegExp(`· ${p.id}$`) }).click();
  await dialog().locator("#pay-amount").fill(p.amount);
  await dialog().getByRole("button", { name: L.save }).click();
  await page.waitForTimeout(6500);
}

// Before: the teacher's pay and the owner's dashboard.
await page.getByRole("button", { name: L.more }).click();
await page.waitForTimeout(500);
await nav(L.teachers);
const hesham = page.locator("article, li, div").filter({ hasText: "Dr. Hesham Abdelaziz" }).filter({ hasText: /40/ }).last();
await hesham.scrollIntoViewIfNeeded();
await page.evaluate(() => scrollBy(0, -80));
await shot("teacher-before", { card: hesham });
await page.evaluate(() => scrollTo(0, 0));
await nav(L.overview);
await shot("overview-before", { record: page.getByRole("button", { name: L.record }).first(), collected: tile(COLLECTED) });

// The transfer is recorded through the real form, step by step.
await openPayment();
await shot("pay-0-open", { dialog: dialog() });
await dialog().getByRole("combobox").nth(0).click();
await page.waitForTimeout(250);
await page.getByRole("option", { name: new RegExp(`· ${HERO.id}$`) }).click();
await shot("pay-1-student", { dialog: dialog(), student: dialog().getByRole("combobox").nth(0) });
await dialog().locator("#pay-amount").fill(HERO.amount);
await shot("pay-2-amount", { dialog: dialog(), amount: dialog().locator("#pay-amount") });
await pick(1, L.instapay);
await shot("pay-3-method", { dialog: dialog(), method: dialog().getByRole("combobox").nth(1) });
await dialog().locator("#pay-ref").fill(HERO.ref);
await shot("pay-4-ref", { dialog: dialog(), ref: dialog().locator("#pay-ref") });
await pick(2, L.pending);
await shot("pay-5-pending", { dialog: dialog(), status: dialog().getByRole("combobox").nth(2), save: dialog().getByRole("button", { name: L.save }) });
await dialog().evaluate((d) => { d.scrollTop = d.scrollHeight; });
await page.waitForTimeout(300);
await shot("pay-5b-save", { dialog: dialog(), status: dialog().getByRole("combobox").nth(2), save: dialog().getByRole("button", { name: L.save }) });
await dialog().getByRole("button", { name: L.save }).click();
await page.waitForTimeout(900);
await shot("pay-6-saved", { toast: page.locator("[data-sonner-toast]").first() });
await page.waitForTimeout(6000);

// The ledger: pending, then confirmed when the money arrives.
await nav(L.payments);
const row = page.locator("ul li").filter({ hasText: HERO.name }).first();
await row.scrollIntoViewIfNeeded();
await page.evaluate(() => scrollBy(0, -120));
await shot("ledger-pending", { row, confirm: row.getByRole("button", { name: L.confirm }), payables: payablesCard() });
await row.getByRole("button", { name: L.confirm }).click();
await page.waitForTimeout(900);
await shot("ledger-confirmed", { row: page.locator("ul li").filter({ hasText: HERO.name }).first(), orig: page.locator("ul li").filter({ hasText: HERO.name }).nth(1), toast: page.locator("[data-sonner-toast]").first(), payables: payablesCard() });
await page.waitForTimeout(6000);
await page.evaluate(() => scrollTo(0, 0));

// After: collected today, the student's balance, the teacher's pay.
await nav(L.overview);
await shot("overview-after", { collected: tile(COLLECTED) });
await nav(L.students);
await page.getByRole("textbox").first().fill(HERO.name);
await page.waitForTimeout(600);
await shot("students-after", { row: page.locator("ul li").filter({ hasText: HERO.name }).first() });
await page.locator("ul li").filter({ hasText: HERO.name }).first().getByRole("link").first().click();
await page.waitForTimeout(1300);
await shot("student-after", { balance: tile(BALANCE) });
await page.getByRole("button", { name: L.more }).click();
await page.waitForTimeout(500);
await nav(L.teachers);
await hesham.scrollIntoViewIfNeeded();
await page.evaluate(() => scrollBy(0, -80));
await shot("teacher-after", { card: hesham });

manifest._meta = { app: APP, lang, capturedAt: new Date().toISOString(), viewport: "390x1600@3", errors };
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("errors:", errors);
await browser.close();
