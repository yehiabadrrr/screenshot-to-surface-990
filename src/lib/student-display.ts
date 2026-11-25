import type { Student } from "./data";

export type StudentRow = Student & { balance: number };
export type StudentSort = "name" | "balance" | "attendance";
export const balanceLabel = (balance: number) => balance > 0 ? "Owing" : balance < 0 ? "Credit" : "Settled";

export function selectStudents(rows: StudentRow[], filters: { query: string; grade: string; branch: string; balance: string; status: string }, sort: StudentSort, descending: boolean) {
  const selected = rows.filter((s) =>
    `${s.name} ${s.phone} ${s.id}`.toLowerCase().includes(filters.query.trim().toLowerCase()) &&
    (filters.grade === "all" || s.grade === filters.grade) &&
    (filters.branch === "all" || s.branch === filters.branch) &&
    (filters.status === "all" || s.status === filters.status) &&
    (filters.balance === "all" || balanceLabel(s.balance) === filters.balance));
  return selected.sort((a, b) => {
    const comparison = sort === "name" ? a.name.localeCompare(b.name, "en") : (a[sort] ?? -1) - (b[sort] ?? -1); // students without a recorded rate sort lowest
    return (descending ? -comparison : comparison) || a.id.localeCompare(b.id);
  });
}

export function contactErrors(name: string, phone: string, guardianPhone: string) {
  return {
    name: name.trim().length < 3 ? "Enter the student's full name." : "",
    phone: !/^01[0125]\d{8}$/.test(phone) ? "Enter an 11-digit Egyptian mobile number starting with 010, 011, 012 or 015." : "",
    guardianPhone: guardianPhone && !/^01[0125]\d{8}$/.test(guardianPhone) ? "The guardian's number is not a valid Egyptian mobile number." : "",
  };
}