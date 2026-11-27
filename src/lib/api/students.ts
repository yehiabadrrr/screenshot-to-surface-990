import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/lib/supabase/auth-middleware";
import type { StudentRow } from "@/lib/supabase/types";
import {
  centerScope,
  createStudentInput,
  listStudentsInput,
  sanitizeSearch,
  studentByCode,
  updateStudentInput,
} from "@/lib/students/schema";

/**
 * Student data access. Every function runs as the signed-in user through requireSupabaseAuth, so the
 * database's RLS policies decide what is visible or writable; center ids from the client are never trusted
 * beyond being a filter.
 */

const COLUMNS =
  "id, center_id, branch_id, student_code, name, phone, guardian_name, guardian_phone, grade, status, joined_on, class_codes, created_by, created_at, updated_at";

const fail = (message: string, cause?: { message?: string; code?: string } | null): never => {
  if (cause) console.error(message, cause.code, cause.message);
  throw new Error(cause?.code === "42501" ? "You don't have permission to do that." : message);
};

export const listStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => listStudentsInput.parse(d))
  .handler(async ({ data, context }): Promise<{ rows: StudentRow[]; total: number }> => {
    let query = context.supabase
      .from("students")
      .select(COLUMNS, { count: "exact" })
      .eq("center_id", data.centerId);
    const q = sanitizeSearch(data.q);
    if (q) query = query.or(`name.ilike.*${q}*,student_code.ilike.*${q}*,phone.ilike.*${q}*`);
    if (data.grade) query = query.eq("grade", data.grade);
    if (data.branchId) query = query.eq("branch_id", data.branchId);
    if (data.status) query = query.eq("status", data.status);
    if (data.codes) {
      if (!data.codes.length) return { rows: [], total: 0 };
      query = query.in("student_code", data.codes);
    }
    const asc = !data.descending;
    query =
      data.sort === "newest"
        ? query.order("joined_on", { ascending: !asc }).order("created_at", { ascending: !asc })
        : data.sort === "code"
          ? query.order("student_code", { ascending: asc })
          : query.order("name", { ascending: asc }).order("student_code", { ascending: true });
    const from = data.page * data.pageSize;
    const { data: rows, count, error } = await query.range(from, from + data.pageSize - 1);
    if (error) fail("Could not load students.", error);
    return { rows: (rows ?? []) as StudentRow[], total: count ?? 0 };
  });

/** Every student of a center (for the screens that still join against the in-memory demo ledger). */
export const listAllStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => centerScope.parse(d))
  .handler(async ({ data, context }): Promise<StudentRow[]> => {
    const out: StudentRow[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: rows, error } = await context.supabase
        .from("students")
        .select(COLUMNS)
        .eq("center_id", data.centerId)
        .order("student_code", { ascending: true })
        .range(from, from + 999);
      if (error) fail("Could not load students.", error);
      out.push(...((rows ?? []) as StudentRow[]));
      if (!rows || rows.length < 1000 || out.length >= 20000) break;
    }
    return out;
  });

export const getStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => studentByCode.parse(d))
  .handler(async ({ data, context }): Promise<StudentRow | null> => {
    const { data: row, error } = await context.supabase
      .from("students")
      .select(COLUMNS)
      .eq("center_id", data.centerId)
      .eq("student_code", data.code)
      .maybeSingle();
    if (error) fail("Could not load the student.", error);
    return (row as StudentRow | null) ?? null;
  });

export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createStudentInput.parse(d))
  .handler(async ({ data, context }): Promise<StudentRow> => {
    const { data: row, error } = await context.supabase
      .from("students")
      .insert({
        center_id: data.centerId,
        branch_id: data.branchId,
        name: data.name,
        phone: data.phone,
        guardian_name: data.guardianName || null,
        guardian_phone: data.guardianPhone || null,
        grade: data.grade,
        status: data.status,
        class_codes: data.classCodes,
      })
      .select(COLUMNS)
      .single();
    if (error || !row) fail("Could not save the student.", error);
    return row as StudentRow;
  });

export const updateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => updateStudentInput.parse(d))
  .handler(async ({ data, context }): Promise<StudentRow> => {
    const p = data.patch;
    const patch = {
      ...(p.name !== undefined ? { name: p.name } : {}),
      ...(p.phone !== undefined ? { phone: p.phone } : {}),
      ...(p.guardianName !== undefined ? { guardian_name: p.guardianName || null } : {}),
      ...(p.guardianPhone !== undefined ? { guardian_phone: p.guardianPhone || null } : {}),
      ...(p.grade !== undefined ? { grade: p.grade } : {}),
      ...(p.branchId !== undefined ? { branch_id: p.branchId } : {}),
      ...(p.status !== undefined ? { status: p.status } : {}),
    };
    const { data: rows, error } = await context.supabase
      .from("students")
      .update(patch)
      .eq("center_id", data.centerId)
      .eq("student_code", data.code)
      .select(COLUMNS);
    if (error) fail("Could not save the changes.", error);
    // RLS turns an unauthorized update into "0 rows", not an error.
    if (!rows?.length) fail("This student was not found, or you don't have permission to edit it.");
    return rows![0] as StudentRow;
  });
