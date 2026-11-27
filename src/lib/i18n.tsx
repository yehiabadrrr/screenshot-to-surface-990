import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";

import { arExtra } from "./i18n-ar";
import { arUi } from "./i18n-ar-ui";

const arBase: Record<string, string> = {
  Overview: "نظرة عامة",
  Students: "الطلاب",
  "Classes & Courses": "الفصول والكورسات",
  Attendance: "الحضور",
  "Payments & Finance": "المدفوعات والمالية",
  "Teacher Management": "إدارة المدرسين",
  "Reports & Analytics": "التقارير والتحليلات",
  Communications: "التواصل",
  Settings: "الإعدادات",
  Search: "بحث",
  "All branches": "كل الفروع",
  "Total Revenue": "إجمالي الإيرادات",
  "Collected Payments": "المدفوعات المحصلة",
  "Outstanding Balances": "الأرصدة المستحقة",
  "Active Students": "الطلاب النشطون",
  "Attendance Rate": "نسبة الحضور",
  "Teacher Payables": "مستحقات المدرسين",
  "vs last month": "مقارنة بالشهر الماضي",
  "Revenue vs collections": "الإيرادات مقابل التحصيل",
  "Enrollment trend": "اتجاه التسجيل",
  "Attendance trend": "اتجاه الحضور",
  "Revenue by class": "الإيرادات حسب الفصل",
  "Recent transactions": "أحدث المعاملات",
  "Overdue payments": "مدفوعات متأخرة",
  "Upcoming classes": "الحصص القادمة",
  "Top classes": "أفضل الفصول",
  "Quick actions": "إجراءات سريعة",
  "Record payment": "تسجيل دفعة",
  "Add student": "إضافة طالب",
  "Mark attendance": "تسجيل الحضور",
  "Send reminders": "إرسال تذكيرات",
  "Good evening": "مساء الخير",
  Export: "تصدير",
  Import: "استيراد",
  Name: "الاسم",
  Phone: "الهاتف",
  Balance: "الرصيد",
  Status: "الحالة",
  Classes: "الفصول",
  Active: "نشط",
  Inactive: "غير نشط",
  Paused: "متوقف",
  Present: "حاضر",
  Absent: "غائب",
  Excused: "بعذر",
  "Mark all present": "تحديد الكل حاضر",
  Submit: "إرسال",
  Submitted: "تم الإرسال",
  Draft: "مسودة",
  Teacher: "المدرس",
  Date: "التاريخ",
  Class: "الفصل",
  Amount: "المبلغ",
  Method: "طريقة الدفع",
  Type: "النوع",
  Student: "الطالب",
  Save: "حفظ",
  Cancel: "إلغاء",
  "Sign in": "تسجيل الدخول",
  Email: "البريد الإلكتروني",
  Password: "كلمة المرور",
  "Remember me": "تذكرني",
  "Forgot password?": "نسيت كلمة المرور؟",
  "New class": "فصل جديد",
  Schedule: "الجدول",
  Branch: "الفرع",
  Capacity: "السعة",
  Payable: "المستحق",
  Language: "اللغة",
  Revenue: "الإيرادات",
  Collections: "التحصيل",
  "Branch comparison": "مقارنة الفروع",
  Templates: "القوالب",
  "Send on WhatsApp": "إرسال عبر واتساب",
};

const ar: Record<string, string> = { ...arBase, ...arExtra, ...arUi };

const Ctx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: string, v?: Record<string, string | number>) => string;
}>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem("centeros-lang");
    if (saved === "ar" || saved === "en") setLangState(saved);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("centeros-lang", l);
  };
  const t = (k: string, v?: Record<string, string | number>) => {
    const base = lang === "ar" ? (ar[k] ?? k) : k;
    return v ? base.replace(/\{(\w+)\}/g, (m, n: string) => (n in v ? String(v[n]) : m)) : base;
  };
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
