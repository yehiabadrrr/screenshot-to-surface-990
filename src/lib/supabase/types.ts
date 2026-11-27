/**
 * Database types for the tables created in supabase/migrations. Kept by hand until the schema grows;
 * regenerate with `supabase gen types typescript --linked > src/lib/supabase/types.ts` once the CLI is in use.
 */
export type MembershipRole = "owner" | "admin" | "accountant" | "front_desk" | "teacher";
export type StudentStatus = "Active" | "Paused" | "Inactive";

type Table<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };

export type CenterRow = {
  id: string;
  name: string;
  is_demo: boolean;
  next_student_number: number;
  created_by: string | null;
  created_at: string;
};
export type BranchRow = { id: string; center_id: string; name: string; created_at: string };
export type MembershipRow = {
  id: string;
  center_id: string;
  user_id: string;
  role: MembershipRole;
  created_at: string;
};
export type StudentRow = {
  id: string;
  center_id: string;
  branch_id: string;
  student_code: string;
  name: string;
  phone: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  grade: string;
  status: StudentStatus;
  joined_on: string;
  class_codes: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
export type StudentInsertRow = {
  center_id: string;
  branch_id: string;
  name: string;
  phone: string;
  grade: string;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  status?: StudentStatus;
  joined_on?: string;
  class_codes?: string[];
};
export type StudentUpdateRow = Partial<
  Pick<
    StudentRow,
    | "branch_id"
    | "name"
    | "phone"
    | "guardian_name"
    | "guardian_phone"
    | "grade"
    | "status"
    | "class_codes"
  >
>;

export type Database = {
  public: {
    Tables: {
      centers: Table<CenterRow, never, { name?: string }>;
      branches: Table<BranchRow, { center_id: string; name: string }, { name?: string }>;
      memberships: Table<
        MembershipRow,
        { center_id: string; user_id: string; role?: MembershipRole },
        { role?: MembershipRole }
      >;
      students: Table<StudentRow, StudentInsertRow, StudentUpdateRow>;
    };
    Views: Record<never, never>;
    Functions: {
      create_center: { Args: { p_name: string; p_branches: string[] }; Returns: string };
      is_center_member: { Args: { p_center: string }; Returns: boolean };
      has_center_role: { Args: { p_center: string; p_roles: string[] }; Returns: boolean };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
