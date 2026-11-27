import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { seedLedger, seedSessions, LEDGER_MONTHS, type SessionRecord, type AuditItem } from "./ledger-seed";
import { appendPayment, confirmPayment, correctEntry, nextId, periodFilter, comparisonFilter, type Filter, type LedgerEntry, type NewPayment } from "./ledger";
import { amendAttendance, finalizeSession, sessionIdFor, type BillingRule, type Mark } from "./billing";
import { students as seedStudents, classes as sampleClasses, teachers as sampleTeachers, seedEnrollmentRules, enrollmentKey, type ClassItem, type Student, type Teacher } from "./data";
import { centerProfile } from "./center-config";
import { getSupabase } from "./backend/supabase";
import { loadCenterData, saveStudent, saveClass as saveClassRow, saveTeacher as saveTeacherRow, type ClassInput, type TeacherInput } from "./backend/students";

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
  | { kind: "center"; centerId: string; centerName: string; branches: string[]; branchIds: Record<string, string>; isDemoCenter: boolean; canEdit: boolean; canManageCatalog: boolean; user: { name: string; role: string } };

export type { ClassInput, TeacherInput };

interface Store {
  source: DataSource & { loading: boolean; error: string | null };
  centerName: string;
  branches: readonly string[];
  /** The signed-in person, or the sample owner in the demo. */
  currentUser: { name: string; role: string };
  /** Classes a new student can be enrolled in, with their default rule. */
  enrollable: { classes: ClassItem[]; rule: (classId: string) => BillingRule };
  /** The center's catalog: the sample one in the demo, the center's own rows when signed in. */
  classes: ClassItem[];
  teachers: Teacher[];
  findClass: (id: string) => ClassItem | undefined;
  findTeacher: (id: string) => Teacher | undefined;
  teacherActors: { kind: "teacher"; teacherId: string; name: string }[];
  /** Owners (and everyone in the demo) can create and edit classes and teachers. */
  canManageCatalog: boolean;
  /** Create (no id) or update (with id) a class or teacher. Saved for a signed-in center; in memory in the demo. */
  saveClass: (c: ClassInput) => Promise<ClassItem>;
  saveTeacher: (t: TeacherInput) => Promise<Teacher>;
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
  const [catalog, setCatalog] = useState<{ classes: ClassItem[]; teachers: Teacher[] }>(center ? { classes: [], teachers: [] } : { classes: sampleClasses, teachers: sampleTeachers });
  const [classRules, setClassRules] = useState<Record<string, BillingRule>>(() => center ? {} : Object.fromEntries(sampleClasses.map((c) => [c.id, c.rule])));
  const [enrollmentRules, setEnrollmentRules] = useState<Record<string, BillingRule>>(center ? {} : seedEnrollmentRules);
  const [sessions, setSessions] = useState<Record<string, SessionRecord>>(sampleLedger ? seedSessions : {});
  const [actor, setActor] = useState<Actor>({ kind: "admin", name: user.name });
  const [loading, setLoading] = useState(!!center);
  const [loadError, setLoadError] = useState<string | null>(null);
  const classIdsRef = useRef(new Map<string, string>());
  const teacherIdsRef = useRef(new Map<string, string>());
  const centerId = center?.centerId;

  useEffect(() => {
    const sb = getSupabase();
    if (!centerId || !sb) return;
    let live = true;
    setLoading(true);
    loadCenterData(sb, centerId).then((d) => {
      if (!live) return;
      classIdsRef.current = d.classIds;
      teacherIdsRef.current = d.teacherIds;
      ref.current.students = d.students; setStudents(d.students);
      ref.current.enrollmentRules = d.enrollmentRules; setEnrollmentRules(d.enrollmentRules);
      ref.current.catalog = { classes: d.classes, teachers: d.teachers }; setCatalog(ref.current.catalog);
      const rules = Object.fromEntries(d.classes.map((c) => [c.id, c.rule]));
      ref.current.classRules = rules; setClassRules(rules);
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
  const ref = useRef({ entries, sessions, classRules, enrollmentRules, students, actor, catalog });
  ref.current = { entries, sessions, classRules, enrollmentRules, students, actor, catalog };
  const classOf = (id: string) => {
    const c = ref.current.catalog.classes.find((x) => x.id === id);
    if (!c) throw new Error(`Unknown class ${id}`);
    return c;
  };
  const commit = (next: LedgerEntry[]) => { ref.current.entries = next; setEntries(next); };
  const commitSessions = (next: Record<string, SessionRecord>) => { ref.current.sessions = next; setSessions(next); };

  const ruleForRef = (studentId: string, classId: string) => {
    const o = ref.current.enrollmentRules[enrollmentKey(studentId, classId)];
    return o ? { rule: o, source: "enrollment" as const } : { rule: ref.current.classRules[classId] ?? classOf(classId).rule, source: "class" as const };
  };
  const ruleFor = useCallback((studentId: string, classId: string) => {
    const o = enrollmentRules[enrollmentKey(studentId, classId)];
    return o ? { rule: o, source: "enrollment" as const } : { rule: classRules[classId] ?? classOf(classId).rule, source: "class" as const };
  }, [enrollmentRules, classRules, catalog]);

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
    const c = classOf(classId);
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
    const c = classOf(classId);
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
    const c = classOf(classId);
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
      const branch = s.branch ?? classOf(s.classIds[0]!).branch;
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

  const enrolledIn = (classId: string) => ref.current.students.filter((x) => x.status === "Active" && x.classIds.includes(classId)).length;
  const nextCode = (ids: string[], prefix: string, first: number) =>
    `${prefix}${ids.reduce((m, id) => (id.startsWith(prefix) ? Math.max(m, Number(id.slice(prefix.length)) || 0) : m), first - 1) + 1}`;

  const saveClass = useCallback<Store["saveClass"]>(async (input) => {
    const center = centerRef.current;
    let cls: ClassItem;
    if (center) {
      const sb = getSupabase();
      if (!sb) throw new Error("Saved data is not available");
      if (!center.canManageCatalog) throw new Error("Only the center's owner can change classes");
      const r = await saveClassRow(sb, center.centerId, input, { classIds: classIdsRef.current, teacherIds: teacherIdsRef.current, branchIds: center.branchIds }, input.id ? enrolledIn(input.id) : 0);
      cls = r.cls;
      classIdsRef.current = new Map(classIdsRef.current).set(cls.id, r.dbId);
    } else {
      const id = input.id ?? nextCode(ref.current.catalog.classes.map((c) => c.id), "C-", 201);
      cls = { ...input, id, enrolled: input.id ? enrolledIn(input.id) : 0, revenue: 0, attendance: 0 };
    }
    const list = ref.current.catalog.classes;
    const classes = list.some((c) => c.id === cls.id) ? list.map((c) => (c.id === cls.id ? cls : c)) : [...list, cls];
    ref.current.catalog = { ...ref.current.catalog, classes }; setCatalog(ref.current.catalog);
    const rules = { ...ref.current.classRules, [cls.id]: cls.rule };
    ref.current.classRules = rules; setClassRules(rules);
    return cls;
  }, []);

  const saveTeacher = useCallback<Store["saveTeacher"]>(async (input) => {
    const center = centerRef.current;
    let teacher: Teacher;
    if (center) {
      const sb = getSupabase();
      if (!sb) throw new Error("Saved data is not available");
      if (!center.canManageCatalog) throw new Error("Only the center's owner can change teachers");
      const r = await saveTeacherRow(sb, center.centerId, input, { classIds: classIdsRef.current, teacherIds: teacherIdsRef.current, branchIds: center.branchIds });
      teacher = r.teacher;
      teacherIdsRef.current = new Map(teacherIdsRef.current).set(teacher.id, r.dbId);
    } else {
      const prev = input.id ? ref.current.catalog.teachers.find((x) => x.id === input.id) : undefined;
      const id = input.id ?? nextCode(ref.current.catalog.teachers.map((x) => x.id), "T-", 101);
      teacher = { ...input, id, sessions: prev?.sessions ?? 0, attending: prev?.attending ?? 0, attendance: prev?.attendance ?? 0 };
    }
    const list = ref.current.catalog.teachers;
    const teachers = list.some((x) => x.id === teacher.id) ? list.map((x) => (x.id === teacher.id ? teacher : x)) : [...list, teacher];
    ref.current.catalog = { ...ref.current.catalog, teachers }; setCatalog(ref.current.catalog);
    return teacher;
  }, []);

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const classMap = useMemo(() => new Map(catalog.classes.map((c) => [c.id, c])), [catalog]);
  const teacherMap = useMemo(() => new Map(catalog.teachers.map((x) => [x.id, x])), [catalog]);
  const teacherActors = useMemo(() => catalog.teachers.map((x) => ({ kind: "teacher" as const, teacherId: x.id, name: x.name })), [catalog]);
  const sourceState: Store["source"] = { ...(center ?? { kind: "demo" as const }), loading, error: loadError };
  const classRule = (id: string) => classRules[id] ?? classMap.get(id)?.rule ?? { kind: "monthly" as const, fee: 0 };
  const enrollable: Store["enrollable"] = { classes: catalog.classes, rule: classRule };
  const value: Store = {
    source: sourceState, currentUser: user, enrollable,
    centerName: center ? center.centerName : centerProfile.name, branches: center ? center.branches : centerProfile.branches,
    classes: catalog.classes, teachers: catalog.teachers,
    findClass: (id) => classMap.get(id), findTeacher: (id) => teacherMap.get(id), teacherActors,
    canManageCatalog: center ? center.canManageCatalog : true, saveClass, saveTeacher,
    entries, period, setPeriod, branch, setBranch, months: LEDGER_MONTHS, filter, compare, today, recordPayment, correct, confirm,
    students, findStudent: (id) => studentMap.get(id), addStudent, ruleFor, classRule,
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
