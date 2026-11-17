import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, X, Clock3, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Pill } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { classes, students, teacherById } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/attendance")({
  head: pageHead("Attendance", "Mark Present, Absent or Excused for each class session in seconds."),
  component: AttendancePage,
});

type St = "Present" | "Absent" | "Excused";
const opts: { v: St; icon: typeof Check; cls: string }[] = [
  { v: "Present", icon: Check, cls: "data-[on=true]:bg-positive data-[on=true]:text-positive-foreground data-[on=true]:border-positive" },
  { v: "Absent", icon: X, cls: "data-[on=true]:bg-destructive data-[on=true]:text-destructive-foreground data-[on=true]:border-destructive" },
  { v: "Excused", icon: Clock3, cls: "data-[on=true]:bg-warning data-[on=true]:text-primary-foreground data-[on=true]:border-warning" },
];

function AttendancePage() {
  const { t } = useI18n();
  const [classId, setClassId] = useState(classes[0]!.id);
  const [date, setDate] = useState("2026-11-17");
  const [marks, setMarks] = useState<Record<string, St>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const key = `${classId}|${date}`;
  const cls = classes.find((c) => c.id === classId)!;
  const roster = useMemo(() => {
    const enrolled = students.filter((s) => s.classIds.includes(classId) && s.status === "Active");
    return enrolled.length ? enrolled : students.slice(0, cls.enrolled);
  }, [classId, cls.enrolled]);
  const get = (sid: string) => marks[`${key}|${sid}`];
  const set = (sid: string, v: St) => setMarks((m) => ({ ...m, [`${key}|${sid}`]: v }));
  const counts = { Present: 0, Absent: 0, Excused: 0 } as Record<St, number>;
  roster.forEach((s) => { const v = get(s.id); if (v) counts[v]++; });
  const marked = counts.Present + counts.Absent + counts.Excused;
  const done = submitted[key];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("Attendance")} subtitle="Tap once per student. Unmarked students can be set to present in one click." />
      <div className="surface mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_180px]">
        <Select value={classId} onValueChange={setClassId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground sm:col-span-2">
          <span>{t("Teacher")}: <b className="font-medium text-foreground">{teacherById(cls.teacherId).name}</b></span>
          <span>{cls.days} · {cls.time}</span><span>{cls.branch}</span>
          <span className="ms-auto">{done ? <Pill tone="positive">{t("Submitted")}</Pill> : <Pill tone="warning">{t("Draft")}</Pill>}</span>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <Pill tone="positive">{counts.Present} {t("Present")}</Pill><Pill tone="negative">{counts.Absent} {t("Absent")}</Pill><Pill tone="warning">{counts.Excused} {t("Excused")}</Pill>
        <span className="text-muted-foreground num">{marked}/{roster.length} marked</span>
        <Button size="sm" variant="outline" className="ms-auto" disabled={done} onClick={() => roster.forEach((s) => !get(s.id) && set(s.id, "Present"))}><CheckCheck className="size-4" />{t("Mark all present")}</Button>
      </div>
      <div className="surface divide-y">
        {roster.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-5 text-xs text-muted-foreground num">{i + 1}</span>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.id} · {s.attendance}% overall</div></div>
            <div className="flex gap-1.5">
              {opts.map((o) => (
                <button key={o.v} disabled={done} data-on={get(s.id) === o.v} onClick={() => set(s.id, o.v)} aria-label={`${o.v} ${s.name}`}
                  className={cn("flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60", o.cls)}>
                  <o.icon className="size-4" /><span className="hidden sm:inline">{t(o.v)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-4 mt-4 flex justify-end">
        <Button size="lg" disabled={done || marked < roster.length} className="shadow-pop" onClick={() => { setSubmitted((x) => ({ ...x, [key]: true })); toast.success("Attendance submitted", { description: `${counts.Present} present · ${counts.Absent} absent · ${counts.Excused} excused` }); }}>
          {done ? t("Submitted") : marked < roster.length ? `${roster.length - marked} left to mark` : t("Submit")}
        </Button>
      </div>
    </div>
  );
}
