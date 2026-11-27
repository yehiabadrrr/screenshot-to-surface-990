import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillingRule } from "../billing";
import type { Branch, ClassItem, Student, Teacher } from "../data";
import { enrollmentKey } from "../data";
import type { CompensationModel } from "../finance";
import { columnsToRule, ruleToColumns, toEgp, toPiastres, type RuleColumns } from "../db/rules";

export interface StudentRowDb {
  id: string;
  code: string;
  name: string;
  phone: string;
  guardian_name: string;
  guardian_phone: string;
  grade: string;
  status: "active" | "paused" | "inactive";
  joined_on: string;
  demo_attendance_pct: number | null;
  branches: { name: string } | null;
  enrollments: (RuleColumns & { classes: { code: string } | null })[];
}
export interface ClassRowDb extends RuleColumns {
  id: string;
  code: string;
  name: string;
  kind: "tutoring" | "language_course";
  days: string;
  start_time: string;
  capacity: number;
  fee_piastres: number | string;
  teachers: { code: string } | null;
  branches: { name: string } | null;
}

const STUDENT_COLUMNS =
  "id, code, name, phone, guardian_name, guardian_phone, grade, status, joined_on, demo_attendance_pct, branches(name), enrollments(rule_kind, rule_fee_piastres, rule_rate_piastres, rule_charge_no_show, rule_package_sessions, rule_package_price_piastres, rule_count_no_show, classes(code))";
const CLASS_COLUMNS =
  "id, code, name, kind, days, start_time, capacity, fee_piastres, rule_kind, rule_fee_piastres, rule_rate_piastres, rule_charge_no_show, rule_package_sessions, rule_package_price_piastres, rule_count_no_show, teachers(code), branches(name)";
const STATUS = { active: "Active", paused: "Paused", inactive: "Inactive" } as const;

/** The app keeps using human-readable codes (S-1001, C-201) as IDs, so saved demo rows line up with the in-memory demo ledger. */
export function studentFromRow(r: StudentRowDb): Student {
  return {
    id: r.code,
    name: r.name,
    phone: r.phone,
    guardian: r.guardian_name || "—",
    guardianPhone: r.guardian_phone,
    classIds: r.enrollments.map((e) => e.classes?.code).filter((c): c is string => !!c),
    attendance: r.demo_attendance_pct ?? 0,
    status: STATUS[r.status],
    // Branch names are free text for real centers; the demo's typed union only constrains sample data.
    branch: (r.branches?.name ?? "") as Branch,
    grade: r.grade,
    joined: r.joined_on,
  };
}

export function enrollmentRulesFromRows(rows: StudentRowDb[]): Record<string, BillingRule> {
  const out: Record<string, BillingRule> = {};
  for (const s of rows)
    for (const e of s.enrollments) {
      const rule = columnsToRule(e);
      if (rule && e.classes) out[enrollmentKey(s.code, e.classes.code)] = rule;
    }
  return out;
}

export function classFromRow(r: ClassRowDb, enrolled: number): ClassItem {
  return {
    id: r.code,
    name: r.name,
    kind: r.kind === "tutoring" ? "Tutoring" : "Language course",
    teacherId: r.teachers?.code ?? "",
    branch: (r.branches?.name ?? "") as Branch,
    days: r.days,
    time: r.start_time,
    capacity: r.capacity,
    enrolled,
    fee: toEgp(r.fee_piastres),
    revenue: 0,
    attendance: 0,
    rule: columnsToRule(r) ?? { kind: "monthly", fee: toEgp(r.fee_piastres) },
  };
}

export interface TeacherRowDb {
  id: string; code: string; name: string; subject: string; phone: string;
  pay_model: CompensationModel["type"]; pay_amount_piastres: number | string | null; pay_percent: number | string | null;
  branches: { name: string } | null;
}
const TEACHER_COLUMNS = "id, code, name, subject, phone, pay_model, pay_amount_piastres, pay_percent, branches(name)";

export function teacherFromRow(r: TeacherRowDb): Teacher {
  const model: CompensationModel = r.pay_model === "percentage"
    ? { type: "percentage", percent: Number(r.pay_percent ?? 0) }
    : { type: r.pay_model, amount: toEgp(r.pay_amount_piastres ?? 0) };
  // sessions/attending/attendance are sample statistics; a real center has none until attendance is saved.
  return { id: r.code, name: r.name, subject: r.subject, phone: r.phone, branch: (r.branches?.name ?? "") as Branch, model, sessions: 0, attending: 0, attendance: 0 };
}

export interface CenterData {
  students: Student[];
  classes: ClassItem[];
  teachers: Teacher[];
  enrollmentRules: Record<string, BillingRule>;
  /** Class code → database id, for writes. */
  classIds: Map<string, string>;
  /** Teacher code → database id, for writes. */
  teacherIds: Map<string, string>;
}

async function all<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < size) return out;
  }
}

export async function loadCenterData(sb: SupabaseClient, centerId: string): Promise<CenterData> {
  const [studentRows, classRows, teacherRows] = await Promise.all([
    all<StudentRowDb>((a, b) =>
      sb
        .from("students")
        .select(STUDENT_COLUMNS)
        .eq("center_id", centerId)
        .order("code")
        .range(a, b)
        .returns<StudentRowDb[]>(),
    ),
    all<ClassRowDb>((a, b) =>
      sb
        .from("classes")
        .select(CLASS_COLUMNS)
        .eq("center_id", centerId)
        .order("code")
        .range(a, b)
        .returns<ClassRowDb[]>(),
    ),
    all<TeacherRowDb>((a, b) =>
      sb.from("teachers").select(TEACHER_COLUMNS).eq("center_id", centerId).order("code").range(a, b).returns<TeacherRowDb[]>(),
    ),
  ]);
  const students = studentRows.map(studentFromRow);
  const counts = new Map<string, number>();
  for (const s of students)
    if (s.status === "Active") for (const c of s.classIds) counts.set(c, (counts.get(c) ?? 0) + 1);
  return {
    students,
    classes: classRows.map((c) => classFromRow(c, counts.get(c.code) ?? 0)),
    enrollmentRules: enrollmentRulesFromRows(studentRows),
    teachers: teacherRows.map(teacherFromRow),
    classIds: new Map(classRows.map((c) => [c.code, c.id])),
    teacherIds: new Map(teacherRows.map((t) => [t.code, t.id])),
  };
}

/** What the class and teacher editors produce (EGP; codes are the app's IDs, empty for a new record). */
export type ClassInput = Omit<ClassItem, "id" | "enrolled" | "revenue" | "attendance"> & { id?: string };
export type TeacherInput = Pick<Teacher, "name" | "subject" | "phone" | "branch" | "model"> & { id?: string };

export interface CatalogRefs { classIds: Map<string, string>; teacherIds: Map<string, string>; branchIds: Record<string, string> }

export function teacherColumns(t: TeacherInput, refs: CatalogRefs) {
  return {
    name: t.name.trim(), subject: t.subject.trim(), phone: t.phone, branch_id: refs.branchIds[t.branch] ?? null,
    pay_model: t.model.type,
    pay_amount_piastres: t.model.type === "percentage" ? null : toPiastres(t.model.amount),
    pay_percent: t.model.type === "percentage" ? t.model.percent : null,
  };
}

export function classColumns(c: ClassInput, refs: CatalogRefs) {
  const teacherId = refs.teacherIds.get(c.teacherId);
  if (c.teacherId && !teacherId) throw new Error(`Unknown teacher ${c.teacherId}`);
  return {
    name: c.name.trim(), kind: c.kind === "Tutoring" ? "tutoring" : "language_course", teacher_id: teacherId ?? null,
    branch_id: refs.branchIds[c.branch] ?? null, days: c.days, start_time: c.time, capacity: c.capacity,
    fee_piastres: toPiastres(c.fee), ...ruleToColumns(c.rule),
  };
}

/** Insert or update, then read the row back so the app shows what the database stored (codes included). */
export async function saveTeacher(sb: SupabaseClient, centerId: string, t: TeacherInput, refs: CatalogRefs): Promise<{ teacher: Teacher; dbId: string }> {
  const cols = teacherColumns(t, refs);
  const dbId = t.id ? refs.teacherIds.get(t.id) : undefined;
  const q = dbId
    ? sb.from("teachers").update(cols).eq("id", dbId).select(TEACHER_COLUMNS).single<TeacherRowDb>()
    : sb.from("teachers").insert({ center_id: centerId, ...cols }).select(TEACHER_COLUMNS).single<TeacherRowDb>();
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { teacher: teacherFromRow(data), dbId: data.id };
}

export async function saveClass(sb: SupabaseClient, centerId: string, c: ClassInput, refs: CatalogRefs, enrolled: number): Promise<{ cls: ClassItem; dbId: string }> {
  const cols = classColumns(c, refs);
  const dbId = c.id ? refs.classIds.get(c.id) : undefined;
  const q = dbId
    ? sb.from("classes").update(cols).eq("id", dbId).select(CLASS_COLUMNS).single<ClassRowDb>()
    : sb.from("classes").insert({ center_id: centerId, ...cols }).select(CLASS_COLUMNS).single<ClassRowDb>();
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { cls: classFromRow(data, enrolled), dbId: data.id };
}

export interface NewStudentInput {
  name: string;
  phone: string;
  guardian: string;
  guardianPhone: string;
  grade: string;
  classIds: string[];
}

export function addStudentArgs(
  centerId: string,
  s: NewStudentInput,
  rules: Record<string, BillingRule>,
  classIds: Map<string, string>,
) {
  return {
    target_center: centerId,
    student_name: s.name,
    student_phone: s.phone,
    guardian: s.guardian === "—" ? "" : s.guardian,
    guardian_phone_number: s.guardianPhone,
    student_grade: s.grade,
    enrollment_rows: s.classIds.map((code) => {
      const id = classIds.get(code);
      if (!id) throw new Error(`Unknown class ${code}`);
      return { class_id: id, ...ruleToColumns(rules[code]) };
    }),
  };
}

/** Saves a student and their enrollments in one transaction, then reads the row back. */
export async function saveStudent(
  sb: SupabaseClient,
  centerId: string,
  s: NewStudentInput,
  rules: Record<string, BillingRule>,
  classIds: Map<string, string>,
): Promise<Student> {
  const created = await sb
    .rpc("add_student", addStudentArgs(centerId, s, rules, classIds))
    .single<{ id: string }>();
  if (created.error) throw new Error(created.error.message);
  const row = await sb
    .from("students")
    .select(STUDENT_COLUMNS)
    .eq("id", created.data.id)
    .single<StudentRowDb>();
  if (row.error) throw new Error(row.error.message);
  return studentFromRow(row.data);
}
