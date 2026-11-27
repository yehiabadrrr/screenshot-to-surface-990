import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { LedgerProvider, useLedger } from "./ledger-store";
import { reportingMonths } from "./business-date";
import { cairoToday } from "./business-date";

const user = { name: "Owner", role: "Owner" };
const wrap = (demo: boolean) => ({ children }: { children: ReactNode }) => <LedgerProvider students={[]} demo={demo} currentUser={user}>{children}</LedgerProvider>;

describe("ledger store catalog and periods", () => {
  it("gives customer centers no sample classes, teachers, rules or payables inputs", () => {
    const { result } = renderHook(() => useLedger(), { wrapper: wrap(false) });
    expect(result.current.classes).toEqual([]);
    expect(result.current.teachers).toEqual([]);
    expect(result.current.classById("C-201")).toBeUndefined();
    expect(result.current.entries).toEqual([]);
  });
  it("keeps the sample catalog for the Demo Center only", () => {
    const { result } = renderHook(() => useLedger(), { wrapper: wrap(true) });
    expect(result.current.classes).toHaveLength(18);
    expect(result.current.teachers).toHaveLength(12);
    expect(result.current.classById("C-201")?.name).toBe("Physics · Thanaweya 3");
  });
  it("offers a rolling 12-month window ending with the current Cairo month", () => {
    const { result } = renderHook(() => useLedger(), { wrapper: wrap(false) });
    expect(result.current.months).toEqual(reportingMonths(cairoToday(), 12));
    expect(result.current.period).toBe(cairoToday().slice(0, 7));
  });
});
