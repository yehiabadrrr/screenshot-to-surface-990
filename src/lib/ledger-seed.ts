import { students, staff, classById } from "./data";
import type { LedgerEntry, Method } from "./ledger";

/** Demo ledger, Jun 2026 → 17 Nov 2026. Deterministic so every screen agrees. */
export const SEED_END = "2026-11-17";
const MONTHS = ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"];

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pickW = <T,>(xs: [T, number][]): T => {
  let r = rnd() * xs.reduce((s, x) => s + x[1], 0);
  for (const [v, w] of xs) { if ((r -= w) <= 0) return v; }
  return xs[0]![0];
};
const methodPick = () => pickW<Method>([["Cash", 52], ["InstaPay", 26], ["Fawry", 10], ["Bank transfer", 8], ["Other", 4]]);
const clerk = () => pickW([[staff.frontDesk, 70], [staff.accountant, 20], [staff.owner, 10]]);
const d2 = (n: number) => String(n).padStart(2, "0");
const ref = (m: Method) => (m === "InstaPay" ? `IP${Math.floor(rnd() * 1e9)}` : m === "Fawry" ? `FW${Math.floor(rnd() * 1e8)}` : m === "Bank transfer" ? `BT-${Math.floor(rnd() * 1e6)}` : rnd() < 0.6 ? `R-${Math.floor(1000 + rnd() * 9000)}` : undefined);

function build(): LedgerEntry[] {
  type Draft = Omit<LedgerEntry, "id">;
  const out: Draft[] = [];
  const at = (date: string) => `${date}T${d2(10 + Math.floor(rnd() * 10))}:${d2(Math.floor(rnd() * 60))}:00Z`;

  for (const s of students) {
    if (s.status === "Inactive") continue;
    const profile = pickW([["onTime", 68], ["late", 15], ["prepay", 8], ["stopped", 6], ["sibling", 3]]);
    const sibling = profile === "sibling" || rnd() < 0.04;
    MONTHS.forEach((ym, mi) => {
      if (`${ym}-28` < s.joined) return;
      if (s.status === "Paused" && ym === "2026-11") return;
      for (const cid of s.classIds) {
        const c = classById(cid);
        const date = `${ym}-01`;
        out.push({ type: "Charge", studentId: s.id, classId: cid, branch: c.branch, date, amount: c.fee, status: "Completed", enteredBy: "System", enteredAt: `${date}T06:00:00Z`, note: `Tuition ${ym}` });
        let due = c.fee;
        if (sibling) {
          const disc = Math.round((c.fee * 0.1) / 10) * 10;
          due -= disc;
          out.push({ type: "Discount", studentId: s.id, classId: cid, branch: c.branch, date, amount: disc, status: "Completed", enteredBy: staff.owner, enteredAt: at(date), reason: "Sibling discount 10%" });
        }
        const day = 1 + Math.floor(rnd() * (profile === "late" ? 26 : 16));
        const pdate = `${ym}-${d2(day)}`;
        if (pdate > SEED_END) continue;
        let amount = due;
        if (profile === "late") amount = rnd() < 0.5 ? Math.round((due * (0.5 + rnd() * 0.3)) / 50) * 50 : due;
        if (profile === "stopped" && mi >= 4) continue;
        if (profile === "prepay" && mi === MONTHS.findIndex((m) => `${m}-28` >= s.joined)) amount = due * 2;
        const method = methodPick();
        out.push({ type: "Payment", studentId: s.id, classId: cid, branch: c.branch, date: pdate, amount, method, status: "Completed", reference: ref(method), enteredBy: clerk(), enteredAt: at(pdate) });
      }
    });
  }

  // Pending: recent transfers awaiting confirmation (excluded from collections).
  const active = students.filter((s) => s.status === "Active");
  for (let i = 0; i < 9; i++) {
    const s = active[Math.floor(rnd() * active.length)]!;
    const c = classById(s.classIds[0]!);
    const date = `2026-11-${d2(13 + Math.floor(rnd() * 5))}`;
    const method = rnd() < 0.6 ? "Bank transfer" : "Fawry";
    out.push({ type: "Payment", studentId: s.id, classId: c.id, branch: c.branch, date, amount: c.fee, method, status: "Pending", reference: ref(method), note: "Awaiting bank confirmation", enteredBy: staff.frontDesk, enteredAt: at(date) });
  }
  // Refunds: withdrawals.
  for (let i = 0; i < 7; i++) {
    const s = active[Math.floor(rnd() * active.length)]!;
    const c = classById(s.classIds[0]!);
    const ym = MONTHS[1 + Math.floor(rnd() * 5)]!;
    const date = `${ym}-${d2(5 + Math.floor(rnd() * 12))}`;
    out.push({ type: "Refund", studentId: s.id, classId: c.id, branch: c.branch, date, amount: Math.round((c.fee * 0.5) / 50) * 50, method: rnd() < 0.7 ? "Cash" : "InstaPay", status: "Completed", reason: "Withdrew mid-month", enteredBy: staff.accountant, enteredAt: at(date) });
  }

  out.sort((a, b) => a.enteredAt.localeCompare(b.enteredAt));
  let tx = 41000, inv = 52000;
  const entries: LedgerEntry[] = out.map((e) => ({ ...e, id: e.type === "Charge" ? `INV-${inv++}` : `TX-${tx++}` }));

  // Reversals: bounced transfers and a duplicate entry, recorded after the original.
  const reversible = entries.filter((e) => e.type === "Payment" && e.status === "Completed" && e.date >= "2026-10-01" && e.date <= "2026-11-14");
  const reasons = ["Bank transfer bounced", "Entered twice by mistake", "Fawry payment cancelled by customer", "Entered under the wrong student"];
  for (let i = 0; i < 5; i++) {
    const pool = i < 2 ? reversible.filter((e) => e.date >= "2026-11-01") : reversible;
    const o = pool[Math.floor(rnd() * pool.length)]!;
    if (entries.some((e) => e.reversesId === o.id)) continue;
    const day = Math.min(Number(o.date.slice(8)) + 2, 17);
    const date = `${o.date.slice(0, 8)}${d2(day)}`;
    entries.push({ id: `TX-${tx++}`, type: "Reversal", studentId: o.studentId, classId: o.classId, branch: o.branch, date, amount: o.amount, method: o.method, status: "Completed", reversesId: o.id, reason: reasons[i % reasons.length], enteredBy: staff.accountant, enteredAt: at(date) });
  }
  return entries;
}

export const seedLedger: LedgerEntry[] = build();
export { MONTHS as LEDGER_MONTHS };
