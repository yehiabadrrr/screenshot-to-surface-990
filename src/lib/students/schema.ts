import { z } from "zod";

/** Same rules as the database CHECK constraints in supabase/migrations, so errors surface before the round trip. */
export const EGYPT_MOBILE = /^01[0125]\d{8}$/;
export const STUDENT_STATUSES = ["Active", "Paused", "Inactive"] as const;
export const STUDENT_SORTS = ["name", "code", "newest"] as const;

const optionalPhone = z
  .union([
    z.literal(""),
    z.string().regex(EGYPT_MOBILE, "The guardian's number is not a valid Egyptian mobile number."),
  ])
  .optional();

export const studentFields = z.object({
  name: z.string().trim().min(3, "Enter the student's full name.").max(120),
  phone: z
    .string()
    .trim()
    .regex(
      EGYPT_MOBILE,
      "Enter an 11-digit Egyptian mobile number starting with 010, 011, 012 or 015.",
    ),
  guardianName: z.string().trim().max(120).optional(),
  guardianPhone: optionalPhone,
  grade: z.string().trim().min(1).max(40),
  branchId: z.string().uuid("Choose a branch."),
  status: z.enum(STUDENT_STATUSES).default("Active"),
  classCodes: z
    .array(z.string().regex(/^C-\d+$/))
    .max(20)
    .default([]),
});

export const createStudentInput = studentFields.extend({ centerId: z.string().uuid() });
export type CreateStudentInput = z.input<typeof createStudentInput>;

export const updateStudentInput = z.object({
  centerId: z.string().uuid(),
  code: z.string().regex(/^S-\d+$/),
  patch: studentFields
    .omit({ classCodes: true })
    .partial()
    .refine((p) => Object.keys(p).length > 0, "Nothing to update."),
});
export type UpdateStudentInput = z.input<typeof updateStudentInput>;

export const listStudentsInput = z.object({
  centerId: z.string().uuid(),
  q: z.string().trim().max(80).default(""),
  grade: z.string().max(40).optional(),
  branchId: z.string().uuid().optional(),
  status: z.enum(STUDENT_STATUSES).optional(),
  /** Restrict to these codes (used by the demo-balance segments until the ledger is persisted). */
  codes: z
    .array(z.string().regex(/^S-\d+$/))
    .max(5000)
    .optional(),
  sort: z.enum(STUDENT_SORTS).default("name"),
  descending: z.boolean().default(false),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(15),
});
export type ListStudentsInput = z.input<typeof listStudentsInput>;

export const centerScope = z.object({ centerId: z.string().uuid() });
export const studentByCode = z.object({
  centerId: z.string().uuid(),
  code: z.string().regex(/^S-\d+$/),
});

export const createCenterInput = z.object({
  name: z.string().trim().min(2, "Enter your center's name.").max(120),
  branches: z.array(z.string().trim().min(1).max(80)).min(1, "Add at least one branch.").max(20),
});

/** PostgREST `or()` filters are comma/paren separated; strip characters that would change the filter. */
export const sanitizeSearch = (q: string) =>
  q
    .replace(/[,()*%\\:"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
