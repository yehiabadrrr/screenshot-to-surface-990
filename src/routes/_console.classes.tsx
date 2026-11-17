import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Pill, Money } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { classes, teacherById, teachers, branches, type ClassItem } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/classes")({
  head: pageHead("Classes & Courses", "Tutoring groups and language courses with teachers, schedules and capacity."),
  component: ClassesPage,
});

function ClassesPage() {
  const { t } = useI18n();
  const [kind, setKind] = useState("all");
  const [edit, setEdit] = useState<ClassItem | null | "new">(null);
  const rows = classes.filter((c) => kind === "all" || c.kind === kind);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={t("Classes & Courses")} subtitle={`${classes.length} active classes · ${classes.reduce((s, c) => s + c.enrolled, 0)} enrollments`}
        actions={<Button onClick={() => setEdit("new")}><Plus className="size-4" />{t("New class")}</Button>} />
      <Tabs value={kind} onValueChange={setKind} className="mb-4"><TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="Tutoring">Tutoring</TabsTrigger><TabsTrigger value="Language course">Language courses</TabsTrigger></TabsList></Tabs>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((c) => {
          const fill = c.enrolled / c.capacity;
          return (
            <div key={c.id} className="surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div><div className="font-semibold">{c.name}</div><div className="mt-0.5 text-xs text-muted-foreground">{teacherById(c.teacherId).name}</div></div>
                <button aria-label="Edit class" onClick={() => setEdit(c)} className="rounded p-1.5 text-muted-foreground hover:bg-muted"><Pencil className="size-3.5" /></button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5"><Pill tone={c.kind === "Tutoring" ? "brand" : "positive"}>{c.kind}</Pill><Pill>{c.branch}</Pill></div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div><div className="text-muted-foreground">{t("Schedule")}</div><div className="mt-0.5 font-medium">{c.days}</div><div className="num">{c.time}</div></div>
                <div><div className="text-muted-foreground">Fee / month</div><div className="mt-0.5 font-medium"><Money value={c.fee} /></div></div>
                <div><div className="text-muted-foreground">{t("Revenue")}</div><div className="mt-0.5 font-medium"><Money value={c.revenue} /></div></div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">{t("Capacity")}</span><span className="num font-medium">{c.enrolled}/{c.capacity}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className={cn("h-full rounded-full", fill > 0.9 ? "bg-warning" : "bg-brand")} style={{ width: `${fill * 100}%` }} /></div>
              </div>
            </div>
          );
        })}
      </div>
      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit === "new" ? t("New class") : "Edit class"}</DialogTitle></DialogHeader>
          {edit !== null && (() => { const c = edit === "new" ? undefined : edit; return (
            <form key={c?.id ?? "new"} className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); toast.success(c ? "Class updated" : "Class created"); setEdit(null); }}>
              <div className="space-y-1.5 sm:col-span-2"><Label>Name</Label><Input required defaultValue={c?.name} placeholder="Physics · Thanaweya 3" /></div>
              <div className="space-y-1.5"><Label>Type</Label><Select defaultValue={c?.kind ?? "Tutoring"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Tutoring">Tutoring</SelectItem><SelectItem value="Language course">Language course</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label>{t("Teacher")}</Label><Select {...(c ? { defaultValue: c.teacherId } : {})}><SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger><SelectContent>{teachers.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>{t("Branch")}</Label><Select defaultValue={c?.branch ?? branches[0]}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>{t("Capacity")}</Label><Input type="number" defaultValue={c?.capacity ?? 30} /></div>
              <div className="space-y-1.5"><Label>Days</Label><Input defaultValue={c?.days} placeholder="Sat · Tue" /></div>
              <div className="space-y-1.5"><Label>Time</Label><Input defaultValue={c?.time} placeholder="6:00 PM" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Monthly fee (EGP)</Label><Input type="number" defaultValue={c?.fee} /></div>
              <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setEdit(null)}>{t("Cancel")}</Button><Button type="submit">{t("Save")}</Button></DialogFooter>
            </form>); })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
