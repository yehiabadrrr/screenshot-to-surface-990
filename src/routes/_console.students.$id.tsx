import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Phone, Plus, MessageCircle } from "lucide-react";
import { Panel, Pill, Money } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { studentById, classById, teacherById } from "@/lib/data";
import { balancesAsOf, reversedIds, displayStatus } from "@/lib/ledger";
import { useLedger, todayIso } from "@/lib/ledger-store";
import { RecordPaymentDialog } from "@/components/app/record-payment";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/students/$id")({
  loader: ({ params }) => { const s = studentById(params.id); if (!s) throw notFound(); return { name: s.name }; },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Student"} — CenterOS` },
      { name: "description", content: "Student profile: enrollments, attendance and financial history." },
      { property: "og:title", content: `${loaderData?.name ?? "Student"} — CenterOS` },
      { property: "og:description", content: "Student profile on CenterOS." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { id } = Route.useParams();
  const s = studentById(id)!;
  const { entries } = useLedger();
  const rev = reversedIds(entries);
  const mine = entries.filter((x) => x.studentId === id).sort((a, z) => z.date.localeCompare(a.date) || z.id.localeCompare(a.id));
  const history = mine.filter((x) => x.type !== "Charge").map((x) => ({ id: x.id, type: x.type === "Reversal" ? `Reversal of ${x.reversesId}` : x.type, amount: x.amount, method: x.method ?? x.reason ?? "—", date: x.date, status: displayStatus(x, rev) }));
  const statement = mine.map((x) => ({ id: x.id, type: x.type === "Charge" ? "Tuition charge" : x.type === "Reversal" ? `Reversal of ${x.reversesId}` : x.type, amount: x.amount, method: x.method ?? x.reason ?? (x.classId ? classById(x.classId).name : "—"), date: x.date, status: displayStatus(x, rev) }));
  const paid = mine.filter((x) => x.type === "Payment" && displayStatus(x, rev) === "Completed").reduce((t, x) => t + x.amount, 0);
  const balance = balancesAsOf(entries, todayIso()).get(id) ?? 0;
  const sessions = Array.from({ length: 12 }, (_, i) => ({ d: new Date(Date.UTC(2026, 10, 15) - i * 3.5 * 86400000).toISOString(), st: (i * 7 + id.charCodeAt(5)) % 100 < s.attendance ? "Present" : i % 3 ? "Absent" : "Excused" }));
  const initials = s.name.split(" ").map((p) => p[0]).join("");
  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/students" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4 rtl:rotate-180" /> Students</Link>
      <div className="surface mb-4 flex flex-wrap items-center gap-4 p-5">
        <div className="grid size-14 place-items-center rounded-full bg-accent text-lg font-semibold text-brand">{initials}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2"><h1 className="text-xl font-semibold">{s.name}</h1><Pill tone={s.status === "Active" ? "positive" : "warning"}>{s.status}</Pill></div>
          <div className="mt-0.5 text-sm text-muted-foreground">{s.id} · {s.grade} · {s.branch} · joined {s.joined}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><a href={`https://wa.me/2${s.guardianPhone}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />WhatsApp guardian</a></Button>
          <RecordPaymentDialog studentId={s.id} trigger={<Button><Plus className="size-4" />Record payment</Button>} />
        </div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total paid" value={<Money value={paid} />} />
        <Stat label="Outstanding" value={balance > 0 ? <span className="text-destructive"><Money value={balance} /></span> : balance < 0 ? <span className="text-positive">+<Money value={-balance} /> credit</span> : "Settled"} />
        <Stat label="Attendance" value={`${s.attendance}%`} />
        <Stat label="Enrolled classes" value={s.classIds.length} />
      </div>
      <Tabs defaultValue="overview">
        <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="enroll">Enrollments</TabsTrigger><TabsTrigger value="att">Attendance</TabsTrigger><TabsTrigger value="fin">Financial history</TabsTrigger><TabsTrigger value="guardian">Parent / Guardian</TabsTrigger></TabsList>
        <TabsContent value="overview" className="mt-4 grid gap-4 md:grid-cols-2">
          <Panel title="Personal information"><dl className="grid grid-cols-2 gap-y-3 text-sm">
            {[["Phone", s.phone], ["Grade", s.grade], ["Branch", s.branch], ["Joined", s.joined], ["Guardian", s.guardian], ["Guardian phone", s.guardianPhone]].map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium num">{v}</dd></div>)}
          </dl></Panel>
          <Panel title="Recent transactions" bodyClass="p-0"><TxnList rows={history.slice(0, 4)} /></Panel>
        </TabsContent>
        <TabsContent value="enroll" className="mt-4"><Panel bodyClass="p-0"><ul className="divide-y">
          {s.classIds.map((cid) => { const c = classById(cid); return (
            <li key={cid} className="flex items-center gap-4 px-5 py-3 text-sm"><div className="flex-1"><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{teacherById(c.teacherId).name} · {c.days} · {c.time}</div></div><Pill tone="brand">{c.kind}</Pill><span className="num"><Money value={c.fee} /> / month</span></li>); })}
        </ul></Panel></TabsContent>
        <TabsContent value="att" className="mt-4"><Panel bodyClass="p-0"><ul className="divide-y">
          {sessions.map((x) => <li key={x.d} className="flex items-center justify-between px-5 py-2.5 text-sm"><span>{shortDate(x.d)} · {classById(s.classIds[0]!).name}</span><Pill tone={x.st === "Present" ? "positive" : x.st === "Absent" ? "negative" : "warning"}>{x.st}</Pill></li>)}
        </ul></Panel></TabsContent>
        <TabsContent value="fin" className="mt-4"><Panel bodyClass="p-0"><TxnList rows={statement} /></Panel></TabsContent>
        <TabsContent value="guardian" className="mt-4"><Panel title="Guardian">
          <div className="flex items-center justify-between text-sm"><div><div className="font-medium">{s.guardian}</div><div className="text-muted-foreground num" dir="ltr">{s.guardianPhone}</div></div>
            <div className="flex gap-2"><Button variant="outline" asChild><a href={`tel:${s.guardianPhone}`}><Phone className="size-4" />Call</a></Button><Button variant="outline" asChild><a href={`https://wa.me/2${s.guardianPhone}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" />WhatsApp</a></Button></div></div>
        </Panel></TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="surface p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold num">{value}</div></div>;
}
function TxnList({ rows }: { rows: { id: string; type: string; amount: number; method: string; date: string; status: string }[] }) {
  return <ul className="divide-y">{rows.map((x) => (
    <li key={x.id} className="flex items-center gap-3 px-5 py-2.5 text-sm"><div className="flex-1"><div className="font-medium">{x.type}</div><div className="text-xs text-muted-foreground">{x.id} · {x.method} · {shortDate(x.date)}</div></div>
      <span className={cn("font-medium", x.type === "Payment" ? "text-positive" : "text-muted-foreground")}><Money value={x.amount} /></span></li>))}</ul>;
}
