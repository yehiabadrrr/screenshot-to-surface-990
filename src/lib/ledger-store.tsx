import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { seedLedger, seedSessions, LEDGER_MONTHS, type SessionRecord, type AuditItem } from "./ledger-seed";
import { appendPayment, confirmPayment, correctEntry, nextId, periodFilter, comparisonFilter, type Filter, type LedgerEntry, type NewPayment } from "./ledger";
import { amendAttendance, finalizeSession, sessionIdFor, type BillingRule, type Mark } from "./billing";
import { students as seedStudents, classes, classById, teachers, seedEnrollmentRules, enrollmentKey, type ClassItem, type Student } from "./data";
import { centerProfile } from "./center-config";
import { getSupabase } from "./backend/supabase";
import { loadCenterData, saveStudent } from "./backend/students";

/** Demo identity. There is no real sign-in or access control yet. */
export const CURRENT_USER = centerProfile.currentUser;
export type Actor = { kind: "admin"; name: string } | { kind: "teacher"; teacherId: string; name: string };

export const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Where the console's data comes from.
 * - demo: the in-memory sample center (nothing saved).
 * - center: a signed-in user's center. Students and enrollments are saved; the ledger and attendance are not yet
 *   (Phase 2), so they start empty for a real center and only the read-only Demo Center reuses the sample ledger.
 */
export type DataSource =
  | { kind: "demo" }
  | { kind: "center"; centerId: string; centerName: string; branches: string[]; isDemoCenter: boolean; canEdit: boolean; user: { name: string; role: string } };

interface Store {
  source: DataSource & { loading: boolean; error: string | null };
  centerName: string;
  branches: readonly string[];
  /** The signed-in person, or the sample owner in the demo. */
  currentUser: { name: string; role: string };
  /** Classes a new student can be enrolled in, with their default rule. */
  enrollable: { classes: ClassItem[]; rule: (classId: string) => BillingRule };
  classes: typeof classes;
  teachers: typeof teachers;
  entries: LedgerEntry[];
  period: string; setPeriod: (p: string) => void;
  branch: string; setBranch: (b: string) => void;
  months: string[];
  filter: Filter; compare: Filter; today: string;
  recordPayment: (p: Omit<NewPayment, "enteredBy">) => LedgerEntry;
  correct: (id: string, opts: { reason: string; correctedAmount?: number }) => { reversal: LedgerEntry; replacement?: LedgerEntry };
  /** Mark a pending payment as received by appending a Confirmation; the payment itself is not edited. */
  confirm: (id: string) => LedgerEntry;
  // students & enrollments
  students: Student[];
  findStudent: (id: string) => Student | undefined;
  addStudent: (s: Omit<Student, "id" | "status" | "joined" | "attendance" | "branch"> & { branch?: Student["branch"] }, rules: Record<string, BillingRule>) => Promise<Student>;
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

/**
 * State shared by every console page. In the demo nothing is persisted: a refresh restores the sample data.
 * Remount (change `key`) when the source changes; initial state is taken from it once.
 */
export function LedgerProvider({ children, source = { kind: "demo" } }: { children: ReactNode; source?: DataSource }) {
  const center = source.kind === "center" ? source : null;
  const sampleLedger = !center || center.isDemoCenter;
  const user = center ? center.user : CURRENT_USER;
  const [entries, setEntries] = useState<LedgerEntry[]>(sampleLedger ? seedLedger : []);
  const [students, setStudents] = useState<Student[]>(center ? [] : seedStudents);
  const [classRules, setClassRules] = useState<Record<string, BillingRule>>(() => Object.fromEntries(classes.map((c) => [c.id, c.rule])));
  const [enrollmentRules, setEnrollmentRules] = useState<Record<string, BillingRule>>(center ? {} : seedEnrollmentRules);
  const [sessions, setSessions] = useState<Record<string, SessionRecord>>(sampleLedger ? seedSessions : {});
  const [actor, setActor] = useState<Actor>({ kind: "admin", name: user.name });
  const [centerClasses, setCenterClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(!!center);
  const [loadError, setLoadError] = useState<string | null>(null);
  const classIdsRef = useRef(new Map<string, string>());
  const centerId = center?.centerId;

  useEffect(() => {
    const sb = getSupabase();
    if (!centerId || !sb) return;
    let live = true;
    setLoading(true);
    loadCenterData(sb, centerId).then((d) => {
      if (!live) return;
      classIdsRef.current = d.classIds;
      ref.current.students = d.students; setStudents(d.students);
      ref.current.enrollmentRules = d.enrollmentRules; setEnrollmentRules(d.enrollmentRules);
      setCenterClasses(d.classes);
      setClassRules((prev) => { const next = { ...prev, ...Object.fromEntries(d.classes.map((c) => [c.id, c.rule])) }; ref.current.classRules = next; return next; });
      setLoadError(null);
    }).catch((e: unknown) => { if (live) setLoadError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [centerId]);
  const [period, setPeriod] = useState(LEDGER_MONTHS[LEDGER_MONTHS.length - 1]!);
  const [branch, setBranch] = useState("all");
  const today = todayIso();
  const filter = useMemo(() => periodFilter(period, branch, today), [period, branch, today]);
  const compare = useMemo(() => comparisonFilter(filter), [filter]);

  const userRef = useRef(user);
  userRef.current = user;
  const centerRef = useRef(center);
  centerRef.current = center;
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
    const r = appendPayment(ref.current.entries, { ...p, enteredBy: userRef.current.name });
    commit(r.entries); return r.entry;
  }, []);
  const correct = useCallback<Store["correct"]>((id, opts) => {
    const r = correctEntry(ref.current.entries, id, { ...opts, by: userRef.current.name, date: todayIso() });
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
      packageSessions: rule.sessions, status: "Completed", enteredBy: userRef.current.name, enteredAt: new Date().toISOString(), note: `Package · ${rule.sessions} sessions`,
    };
    commit([...ref.current.entries, entry]);
    return entry;
  }, []);

  const confirm = useCallback<Store["confirm"]>((id) => {
    const r = confirmPayment(ref.current.entries, id, { by: userRef.current.name, date: todayIso() });
    commit(r.entries);
    return r.confirmation;
  }, []);

  const addStudent = useCallback<Store["addStudent"]>(async (s, rules) => {
    let st: Student;
    const center = centerRef.current;
    if (center) {
      const sb = getSupabase();
      if (!sb) throw new Error("Saved data is not available");
      if (!center.canEdit) throw new Error("Your role can't add students");
      st = await saveStudent(sb, center.centerId, s, rules, classIdsRef.current);
    } else {
      const max = ref.current.students.reduce((m, x) => Math.max(m, Number(x.id.slice(2))), 1000);
      const branch = s.branch ?? classById(s.classIds[0]!).branch;
      st = { ...s, branch, id: `S-${max + 1}`, status: "Active", joined: todayIso(), attendance: 0 };
    }
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
  const sourceState: Store["source"] = { ...(center ?? { kind: "demo" as const }), loading, error: loadError };
  const enrollable: Store["enrollable"] = center
    ? { classes: centerClasses, rule: (id) => classRules[id] ?? centerClasses.find((c) => c.id === id)!.rule }
    : { classes, rule: (id) => classRules[id] ?? classById(id).rule };
  const value: Store = {
    source: sourceState, currentUser: user, enrollable,
    centerName: center ? center.centerName : centerProfile.name, branches: center ? center.branches : centerProfile.branches,
    classes, teachers,
    entries, period, setPeriod, branch, setBranch, months: LEDGER_MONTHS, filter, compare, today, recordPayment, correct, confirm,
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
