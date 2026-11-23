import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { seedLedger, seedSessions, LEDGER_MONTHS, type SessionRecord, type AuditItem } from "./ledger-seed";
import { appendPayment, correctEntry, nextId, periodFilter, comparisonFilter, type Filter, type LedgerEntry, type NewPayment } from "./ledger";
import { amendAttendance, finalizeSession, sessionIdFor, type BillingRule, type Mark } from "./billing";
import { students as seedStudents, classes, classById, teachers, seedEnrollmentRules, enrollmentKey, type Student } from "./data";
import { centerProfile } from "./center-config";

/** Demo identity. There is no real sign-in or access control yet. */
export const CURRENT_USER = centerProfile.currentUser;
export type Actor = { kind: "admin"; name: string } | { kind: "teacher"; teacherId: string; name: string };

export const todayIso = () => new Date().toISOString().slice(0, 10);

interface Store {
  classes: typeof classes;
  teachers: typeof teachers;
  entries: LedgerEntry[];
  period: string; setPeriod: (p: string) => void;
  branch: string; setBranch: (b: string) => void;
  months: string[];
  filter: Filter; compare: Filter; today: string;
  recordPayment: (p: Omit<NewPayment, "enteredBy">) => LedgerEntry;
  correct: (id: string, opts: { reason: string; correctedAmount?: number }) => { reversal: LedgerEntry; replacement?: LedgerEntry };
  // students & enrollments
  students: Student[];
  findStudent: (id: string) => Student | undefined;
  addStudent: (s: Omit<Student, "id" | "status" | "joined" | "attendance">, rules: Record<string, BillingRule>) => Student;
  ruleFor: (studentId: string, classId: string) => { rule: BillingRule; source: "class" | "enrollment" };
  classRule: (classId: string) => BillingRule;
  setClassRule: (classId: string, rule: BillingRule) => void;
  setEnrollmentRule: (studentId: string, classId: string, rule: BillingRule | null) => void;
  sellPackage: (studentId: string, classId: string) => LedgerEntry;
  // attendance
  actor: Actor; setActor: (a: Actor) => void;
  sessions: Record<string, SessionRecord>;
  setMark: (classId: string, date: string, studentId: string, mark: Mark) => void;
  setMarks: (classId: string, date: string, marks: Record<string, Mark>) => void;
  finalize: (classId: string, date: string) => { created: LedgerEntry[] };
  amend: (classId: string, date: string, studentId: string, to: Mark, reason: string) => AuditItem;
}

const Ctx = createContext<Store | null>(null);

/** In-memory demo state shared by every console page. Nothing is persisted: a refresh restores the sample data. */
export function LedgerProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LedgerEntry[]>(seedLedger);
  const [students, setStudents] = useState<Student[]>(seedStudents);
  const [classRules, setClassRules] = useState<Record<string, BillingRule>>(() => Object.fromEntries(classes.map((c) => [c.id, c.rule])));
  const [enrollmentRules, setEnrollmentRules] = useState<Record<string, BillingRule>>(seedEnrollmentRules);
  const [sessions, setSessions] = useState<Record<string, SessionRecord>>(seedSessions);
  const [actor, setActor] = useState<Actor>({ kind: "admin", name: CURRENT_USER.name });
  const [period, setPeriod] = useState(LEDGER_MONTHS[LEDGER_MONTHS.length - 1]!);
  const [branch, setBranch] = useState("all");
  const today = todayIso();
  const filter = useMemo(() => periodFilter(period, branch, today), [period, branch, today]);
  const compare = useMemo(() => comparisonFilter(filter), [filter]);

  // Writes compute from the latest state synchronously so callers get created IDs back.
  const ref = useRef({ entries, sessions, classRules, enrollmentRules, students, actor });
  ref.current = { entries, sessions, classRules, enrollmentRules, students, actor };
  const commit = (next: LedgerEntry[]) => { ref.current.entries = next; setEntries(next); };
  const commitSessions = (next: Record<string, SessionRecord>) => { ref.current.sessions = next; setSessions(next); };

  const ruleForRef = (studentId: string, classId: string) => {
    const o = ref.current.enrollmentRules[enrollmentKey(studentId, classId)];
    return o ? { rule: o, source: "enrollment" as const } : { rule: ref.current.classRules[classId] ?? classById(classId).rule, source: "class" as const };
  };
  const ruleFor = useCallback((studentId: string, classId: string) => {
    const o = enrollmentRules[enrollmentKey(studentId, classId)];
    return o ? { rule: o, source: "enrollment" as const } : { rule: classRules[classId] ?? classById(classId).rule, source: "class" as const };
  }, [enrollmentRules, classRules]);

  const recordPayment = useCallback<Store["recordPayment"]>((p) => {
    const r = appendPayment(ref.current.entries, { ...p, enteredBy: CURRENT_USER.name });
    commit(r.entries); return r.entry;
  }, []);
  const correct = useCallback<Store["correct"]>((id, opts) => {
    const r = correctEntry(ref.current.entries, id, { ...opts, by: CURRENT_USER.name, date: todayIso() });
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
    commitSessions({ ...ref.current.sessions, [s.sessionId]: { ...s, marks: { ...s.marks, ...marks } } });
  }, []);
  const setMark = useCallback<Store["setMark"]>((classId, date, studentId, mark) => setMarks(classId, date, { [studentId]: mark }), [setMarks]);

  const roster = (classId: string, date: string) =>
    ref.current.students.filter((s) => s.status === "Active" && s.classIds.includes(classId) && s.joined <= date);

  const finalize = useCallback<Store["finalize"]>((classId, date) => {
    const s = session(classId, date);
    if (s.finalized) throw new Error("This session is already finalized");
    const c = classById(classId);
    const by = ref.current.actor.name;
    const now = new Date().toISOString();
    const r = finalizeSession(ref.current.entries, {
      sessionId: s.sessionId, classId, date, branch: c.branch, marks: s.marks, by, now,
      enrollments: roster(classId, date).map((st) => ({ studentId: st.id, rule: ruleForRef(st.id, classId).rule })),
    });
    commit(r.entries);
    commitSessions({ ...ref.current.sessions, [s.sessionId]: { ...s, finalized: { by, at: now } } });
    return { created: r.created };
  }, []);

  const amend = useCallback<Store["amend"]>((classId, date, studentId, to, reason) => {
    const s = session(classId, date);
    if (!s.finalized) throw new Error("Session is not finalized");
    const c = classById(classId);
    const by = ref.current.actor.name;
    const now = new Date().toISOString();
    const from = s.marks[studentId];
    const r = amendAttendance(ref.current.entries, {
      sessionId: s.sessionId, classId, date, branch: c.branch, studentId, rule: ruleForRef(studentId, classId).rule,
      from, to, reason, by, now, today: todayIso(),
    });
    commit(r.entries);
    const item: AuditItem = { studentId, from, to, by, at: now, reason: reason.trim(), reversalId: r.reversal?.id, createdId: r.created?.id };
    commitSessions({ ...ref.current.sessions, [s.sessionId]: { ...s, marks: { ...s.marks, [studentId]: to }, audit: [...s.audit, item] } });
    return item;
  }, []);

  const sellPackage = useCallback<Store["sellPackage"]>((studentId, classId) => {
    const { rule } = ruleForRef(studentId, classId);
    if (rule.kind !== "package") throw new Error("This enrollment is not on a package");
    const c = classById(classId);
    const entry: LedgerEntry = {
      id: nextId(ref.current.entries, "INV-"), type: "Charge", studentId, classId, branch: c.branch, date: todayIso(), amount: rule.price,
      packageSessions: rule.sessions, status: "Completed", enteredBy: CURRENT_USER.name, enteredAt: new Date().toISOString(), note: `Package · ${rule.sessions} sessions`,
    };
    commit([...ref.current.entries, entry]);
    return entry;
  }, []);

  const addStudent = useCallback<Store["addStudent"]>((s, rules) => {
    const max = ref.current.students.reduce((m, x) => Math.max(m, Number(x.id.slice(2))), 1000);
    const st: Student = { ...s, id: `S-${max + 1}`, status: "Active", joined: todayIso(), attendance: 0 };
    const nextStudents = [...ref.current.students, st];
    ref.current.students = nextStudents; setStudents(nextStudents);
    const nextRules = { ...ref.current.enrollmentRules };
    for (const [cid, r] of Object.entries(rules)) nextRules[enrollmentKey(st.id, cid)] = r;
    ref.current.enrollmentRules = nextRules; setEnrollmentRules(nextRules);
    return st;
  }, []);

  const setEnrollmentRule = useCallback<Store["setEnrollmentRule"]>((studentId, classId, rule) => {
    const next = { ...ref.current.enrollmentRules };
    if (rule) next[enrollmentKey(studentId, classId)] = rule; else delete next[enrollmentKey(studentId, classId)];
    ref.current.enrollmentRules = next; setEnrollmentRules(next);
  }, []);
  const setClassRule = useCallback<Store["setClassRule"]>((classId, rule) => {
    const next = { ...ref.current.classRules, [classId]: rule };
    ref.current.classRules = next; setClassRules(next);
  }, []);

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const value: Store = {
    classes, teachers,
    entries, period, setPeriod, branch, setBranch, months: LEDGER_MONTHS, filter, compare, today, recordPayment, correct,
    students, findStudent: (id) => studentMap.get(id), addStudent, ruleFor, classRule: (id) => classRules[id] ?? classById(id).rule,
    setClassRule, setEnrollmentRule, sellPackage,
    actor, setActor, sessions, setMark, setMarks, finalize, amend,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLedger() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLedger must be used inside LedgerProvider");
  return v;
}

export const monthLabel = (ym: string, lang: "en" | "ar" = "en") =>
  new Date(`${ym}-15T00:00:00Z`).toLocaleDateString(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export const teacherActors = teachers.map((t) => ({ kind: "teacher" as const, teacherId: t.id, name: t.name }));
