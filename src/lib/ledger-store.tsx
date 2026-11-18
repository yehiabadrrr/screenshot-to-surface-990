import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { seedLedger, LEDGER_MONTHS } from "./ledger-seed";
import { appendPayment, correctEntry, periodFilter, comparisonFilter, type Filter, type LedgerEntry, type NewPayment } from "./ledger";
import { staff } from "./data";

/** Signed-in user in the demo (no real auth yet). */
export const CURRENT_USER = { name: staff.owner, role: "Owner" };

export const todayIso = () => new Date().toISOString().slice(0, 10);

interface Store {
  entries: LedgerEntry[];
  period: string; setPeriod: (p: string) => void;
  branch: string; setBranch: (b: string) => void;
  months: string[];
  filter: Filter; compare: Filter; today: string;
  recordPayment: (p: Omit<NewPayment, "enteredBy">) => LedgerEntry;
  correct: (id: string, opts: { reason: string; correctedAmount?: number }) => { reversal: LedgerEntry; replacement?: LedgerEntry };
}

const Ctx = createContext<Store | null>(null);

/**
 * In-memory demo ledger shared by every console page. Nothing is persisted:
 * a refresh restores the sample data.
 */
export function LedgerProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LedgerEntry[]>(seedLedger);
  const [period, setPeriod] = useState(LEDGER_MONTHS[LEDGER_MONTHS.length - 1]!);
  const [branch, setBranch] = useState("all");
  const today = todayIso();
  const filter = useMemo(() => periodFilter(period, branch, today), [period, branch, today]);
  const compare = useMemo(() => comparisonFilter(filter), [filter]);

  // Writes compute from the latest entries synchronously so callers get the created IDs back.
  const ref = useRef(entries);
  ref.current = entries;
  const recordPayment = useCallback<Store["recordPayment"]>((p) => {
    const r = appendPayment(ref.current, { ...p, enteredBy: CURRENT_USER.name });
    ref.current = r.entries; setEntries(r.entries);
    return r.entry;
  }, []);
  const correct = useCallback<Store["correct"]>((id, opts) => {
    const r = correctEntry(ref.current, id, { ...opts, by: CURRENT_USER.name, date: todayIso() });
    ref.current = r.entries; setEntries(r.entries);
    return { reversal: r.reversal, ...(r.replacement ? { replacement: r.replacement } : {}) };
  }, []);

  const value = { entries, period, setPeriod, branch, setBranch, months: LEDGER_MONTHS, filter, compare, today, recordPayment, correct };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLedger() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLedger must be used inside LedgerProvider");
  return v;
}

export const monthLabel = (ym: string, lang: "en" | "ar" = "en") =>
  new Date(`${ym}-15T00:00:00Z`).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
