import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { MyCenter } from "@/lib/api/centers";
import type { MembershipRole } from "@/lib/supabase/types";

export type CenterContextValue = {
  center: MyCenter["center"];
  branches: MyCenter["branches"];
  branchNames: string[];
  role: MembershipRole;
  canEditStudents: boolean;
  user: { id: string; email: string; name: string };
  centers: MyCenter[];
  setActiveCenter: (id: string) => void;
};

const Ctx = createContext<CenterContextValue | null>(null);
const KEY = "markazly-center";

export const readStoredCenter = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

/** The signed-in user and the center they are working in. Filled from Supabase by the console layout. */
export function CenterProvider({ centers, user, children }: { centers: MyCenter[]; user: CenterContextValue["user"]; children: ReactNode }) {
  const [activeId, setActiveId] = useState(() => readStoredCenter());
  const current = centers.find((c) => c.center.id === activeId) ?? centers[0]!;
  const value = useMemo<CenterContextValue>(() => ({
    center: current.center,
    branches: current.branches,
    branchNames: current.branches.map((b) => b.name),
    role: current.role,
    canEditStudents: ["owner", "admin", "front_desk"].includes(current.role),
    user,
    centers,
    setActiveCenter: (id) => { setActiveId(id); try { localStorage.setItem(KEY, id); } catch { /* storage may be unavailable */ } },
  }), [current, user, centers]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCenter() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCenter must be used inside CenterProvider");
  return v;
}

export const roleLabel: Record<MembershipRole, string> = { owner: "Owner", admin: "Admin", accountant: "Accountant", front_desk: "Front desk", teacher: "Teacher" };
