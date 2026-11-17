import type { CompensationModel } from "./finance";
import { teacherPayout } from "./finance";

let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]!;

export const branches = ["Nasr City", "Heliopolis", "Maadi"] as const;
export type Branch = (typeof branches)[number];

const first = ["Youssef","Omar","Mariam","Malak","Ahmed","Nour","Hana","Ali","Salma","Karim","Farida","Mostafa","Jana","Hamza","Laila","Adham","Rana","Seif","Habiba","Ziad","Judy","Marwan","Tasneem","Yassin","Retaj","Khaled","Logy","Mohamed","Aya","Hussein"];
const last = ["Mahmoud","Hassan","Ibrahim","El-Sayed","Abdelrahman","Farouk","Mansour","Saleh","Fathy","Ragab","Shawky","Naguib","Zaki","Gamal","Hegazy","Soliman","Tawfik","Badawy"];
const phone = () => `01${pick(["0","1","2","5"])}${String(Math.floor(rnd() * 1e8)).padStart(8, "0")}`;

export interface Teacher { id: string; name: string; subject: string; phone: string; branch: Branch; model: CompensationModel; sessions: number; attending: number; collected: number; attendance: number; }
const teacherSeed: [string, string, CompensationModel][] = [
  ["Dr. Hesham Abdelaziz","Physics",{ type: "percentage", percent: 40 }],
  ["Mona El-Sherif","Chemistry",{ type: "percentage", percent: 35 }],
  ["Tarek Fawzy","Mathematics",{ type: "per_student", amount: 45 }],
  ["Rasha Kamel","Biology",{ type: "per_session", amount: 650 }],
  ["Ahmed Galal","Arabic",{ type: "per_student", amount: 35 }],
  ["Sarah Mitchell","IELTS",{ type: "monthly", amount: 14000 }],
  ["Nermeen Adel","English",{ type: "per_session", amount: 500 }],
  ["Walid Samir","French",{ type: "monthly", amount: 11000 }],
  ["Amr Lotfy","Mathematics",{ type: "percentage", percent: 45 }],
  ["Dina Mourad","German",{ type: "per_session", amount: 550 }],
  ["Hossam Reda","History",{ type: "per_student", amount: 30 }],
  ["Ingy Wahba","English",{ type: "monthly", amount: 9500 }],
];
export const teachers: Teacher[] = teacherSeed.map(([name, subject, model], i) => ({
  id: `T-${101 + i}`, name, subject, model, phone: phone(), branch: branches[i % 3]!,
  sessions: 10 + Math.floor(rnd() * 10), attending: 120 + Math.floor(rnd() * 160),
  collected: 18000 + Math.floor(rnd() * 26000), attendance: 90 + Math.floor(rnd() * 10),
}));
export const payableOf = (t: Teacher) => teacherPayout(t.model, { sessions: t.sessions, attendingStudentSessions: t.attending, collectedTuition: t.collected });

export interface ClassItem { id: string; name: string; kind: "Tutoring" | "Language course"; teacherId: string; branch: Branch; days: string; time: string; capacity: number; enrolled: number; fee: number; revenue: number; attendance: number; }
const classSeed: [string, number, ClassItem["kind"], number][] = [
  ["Physics · Thanaweya 3",0,"Tutoring",450],["Physics · Thanaweya 2",0,"Tutoring",400],["Chemistry · Thanaweya 3",1,"Tutoring",450],
  ["Math · Thanaweya 3 (Pure)",2,"Tutoring",420],["Math · Prep 3",8,"Tutoring",300],["Biology · Thanaweya 3",3,"Tutoring",420],
  ["Arabic · Thanaweya 3",4,"Tutoring",350],["IELTS Academic · Band 7",5,"Language course",2800],["General English B1",6,"Language course",1600],
  ["French A2",7,"Language course",1700],["Math · Thanaweya 1",8,"Tutoring",320],["German A1",9,"Language course",1800],
  ["History · Thanaweya 3",10,"Tutoring",300],["English Conversation",11,"Language course",1400],["Chemistry · Thanaweya 2",1,"Tutoring",380],
  ["Kids English · Level 2",11,"Language course",1200],["Physics · Prep 3",0,"Tutoring",280],["IELTS General",5,"Language course",2500],
];
const dayOpts = ["Sat · Tue","Sun · Wed","Mon · Thu","Sat · Wed","Fri"];
const timeOpts = ["3:00 PM","4:30 PM","6:00 PM","7:30 PM","9:00 PM"];
export const classes: ClassItem[] = classSeed.map(([name, ti, kind, fee], i) => {
  const capacity = kind === "Tutoring" ? 30 : 14;
  const enrolled = Math.max(6, capacity - Math.floor(rnd() * 10));
  return { id: `C-${201 + i}`, name, kind, teacherId: teachers[ti]!.id, branch: teachers[ti]!.branch, days: dayOpts[i % 5]!, time: timeOpts[(i * 2) % 5]!, capacity, enrolled, fee, revenue: enrolled * fee, attendance: 84 + Math.floor(rnd() * 15) };
});

export interface Student { id: string; name: string; phone: string; guardian: string; guardianPhone: string; classIds: string[]; balance: number; paid: number; attendance: number; status: "Active" | "Paused" | "Inactive"; branch: Branch; grade: string; joined: string; }
export const students: Student[] = Array.from({ length: 300 }, (_, i) => {
  const ln = pick(last);
  const cls = [pick(classes)]; if (rnd() > 0.55) cls.push(pick(classes));
  const ids = [...new Set(cls.map((c) => c.id))];
  const r = rnd();
  const balance = r < 0.22 ? Math.round((150 + rnd() * 1100) / 50) * 50 : r < 0.3 ? -Math.round((100 + rnd() * 500) / 50) * 50 : 0;
  const status: Student["status"] = i < 284 ? "Active" : i < 292 ? "Paused" : "Inactive";
  return {
    id: `S-${String(1001 + i)}`, name: `${pick(first)} ${ln}`, phone: phone(), guardian: `${pick(["Mohamed","Ahmed","Hany","Sherif","Amal","Rania","Ashraf","Ehab"])} ${ln}`, guardianPhone: phone(),
    classIds: ids, balance, paid: ids.reduce((s, id) => s + classes.find((c) => c.id === id)!.fee, 0) * (2 + Math.floor(rnd() * 3)),
    attendance: 70 + Math.floor(rnd() * 30), status, branch: pick([...branches]),
    grade: pick(["Thanaweya 3","Thanaweya 2","Thanaweya 1","Prep 3","Adult"]),
    joined: `2026-${String(1 + Math.floor(rnd() * 10)).padStart(2, "0")}-${String(1 + Math.floor(rnd() * 27)).padStart(2, "0")}`,
  };
});

export const methods = ["Cash", "InstaPay", "Fawry", "Bank transfer", "Other"] as const;
export interface Txn { id: string; studentId: string; type: "Payment" | "Refund" | "Discount"; amount: number; method: (typeof methods)[number]; date: string; status: "Completed" | "Pending" | "Reversed"; }
export const transactions: Txn[] = Array.from({ length: 60 }, (_, i) => {
  const s = students[Math.floor(rnd() * 284)]!;
  const r = rnd();
  const type: Txn["type"] = r < 0.88 ? "Payment" : r < 0.94 ? "Discount" : "Refund";
  const d = new Date(Date.UTC(2026, 10, 17) - i * 0.4 * 86400000);
  return { id: `TX-${8840 - i}`, studentId: s.id, type, amount: Math.round((type === "Payment" ? 300 + rnd() * 2500 : 100 + rnd() * 400) / 50) * 50,
    method: pick([...methods, "Cash", "InstaPay", "Cash"] as Txn["method"][]), date: d.toISOString(), status: rnd() < 0.9 ? "Completed" : rnd() < 0.7 ? "Pending" : "Reversed" };
});

export const studentById = (id: string) => students.find((s) => s.id === id);
export const teacherById = (id: string) => teachers.find((t) => t.id === id)!;
export const classById = (id: string) => classes.find((c) => c.id === id)!;

export const monthly = [
  { m: "Jun", revenue: 168000, collected: 151000, students: 241, attendance: 89.2 },
  { m: "Jul", revenue: 174000, collected: 158500, students: 252, attendance: 90.1 },
  { m: "Aug", revenue: 181500, collected: 162000, students: 259, attendance: 88.4 },
  { m: "Sep", revenue: 198000, collected: 171000, students: 268, attendance: 91.3 },
  { m: "Oct", revenue: 214000, collected: 176500, students: 277, attendance: 92.0 },
  { m: "Nov", revenue: 227000, collected: 185000, students: 284, attendance: 92.6 },
];

export const kpis = {
  revenue: 227000, revenuePrev: 214000,
  collected: 185000, collectedPrev: 176500,
  outstanding: 42000, outstandingPrev: 37500,
  active: 284, activePrev: 277,
  attendance: 92.6, attendancePrev: 92.0,
  payables: teachers.reduce((s, t) => s + payableOf(t), 0), payablesPrev: 118400,
};
