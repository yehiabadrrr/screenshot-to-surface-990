import { createContext, useContext } from "react";
import {
  createStudent,
  getStudent,
  listAllStudents,
  listStudents,
  updateStudent,
} from "@/lib/api/students";
import type { StudentRow } from "@/lib/supabase/types";
import { DEMO_BRANCH_IDS } from "@/lib/demo-seed";
import { students as sampleStudents } from "@/lib/data";
import { cairoToday } from "@/lib/business-date";
import {
  createStudentInput,
  listStudentsInput,
  sanitizeSearch,
  updateStudentInput,
  type CreateStudentInput,
  type ListStudentsInput,
  type UpdateStudentInput,
} from "./schema";

/**
 * Where the student hooks read and write. The console uses Supabase (server functions, RLS); the public
 * in-browser demo swaps in a local store so it works with no account. Both take the same validated input.
 */
export type StudentSource = {
  listAll: (centerId: string) => Promise<StudentRow[]>;
  list: (params: ListStudentsInput) => Promise<{ rows: StudentRow[]; total: number }>;
  get: (centerId: string, code: string) => Promise<StudentRow | null>;
  create: (input: CreateStudentInput) => Promise<StudentRow>;
  update: (input: UpdateStudentInput) => Promise<StudentRow>;
};

export const remoteStudents: StudentSource = {
  listAll: (centerId) => listAllStudents({ data: { centerId } }),
  list: (params) => listStudents({ data: params }),
  get: (centerId, code) => getStudent({ data: { centerId, code } }),
  create: (input) => createStudent({ data: input }),
  update: (input) => updateStudent({ data: input }),
};

const SourceCtx = createContext<StudentSource>(remoteStudents);
export const StudentSourceProvider = SourceCtx.Provider;
export const useStudentSource = () => useContext(SourceCtx);

/* ------------------------------------------------------------------ local -- */

const codeNumber = (code: string) => Number(code.slice(2));
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Mirrors listStudents in src/lib/api/students.ts: case-insensitive search on name, code and phone;
 * grade, branch, status and code filters; the same three sort orders and tie-breakers; page/pageSize.
 */
export function queryStudents(
  all: StudentRow[],
  raw: ListStudentsInput,
): { rows: StudentRow[]; total: number } {
  const p = listStudentsInput.parse(raw);
  const q = sanitizeSearch(p.q).toLowerCase();
  if (p.codes && !p.codes.length) return { rows: [], total: 0 };
  const codes = p.codes ? new Set(p.codes) : null;
  const hit = all.filter(
    (r) =>
      r.center_id === p.centerId &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.student_code.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q)) &&
      (!p.grade || r.grade === p.grade) &&
      (!p.branchId || r.branch_id === p.branchId) &&
      (!p.status || r.status === p.status) &&
      (!codes || codes.has(r.student_code)),
  );
  const dir = p.descending ? -1 : 1;
  hit.sort(
    p.sort === "newest"
      ? (a, b) => -dir * (byText(a.joined_on, b.joined_on) || byText(a.created_at, b.created_at))
      : p.sort === "code"
        ? (a, b) => dir * byText(a.student_code, b.student_code)
        : (a, b) => dir * byText(a.name, b.name) || byText(a.student_code, b.student_code),
  );
  const from = p.page * p.pageSize;
  return { rows: hit.slice(from, from + p.pageSize), total: hit.length };
}

/** The 300 sample students (current names, original S- codes) as rows of the given center. */
export function sampleStudentRows(centerId: string): StudentRow[] {
  return sampleStudents.map((s, i) => {
    const stamp = `${s.joined}T09:00:00.000Z`;
    return {
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      center_id: centerId,
      branch_id: DEMO_BRANCH_IDS[s.branch as keyof typeof DEMO_BRANCH_IDS],
      student_code: s.id,
      name: s.name,
      phone: s.phone,
      guardian_name: s.guardian || null,
      guardian_phone: s.guardianPhone || null,
      grade: s.grade,
      status: s.status,
      joined_on: s.joined,
      class_codes: [...s.classIds],
      created_by: null,
      created_at: stamp,
      updated_at: stamp,
    };
  });
}

/** An in-memory student table for one center. Lives as long as the page; nothing is persisted. */
export function createLocalStudents(
  centerId: string,
  seed: StudentRow[] = sampleStudentRows(centerId),
): StudentSource {
  const rows = seed.map((r) => ({ ...r, class_codes: [...r.class_codes] }));
  let next = Math.max(1000, ...rows.map((r) => codeNumber(r.student_code))) + 1;
  const copy = (r: StudentRow): StudentRow => ({ ...r, class_codes: [...r.class_codes] });
  const today = () => cairoToday();

  return {
    listAll: async (id) =>
      rows
        .filter((r) => r.center_id === id)
        .sort((a, b) => byText(a.student_code, b.student_code))
        .map(copy),
    list: async (params) => {
      const out = queryStudents(rows, params);
      return { rows: out.rows.map(copy), total: out.total };
    },
    get: async (id, code) => {
      const r = rows.find((x) => x.center_id === id && x.student_code === code);
      return r ? copy(r) : null;
    },
    create: async (raw) => {
      const d = createStudentInput.parse(raw);
      if (d.centerId !== centerId) throw new Error("You don't have permission to do that.");
      const now = new Date().toISOString();
      const row: StudentRow = {
        id: crypto.randomUUID(),
        center_id: d.centerId,
        branch_id: d.branchId,
        student_code: `S-${next++}`,
        name: d.name,
        phone: d.phone,
        guardian_name: d.guardianName || null,
        guardian_phone: d.guardianPhone || null,
        grade: d.grade,
        status: d.status,
        joined_on: today(),
        class_codes: [...d.classCodes],
        created_by: null,
        created_at: now,
        updated_at: now,
      };
      rows.push(row);
      return copy(row);
    },
    update: async (raw) => {
      const d = updateStudentInput.parse(raw);
      const r = rows.find((x) => x.center_id === d.centerId && x.student_code === d.code);
      if (!r)
        throw new Error("This student was not found, or you don't have permission to edit it.");
      const p = d.patch;
      if (p.name !== undefined) r.name = p.name;
      if (p.phone !== undefined) r.phone = p.phone;
      if (p.guardianName !== undefined) r.guardian_name = p.guardianName || null;
      if (p.guardianPhone !== undefined) r.guardian_phone = p.guardianPhone || null;
      if (p.grade !== undefined) r.grade = p.grade;
      if (p.branchId !== undefined) r.branch_id = p.branchId;
      if (p.status !== undefined) r.status = p.status;
      r.updated_at = new Date().toISOString();
      return copy(r);
    },
  };
}
