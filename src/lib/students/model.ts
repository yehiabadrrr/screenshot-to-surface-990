import type { Student } from "@/lib/data";
import type { StudentRow } from "@/lib/supabase/types";

/** A persisted student, in the shape the existing screens and the demo ledger use (id = student code). */
export type PersistedStudent = Student & { uuid: string; branchId: string };

export function toStudent(row: StudentRow, branchName: (branchId: string) => string): PersistedStudent {
  return {
    id: row.student_code,
    uuid: row.id,
    branchId: row.branch_id,
    name: row.name,
    phone: row.phone,
    guardian: row.guardian_name ?? "",
    guardianPhone: row.guardian_phone ?? "",
    classIds: row.class_codes,
    status: row.status,
    branch: branchName(row.branch_id),
    grade: row.grade,
    joined: row.joined_on,
    // Filled in by the ledger store from recorded (demo) attendance; not stored in the database.
    attendance: null,
  };
}
