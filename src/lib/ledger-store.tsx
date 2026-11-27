import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { seedLedger, seedSessions, type SessionRecord, type AuditItem } from "./ledger-seed";
import { cairoToday, reportingMonths } from "./business-date";
import {
  appendPayment,
  correctEntry,
  nextId,
  periodFilter,
  comparisonFilter,
  type Filter,
  type LedgerEntry,
  type NewPayment,
} from "./ledger";
import {
  amendAttendance,
  finalizeSession,
  sessionIdFor,
  type BillingRule,
  type Mark,
} from "./billing";
import {
  students as sampleStudents,
  classes as sampleClasses,
  teachers as sampleTeachers,
  seedEnrollmentRules,
  enrollmentKey,
  type ClassItem,
  type Student,
  type Teacher,
} from "./data";

const EMPTY_CATALOG = { classes: [] as ClassItem[], teachers: [] as Teacher[] };

/** The signed-in user, as recorded on ledger entries and attendance (Phase 1: real Supabase identity). */
export type CurrentUser = { name: string; role: string };
export type Actor =
  { kind: "admin"; name: string } | { kind: "teacher"; teacherId: string; name: string };

/** Business date in Africa/Cairo (see business-date.ts), never the UTC date. */
export const todayIso = () => cairoToday();

interface Store {
  /** The center's class and teacher catalog. Only the Demo Center gets the sample catalog; customer centers start empty. */
  classes: ClassItem[];
  teachers: Teacher[];
  classById: (id: string) => ClassItem | undefined;
  teacherById: (id: string) => Teacher | undefined;
  entries: LedgerEntry[];
  period: string;
  setPeriod: (p: string) => void;
  branch: string;
  setBranch: (b: string) => void;
  months: string[];
  filter: Filter;
  compare: Filter;
  today: string;
  recordPayment: (p: Omit<NewPayment, "enteredBy">) => LedgerEntry;
  correct: (
    id: string,
    opts: { reason: string; correctedAmount?: number },
  ) => { reversal: LedgerEntry; replacement?: LedgerEntry };
  /** True only for the Demo Center: the sample ledger and attendance are loaded. */
  demo: boolean;
  currentUser: CurrentUser;
  // students (persistent, loaded from Supabase) & enrollment rules (still in-memory demo data)
  students: Student[];
  findStudent: (id: string) => Student | undefined;
  ruleFor: (
    studentId: string,
    classId: string,
  ) => { rule: BillingRule; source: "class" | "enrollment" };
  classRule: (classId: string) => BillingRule;
  setClassRule: (classId: string, rule: BillingRule) => void;
  setEnrollmentRule: (studentId: string, classId: string, rule: BillingRule | null) => void;
  sellPackage: (studentId: string, classId: string) => LedgerEntry;
  // attendance
  actor: Actor;
  setActor: (a: Actor) => void;
  sessions: Record<string, SessionRecord>;
  setMark: (classId: string, date: string, studentId: string, mark: Mark) => void;
  setMarks: (classId: string, date: string, marks: Record<string, Mark>) => void;
  finalize: (classId: string, date: string) => { created: LedgerEntry[] };
  amend: (classId: string, date: string, studentId: string, to: Mark, reason: string) => AuditItem;
}

const Ctx = createContext<Store | null>(null);

/**
 * Shared console state. Students come from Supabase (props); the ledger, sessions, billing rules and class
 * catalog are still in-memory demo data: a refresh restores them. The sample ledger and attendance are
 * loaded only for the Demo Center, whose students carry the original sample codes; other centers start
 * with an empty demo ledger.
 */
export function LedgerProvider({
  children,
  students: loaded,
  demo,
  currentUser,
}: {
  children: ReactNode;
  students: Student[];
  demo: boolean;
  currentUser: CurrentUser;
}) {
  const CURRENT_USER = currentUser;
  const [entries, setEntries] = useState<LedgerEntry[]>(() => (demo ? seedLedger : []));
  // The sample catalog (Nile Academy's classes and teachers) belongs to the Demo Center only.
  const catalog = demo ? { classes: sampleClasses, teachers: sampleTeachers } : EMPTY_CATALOG;
  const classes = catalog.classes;
  const classById = (id: string) => (demo ? catalog.classes.find((c) => c.id === id) : undefined);
  const requireClass = (id: string) => {
    const c = classById(id);
    if (!c) throw new Error("Unknown class");
    return c;
  };
  const teacherById = (id: string) => catalog.teachers.find((x) => x.id === id);
  const [classRules, setClassRules] = useState<Record<string, BillingRule>>(() =>
    Object.fromEntries(catalog.classes.map((c) => [c.id, c.rule])),
  );
  const [enrollmentRules, setEnrollmentRules] = useState<Record<string, BillingRule>>(() =>
    demo ? seedEnrollmentRules : {},
  );
  const [sessions, setSessions] = useState<Record<string, SessionRecord>>(() =>
    demo ? seedSessions : {},
  );
  const [actor, setActor] = useState<Actor>({ kind: "admin", name: CURRENT_USER.name });
  // Attendance shown beside each student is derived from recorded (demo) sessions, never stored. The Demo
  // Center falls back to the original sample rate for students without recorded sessions.
  const students = useMemo(() => {
    const marks = new Map<string, { present: number; marked: number }>();
    for (const s of Object.values(sessions))
      for (const [sid, m] of Object.entries(s.marks)) {
        if (!m) continue;
        const x = marks.get(sid) ?? { present: 0, marked: 0 };
        x.marked++;
        if (m === "Present") x.present++;
        marks.set(sid, x);
      }
    const sample = demo ? new Map(sampleStudents.map((s) => [s.id, s.attendance])) : null;
    return loaded.map((s) => {
      const x = marks.get(s.id);
      return {
        ...s,
        attendance: x ? Math.round((x.present / x.marked) * 100) : (sample?.get(s.id) ?? null),
      };
    });
  }, [loaded, sessions, demo]);
  const today = todayIso();
  // Rolling window ending with the current Cairo month, so every new month is selectable.
  const months = useMemo(() => reportingMonths(today, 12), [today]);
  const [period, setPeriod] = useState(() => months[months.length - 1]!);
  const [branch, setBranch] = useState("all");
  const filter = useMemo(() => periodFilter(period, branch, today), [period, branch, today]);
  const compare = useMemo(() => comparisonFilter(filter), [filter]);

  // Writes compute from the latest state synchronously so callers get created IDs back.
  const ref = useRef({ entries, sessions, classRules, enrollmentRules, students, actor });
  ref.current = { entries, sessions, classRules, enrollmentRules, students, actor };
  const commit = (next: LedgerEntry[]) => {
    ref.current.entries = next;
    setEntries(next);
  };
  const commitSessions = (next: Record<string, SessionRecord>) => {
    ref.current.sessions = next;
    setSessions(next);
  };

  const ruleForRef = (studentId: string, classId: string) => {
    const o = ref.current.enrollmentRules[enrollmentKey(studentId, classId)];
    return o
      ? { rule: o, source: "enrollment" as const }
      : {
          rule: ref.current.classRules[classId] ?? requireClass(classId).rule,
          source: "class" as const,
        };
  };
  const ruleFor = useCallback(
    (studentId: string, classId: string) => {
      const o = enrollmentRules[enrollmentKey(studentId, classId)];
      return o
        ? { rule: o, source: "enrollment" as const }
        : { rule: classRules[classId] ?? requireClass(classId).rule, source: "class" as const };
    },
    [enrollmentRules, classRules],
  );

  const recordPayment = useCallback<Store["recordPayment"]>((p) => {
    const r = appendPayment(ref.current.entries, { ...p, enteredBy: CURRENT_USER.name });
    commit(r.entries);
    return r.entry;
  }, []);
  const correct = useCallback<Store["correct"]>((id, opts) => {
    const r = correctEntry(ref.current.entries, id, {
      ...opts,
      by: CURRENT_USER.name,
      date: todayIso(),
    });
    commit(r.entries);
    return { reversal: r.reversal, ...(r.replacement ? { replacement: r.replacement } : {}) };
  }, []);

  const session = (classId: string, date: string): SessionRecord => {
    const id = sessionIdFor(classId, date);
    return ref.current.sessions[id] ?? { sessionId: id, classId, date, marks: {}, audit: [] };
  };
  const setMarks = useCallback<Store["setMarks"]>((classId, date, marks) => {
    const s = session(classId, date);
    if (s.finalized) throw new Error("Session is finalized; changes need a reason");
    commitSessions({
      ...ref.current.sessions,
      [s.sessionId]: { ...s, marks: { ...s.marks, ...marks } },
    });
  }, []);
  const setMark = useCallback<Store["setMark"]>(
    (classId, date, studentId, mark) => setMarks(classId, date, { [studentId]: mark }),
    [setMarks],
  );

  const roster = (classId: string, date: string) =>
    ref.current.students.filter(
      (s) => s.status === "Active" && s.classIds.includes(classId) && s.joined <= date,
    );

  const finalize = useCallback<Store["finalize"]>((classId, date) => {
    const s = session(classId, date);
    if (s.finalized) throw new Error("This session is already finalized");
    const c = requireClass(classId);
    const by = ref.current.actor.name;
    const now = new Date().toISOString();
    const r = finalizeSession(ref.current.entries, {
      sessionId: s.sessionId,
      classId,
      date,
      branch: c.branch,
      marks: s.marks,
      by,
      now,
      enrollments: roster(classId, date).map((st) => ({
        studentId: st.id,
        rule: ruleForRef(st.id, classId).rule,
      })),
    });
    commit(r.entries);
    commitSessions({
      ...ref.current.sessions,
      [s.sessionId]: { ...s, finalized: { by, at: now } },
    });
    return { created: r.created };
  }, []);

  const amend = useCallback<Store["amend"]>((classId, date, studentId, to, reason) => {
    const s = session(classId, date);
    if (!s.finalized) throw new Error("Session is not finalized");
    const c = requireClass(classId);
    const by = ref.current.actor.name;
    const now = new Date().toISOString();
    const from = s.marks[studentId];
    const r = amendAttendance(ref.current.entries, {
      sessionId: s.sessionId,
      classId,
      date,
      branch: c.branch,
      studentId,
      rule: ruleForRef(studentId, classId).rule,
      from,
      to,
      reason,
      by,
      now,
      today: todayIso(),
    });
    commit(r.entries);
    const item: AuditItem = {
      studentId,
      from,
      to,
      by,
      at: now,
      reason: reason.trim(),
      reversalId: r.reversal?.id,
      createdId: r.created?.id,
    };
    commitSessions({
      ...ref.current.sessions,
      [s.sessionId]: { ...s, marks: { ...s.marks, [studentId]: to }, audit: [...s.audit, item] },
    });
    return item;
  }, []);

  const sellPackage = useCallback<Store["sellPackage"]>((studentId, classId) => {
    const { rule } = ruleForRef(studentId, classId);
    if (rule.kind !== "package") throw new Error("This enrollment is not on a package");
    const c = requireClass(classId);
    const entry: LedgerEntry = {
      id: nextId(ref.current.entries, "INV-"),
      type: "Charge",
      studentId,
      classId,
      branch: c.branch,
      date: todayIso(),
      amount: rule.price,
      packageSessions: rule.sessions,
      status: "Completed",
      enteredBy: CURRENT_USER.name,
      enteredAt: new Date().toISOString(),
      note: `Package · ${rule.sessions} sessions`,
    };
    commit([...ref.current.entries, entry]);
    return entry;
  }, []);

  const setEnrollmentRule = useCallback<Store["setEnrollmentRule"]>((studentId, classId, rule) => {
    const next = { ...ref.current.enrollmentRules };
    if (rule) next[enrollmentKey(studentId, classId)] = rule;
    else delete next[enrollmentKey(studentId, classId)];
    ref.current.enrollmentRules = next;
    setEnrollmentRules(next);
  }, []);
  const setClassRule = useCallback<Store["setClassRule"]>((classId, rule) => {
    const next = { ...ref.current.classRules, [classId]: rule };
    ref.current.classRules = next;
    setClassRules(next);
  }, []);

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const value: Store = {
    classes,
    teachers: catalog.teachers,
    classById,
    teacherById,
    entries,
    period,
    setPeriod,
    branch,
    setBranch,
    months,
    filter,
    compare,
    today,
    recordPayment,
    correct,
    demo,
    currentUser,
    students,
    findStudent: (id) => studentMap.get(id),
    ruleFor,
    classRule: (id) => classRules[id] ?? requireClass(id).rule,
    setClassRule,
    setEnrollmentRule,
    sellPackage,
    actor,
    setActor,
    sessions,
    setMark,
    setMarks,
    finalize,
    amend,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLedger() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLedger must be used inside LedgerProvider");
  return v;
}

export const monthLabel = (ym: string, lang: "en" | "ar" = "en") =>
  new Date(`${ym}-15T00:00:00Z`).toLocaleDateString(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/** Teachers the attendance screen can act as (the center's own catalog). */
export const teacherActorsOf = (teachers: Teacher[]) =>
  teachers.map((t) => ({ kind: "teacher" as const, teacherId: t.id, name: t.name }));
