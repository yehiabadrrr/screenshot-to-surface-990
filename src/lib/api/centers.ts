import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/lib/supabase/auth-middleware";
import type { BranchRow, CenterRow, MembershipRole } from "@/lib/supabase/types";
import { createCenterInput } from "@/lib/students/schema";

export type MyCenter = {
  center: Pick<CenterRow, "id" | "name" | "is_demo">;
  role: MembershipRole;
  branches: Pick<BranchRow, "id" | "name">[];
};

/** Centers the signed-in user belongs to, with role and branches. RLS limits every query to them. */
export const getMyCenters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyCenter[]> => {
    const { supabase, user } = context;
    const { data: memberships, error } = await supabase
      .from("memberships")
      .select("center_id, role")
      .eq("user_id", user.id);
    if (error) throw new Error("Could not load your centers.");
    if (!memberships?.length) return [];
    const ids = memberships.map((m) => m.center_id);
    const [{ data: centers, error: cErr }, { data: branches, error: bErr }] = await Promise.all([
      supabase.from("centers").select("id, name, is_demo").in("id", ids).order("created_at"),
      supabase
        .from("branches")
        .select("id, name, center_id")
        .in("center_id", ids)
        .order("created_at"),
    ]);
    if (cErr || bErr) throw new Error("Could not load your centers.");
    return (centers ?? []).map((c) => ({
      center: c,
      role: memberships.find((m) => m.center_id === c.id)!.role,
      branches: (branches ?? [])
        .filter((b) => b.center_id === c.id)
        .map((b) => ({ id: b.id, name: b.name })),
    }));
  });

/** Creates a customer center (never a demo center) with the caller as owner. */
export const createCenter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => createCenterInput.parse(d))
  .handler(async ({ data, context }): Promise<string> => {
    const { data: id, error } = await context.supabase.rpc("create_center", {
      p_name: data.name,
      p_branches: data.branches,
    });
    if (error || !id) throw new Error(error?.message ?? "Could not create the center.");
    return id;
  });
