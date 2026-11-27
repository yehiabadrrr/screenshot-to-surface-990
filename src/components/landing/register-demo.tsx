import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Lang } from "@/lib/i18n";
import { LANDING_COPY, SAMPLE_NAMES } from "./copy";

/**
 * The landing page's peak: the visitor's scroll is the clock of a Wednesday class.
 * Students arrive and the register ticks itself; each tick posts a line under that student's
 * own billing rule. A guardian's payment lands at 6:25 and the teacher's 40% share follows
 * collections. Tapping a name appends a charge or a reversal, never an edit.
 *
 * State is a pure function of (clock, taps) replayed in time order, so scrolling back shows
 * the ledger as it stood at that time. Self-contained sample data: it never touches the
 * app's ledger store.
 */

type Rule = "session" | "package" | "monthly";
const STUDENTS: { rule: Rule; at: number | null; left?: number }[] = [
  { rule: "session", at: -2 },
  { rule: "session", at: 1 },
  { rule: "package", at: 3, left: 3 },
  { rule: "monthly", at: 6 },
  { rule: "session", at: 9 },
  { rule: "session", at: 41 },
  { rule: "session", at: null },
];
const FEE = 80;
const SHARE = 0.4;
const PKG_SIZE = 8;
const PAY = { at: 25, s: 1, amount: 320, ref: "48201" };
const START = -5;
const END = 90;

const L = {
  ar: {
    rule: (r: Rule, left: number) =>
      r === "session" ? "بالحصة" : r === "monthly" ? "شهري" : `باكدج · فاضل ${left}`,
    present: "حاضر",
    absent: "غايب",
    waiting: "لسه",
    charge: "رسوم حصة",
    pkg: (left: number) => `حصة من الباكدج · فاضل ${left} من ${PKG_SIZE}`,
    mon: "حضور · ضمن الاشتراك الشهري",
    pay: (r: string) => `دفعة · إنستاباي · رقم ${r} · والدة ملك`,
    rev: (id: string) => `إلغاء ${id} · اتسجّل بالغلط`,
    end: (names: string) => `إقفال الحصة · غياب: ${names} · مش متحاسب`,
    empty: "لسه مفيش قيود. الحصة بتبدأ 6:00.",
    lines: (n: number) => `${n} قيد · ولا قيد اتعدّل`,
    before: "قبل الحصة",
    during: "الحصة شغالة",
    after: "الحصة خلصت",
    ap: (h: number) => (h < 12 ? "ص" : "م"),
    cur: (v: number) => `${v.toLocaleString("en-US")} ج.م`,
    join: "، ",
  },
  en: {
    rule: (r: Rule, left: number) =>
      r === "session" ? "Per session" : r === "monthly" ? "Monthly" : `Package · ${left} left`,
    present: "Present",
    absent: "Absent",
    waiting: "Not yet",
    charge: "Session charge",
    pkg: (left: number) => `Package session · ${left} of ${PKG_SIZE} left`,
    mon: "Attendance · covered by the monthly fee",
    pay: (r: string) => `Payment · InstaPay · ref ${r} · Malak's mother`,
    rev: (id: string) => `Reversal of ${id} · marked by mistake`,
    end: (names: string) => `Class closed · absent: ${names} · not billed`,
    empty: "Nothing posted yet. Class starts at 6:00.",
    lines: (n: number) => `${n} ${n === 1 ? "entry" : "entries"} · none edited`,
    before: "Before class",
    during: "Class in progress",
    after: "Class over",
    ap: (h: number) => (h < 12 ? "AM" : "PM"),
    cur: (v: number) => `EGP ${v.toLocaleString("en-US")}`,
    join: ", ",
  },
} as const;

interface Tap {
  t: number;
  s: number;
  seq: number;
}
type Line =
  | { id: string; kind: "charge" | "pkg" | "mon"; s: number; amt: number; left?: number }
  | { id: string; kind: "pay"; s: number; amt: number }
  | { id: string; kind: "rev"; s: number; amt: number; of: string }
  | { id: string; kind: "end"; abs: number[]; amt: 0 };

function replay(now: number, taps: Tap[]) {
  type Ev = { t: number; k: "arrive" | "pay" | "end" | "tap"; s?: number; o: number };
  const ev: Ev[] = [];
  STUDENTS.forEach((s, i) => {
    if (s.at != null) ev.push({ t: s.at, k: "arrive", s: i, o: 0 });
  });
  ev.push({ t: PAY.at, k: "pay", o: 1 }, { t: END, k: "end", o: 2 });
  taps.forEach((tp) => ev.push({ t: tp.t, k: "tap", s: tp.s, o: 3 + tp.seq }));
  const due = ev.filter((e) => e.t <= now).sort((a, b) => a.t - b.t || a.o - b.o);

  const st = STUDENTS.map((s) => ({
    present: false,
    touched: false,
    left: s.left ?? 0,
    last: null as Line | null,
  }));
  const lines: Line[] = [];
  const n = { INV: 2041, PKG: 1, ATT: 1, PAY: 193, REV: 2101 };
  const code = (p: keyof typeof n) =>
    `${p}-${p === "PAY" ? String(n[p]++).padStart(4, "0") : n[p]++}`;
  let billed = 0;
  let collected = 0;
  let closed = false;

  const markPresent = (i: number) => {
    const x = st[i]!;
    const rule = STUDENTS[i]!.rule;
    let line: Line;
    if (rule === "session") {
      line = { id: code("INV"), kind: "charge", s: i, amt: FEE };
      billed += FEE;
    } else if (rule === "package") {
      x.left -= 1;
      line = { id: code("PKG"), kind: "pkg", s: i, amt: 0, left: x.left };
    } else line = { id: code("ATT"), kind: "mon", s: i, amt: 0 };
    x.present = true;
    x.last = line;
    lines.push(line);
  };

  for (const e of due) {
    if (e.k === "arrive") {
      const x = st[e.s!]!;
      if (!x.present && !x.touched && !closed) markPresent(e.s!);
    } else if (e.k === "pay") {
      collected += PAY.amount;
      lines.push({ id: code("PAY"), kind: "pay", s: PAY.s, amt: PAY.amount });
    } else if (e.k === "end") {
      closed = true;
      lines.push({
        id: "END",
        kind: "end",
        abs: st.flatMap((x, i) => (x.present ? [] : [i])),
        amt: 0,
      });
    } else {
      const x = st[e.s!]!;
      x.touched = true;
      if (x.present && x.last) {
        const prev = x.last;
        if (prev.kind === "charge") billed -= prev.amt;
        if (prev.kind === "pkg") x.left += 1;
        x.present = false;
        lines.push({ id: code("REV"), kind: "rev", s: e.s!, amt: prev.amt, of: prev.id });
      } else markPresent(e.s!);
    }
  }
  return { st, lines, billed, collected, closed };
}

function clockFromProgress(p: number) {
  // 0.04 → 5:55 PM, 0.9 → 7:30 PM, then a short hold on the closed class.
  const u = Math.min(Math.max((p - 0.04) / 0.86, 0), 1);
  return START + u * (END - START);
}

export function RegisterSection({ lang, chapter }: { lang: Lang; chapter: number }) {
  const c = LANDING_COPY[lang];
  const l = L[lang];
  const names = SAMPLE_NAMES[lang];
  const ref = useRef<HTMLElement>(null);
  const [minute, setMinute] = useState(START);
  const clockRef = useRef(START);
  const [taps, setTaps] = useState<Tap[]>([]);
  const shown = useRef<Set<string>>(new Set());

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const p = Math.min(Math.max(-rect.top / Math.max(el.offsetHeight - innerHeight, 1), 0), 1);
      const t = clockFromProgress(p);
      clockRef.current = t;
      el.style.setProperty("--clock", ((t - START) / (END - START)).toFixed(4));
      setMinute(Math.floor(t));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const r = useMemo(() => replay(minute, taps), [minute, taps]);
  const total = 18 * 60 + minute;
  const h = Math.floor(total / 60);
  const mm = total % 60;
  const time = `${h % 12 || 12}:${String(mm).padStart(2, "0")}`;

  // Lines that were not on screen last render animate in; everything else stays put.
  const prev = shown.current;
  const next = new Set(r.lines.map((x) => x.id));
  useEffect(() => {
    shown.current = next;
  });

  const describe = (ln: Line) => {
    switch (ln.kind) {
      case "charge":
        return `${names[ln.s]} · ${l.charge}`;
      case "pkg":
        return `${names[ln.s]} · ${l.pkg(ln.left ?? 0)}`;
      case "mon":
        return `${names[ln.s]} · ${l.mon}`;
      case "pay":
        return l.pay(PAY.ref);
      case "rev":
        return `${names[ln.s]} · ${l.rev(ln.of)}`;
      case "end":
        return l.end(ln.abs.map((i) => names[i]).join(l.join) || "—");
    }
  };
  const amount = (ln: Line) =>
    ln.kind === "charge" || ln.kind === "pay"
      ? `+${ln.amt}`
      : ln.kind === "rev"
        ? ln.amt
          ? `−${ln.amt}`
          : "−"
        : "0";

  return (
    <section
      ref={ref}
      className="lp-pin lp-peak"
      id="register"
      data-chapter={chapter}
      style={{ "--span": 3.8 } as CSSProperties}
      aria-labelledby="peak-h"
    >
      <div className="lp-stage">
        <div className="peak__copy">
          <p className="sample">{c.sample}</p>
          <h2 id="peak-h">{c.peakH}</h2>
          <p className="clock" aria-hidden="true">
            <span className="clock__t" dir="ltr">
              {time}
            </span>
            <span className="clock__ap">{l.ap(h)}</span>
          </p>
          <div className="clock__bar" aria-hidden="true">
            <span />
          </div>
          <p className="clock__status">{minute < 0 ? l.before : r.closed ? l.after : l.during}</p>
          <p className="peak__hint">{c.hint}</p>
        </div>

        <div className="inst" role="group" aria-labelledby="inst-h">
          <div className="inst__head">
            <b id="inst-h">{c.instH}</b>
            <span>{c.instM}</span>
          </div>
          <div className="inst__body">
            <ul className="reg">
              {STUDENTS.map((s, i) => {
                const x = r.st[i]!;
                const state = x.present ? l.present : r.closed ? l.absent : l.waiting;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      aria-pressed={x.present}
                      aria-label={`${names[i]}, ${state}`}
                      onClick={() =>
                        setTaps((t) => [...t, { t: clockRef.current, s: i, seq: t.length }])
                      }
                    >
                      <span className="box" aria-hidden="true">
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3.5 8.5l3 3 6-7" />
                        </svg>
                      </span>
                      <span className="who">
                        <b>{names[i]}</b>
                        <small>{l.rule(s.rule, x.left)}</small>
                      </span>
                      <span className={"state" + (!x.present && r.closed ? " is-absent" : "")}>
                        {state}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="tape">
              <div className="tape__h">{c.tapeH}</div>
              <ol aria-live="polite">
                {r.lines.length === 0 && <li className="tl__empty">{l.empty}</li>}
                {r.lines
                  .slice()
                  .reverse()
                  .map((ln) => (
                    <li
                      key={ln.id}
                      className={
                        "tl" +
                        (ln.kind === "rev" ? " rev" : ln.kind === "pay" ? " pay" : "") +
                        (prev.has(ln.id) ? "" : " is-new")
                      }
                    >
                      <div className="tl__r">
                        <span className="tl__code" dir="ltr">
                          {ln.id}
                        </span>
                        <span className="tl__amt" dir="ltr">
                          {amount(ln)}
                        </span>
                      </div>
                      <div className="tl__d">{describe(ln)}</div>
                    </li>
                  ))}
              </ol>
            </div>
          </div>
          <dl className="totals">
            <div>
              <dt>{c.tBilled}</dt>
              <dd>{l.cur(r.billed)}</dd>
            </div>
            <div>
              <dt>{c.tCollected}</dt>
              <dd>{l.cur(r.collected)}</dd>
            </div>
            <div>
              <dt>{c.tTeacher}</dt>
              <dd>{l.cur(Math.round(r.collected * SHARE))}</dd>
            </div>
            <div className="lines">{l.lines(r.lines.length)}</div>
          </dl>
        </div>
      </div>
    </section>
  );
}
