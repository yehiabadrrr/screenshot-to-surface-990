import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, Users, BookOpen, CalendarCheck, Wallet, GraduationCap, BarChart3, MessageSquare, Settings,
  ChevronsUpDown, PanelLeftClose, PanelLeftOpen, Languages, MoreHorizontal, Menu, Bell, Sun, Moon, Check,
  MapPin, LogOut, ChevronDown, Clock3, PackageOpen, Hourglass, CircleAlert,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useLedger, monthLabel } from "@/lib/ledger-store";
import { useAttention } from "@/lib/attention";
import { initials } from "@/lib/center-config";
import { useCenter, roleLabel } from "@/lib/center-context";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { fmtNum } from "@/lib/l10n";
import { Logo } from "./logo";
import { CommandSearch } from "./command-search";
import { Avatar } from "./ui";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard, group: "Daily operations" },
  { to: "/students", label: "Students", icon: Users, group: "Daily operations" },
  { to: "/classes", label: "Classes", icon: BookOpen, group: "Daily operations" },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck, group: "Daily operations" },
  { to: "/finance", label: "Finance", icon: Wallet, group: "Back office" },
  { to: "/teachers", label: "Teachers", icon: GraduationCap, group: "Back office" },
  { to: "/reports", label: "Reports", icon: BarChart3, group: "Back office" },
  { to: "/communications", label: "Communications", icon: MessageSquare, group: "Back office" },
  { to: "/settings", label: "Settings", icon: Settings, group: "System" },
] as const;
const groups = ["Daily operations", "Back office", "System"] as const;
const bottomNav = nav.filter((item) => ["/overview", "/students", "/attendance", "/finance"].includes(item.to));

/** Header title and contextual subtitle per route. The page itself adds live context below. */
const pageMeta: { match: (p: string) => boolean; title: string; subtitle: string }[] = [
  { match: (p) => p.startsWith("/students/"), title: "Student profile", subtitle: "Enrollments, attendance and ledger" },
  { match: (p) => p === "/overview", title: "Overview", subtitle: "Your center at a glance" },
  { match: (p) => p === "/students", title: "Students", subtitle: "Directory, balances and enrollments" },
  { match: (p) => p === "/classes", title: "Classes", subtitle: "Groups, schedules and billing rules" },
  { match: (p) => p === "/attendance", title: "Attendance", subtitle: "Mark sessions and post billing" },
  { match: (p) => p === "/finance", title: "Finance", subtitle: "Ledger, collections and receivables" },
  { match: (p) => p === "/teachers", title: "Teachers", subtitle: "Teaching staff and pay models" },
  { match: (p) => p === "/reports", title: "Reports", subtitle: "Analytics and exports" },
  { match: (p) => p === "/communications", title: "Communications", subtitle: "Guardian and student messaging" },
  { match: (p) => p === "/settings", title: "Settings", subtitle: "Center profile and preferences" },
];
const PERIOD_ROUTES = ["/overview", "/finance"];

const isActive = (path: string, to: string) => path === to || path.startsWith(to + "/");

function BranchMenu({ variant }: { variant: "sidebar" | "header" }) {
  const { t, lang } = useI18n();
  const { branch, setBranch } = useLedger();
  const { center, branchNames, centers, setActiveCenter } = useCenter();
  const label = t(branch === "all" ? "All branches" : branch);
  return (
    <DropdownMenu dir={lang === "ar" ? "rtl" : "ltr"}>
      <DropdownMenuTrigger asChild>
        {variant === "sidebar" ? (
          <button type="button" className="flex w-full items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent px-2.5 py-2 text-start text-sidebar-accent-foreground outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sidebar-ring">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-teal-bright/20 text-xs font-bold text-teal-bright">{initials(center.name)}</span>
            <span className="min-w-0 flex-1"><bdi className="block truncate text-[13px] font-semibold">{center.name}</bdi><span className="flex items-center gap-1 truncate text-[11px] text-sidebar-muted"><MapPin className="size-3 shrink-0" />{label}</span></span>
            <ChevronsUpDown className="size-4 shrink-0 text-sidebar-muted" />
          </button>
        ) : (
          <Button variant="outline" size="sm" className="h-9 gap-1.5 bg-card px-2.5 font-normal" aria-label={t("Branch")}>
            <MapPin className="size-3.5 text-muted-foreground" /><span className="max-w-28 truncate">{label}</span><ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t("Branch")}</DropdownMenuLabel>
        {["all", ...branchNames].map((item) => (
          <DropdownMenuItem key={item} onClick={() => setBranch(item)} className="justify-between">
            <bdi>{t(item === "all" ? "All branches" : item)}</bdi>{branch === item && <Check className="size-4 text-brand" />}
          </DropdownMenuItem>
        ))}
        {centers.length > 1 && <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">{t("Switch center")}</DropdownMenuLabel>
          {centers.map((c) => (
            <DropdownMenuItem key={c.center.id} onClick={() => { setBranch("all"); setActiveCenter(c.center.id); }} className="justify-between">
              <bdi className="truncate">{c.center.name}</bdi>{c.center.id === center.id && <Check className="size-4 text-brand" />}
            </DropdownMenuItem>
          ))}
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarBody({ collapsed, onNav }: { collapsed: boolean; onNav?: () => void }) {
  const { t } = useI18n();
  const { user, role } = useCenter();
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <div className="bg-sidebar-gradient flex h-full flex-col text-sidebar-foreground">
      <div className={cn("flex h-16 shrink-0 items-center gap-3 px-5", collapsed && "justify-center px-0")}>
        <Logo className="size-9 shrink-0" />
        {!collapsed && <div className="min-w-0"><div className="font-display text-lg font-extrabold leading-tight tracking-tight text-white">Markazly</div><div className="text-[10px] font-medium uppercase text-sidebar-muted">{t("Center management")}</div></div>}
      </div>
      {!collapsed && <div className="px-3 pb-4"><BranchMenu variant="sidebar" /></div>}
      <nav aria-label={t("Main navigation")} className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {groups.map((group) => (
          <div key={group} className="mb-4">
            {collapsed ? <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" /> : <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase text-sidebar-muted">{t(group)}</div>}
            <ul className="space-y-0.5">
              {nav.filter((item) => item.group === group).map((item) => {
                const active = isActive(path, item.to);
                return (
                  <li key={item.to}>
                    <Link to={item.to} onClick={onNav} aria-current={active ? "page" : undefined} title={collapsed ? t(item.label) : undefined}
                      className={cn(
                        "group relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                        active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_6px_16px_-6px_oklch(0.498_0.122_253/0.7)]" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white",
                        collapsed && "justify-center px-0",
                      )}>
                      <item.icon className={cn("size-[18px] shrink-0", active ? "text-white" : "text-sidebar-muted group-hover:text-white")} />
                      {!collapsed && <span className="truncate">{t(item.label)}</span>}
                      {active && !collapsed && <span className="ms-auto size-1.5 rounded-full bg-teal-bright" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className={cn("flex shrink-0 items-center gap-2.5 border-t border-sidebar-border p-4", collapsed && "justify-center px-0")}>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/12 text-xs font-semibold text-white ring-2 ring-white/10">{initials(user.name)}</span>
        {!collapsed && <div className="min-w-0"><bdi className="block truncate text-[13px] font-semibold text-white">{user.name}</bdi><div className="truncate text-[11px] text-sidebar-muted">{t(roleLabel[role])}</div></div>}
      </div>
    </div>
  );
}

function PeriodSelect() {
  const { period, setPeriod, months } = useLedger();
  const { t, lang } = useI18n();
  return (
    <Select value={period} onValueChange={setPeriod} dir={lang === "ar" ? "rtl" : "ltr"}>
      <SelectTrigger className="h-9 w-auto min-w-36 gap-1.5 bg-card" aria-label={t("Period")}><Clock3 className="size-3.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
      <SelectContent>{[...months].reverse().map((m) => <SelectItem key={m} value={m}>{monthLabel(m, lang)}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function Notifications() {
  const { t, lang } = useI18n();
  const { findStudent, classes } = useLedger();
  const a = useAttention();
  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? id;
  const rows: { key: string; icon: typeof Bell; tone: string; title: ReactNode; detail: ReactNode; link: ReactNode }[] = [];
  for (const c of a.unfinalized.slice(0, 3)) rows.push({ key: `att-${c.id}`, icon: CalendarCheck, tone: "bg-warning-soft text-warning", title: <bdi>{c.name}</bdi>, detail: t("Started today · attendance not finalized"), link: <Link to="/attendance" search={{ classId: c.id, date: a.today }} className="absolute inset-0" aria-label={t("Open attendance")} /> });
  if (a.pending.count > 0) rows.push({ key: "pending", icon: Hourglass, tone: "bg-warning-soft text-warning", title: t("{n} payments awaiting confirmation", { n: fmtNum(a.pending.count, lang) }), detail: <>{t("Not counted as collected")} · <bdi className="num">{formatMoney(a.pending.amount, lang)}</bdi></>, link: <Link to="/finance" className="absolute inset-0" aria-label={t("Open finance")} /> });
  for (const p of a.lowPackages.slice(0, 2)) rows.push({ key: `pkg-${p.studentId}-${p.classId}`, icon: PackageOpen, tone: "bg-tint-lavender text-tint-lavender-ink", title: <bdi>{findStudent(p.studentId)?.name ?? p.studentId}</bdi>, detail: <>{t(p.remaining === 0 ? "Package used up" : "{n} package session left", { n: fmtNum(p.remaining, lang) })} · <bdi>{className(p.classId)}</bdi></>, link: <Link to="/students/$id" params={{ id: p.studentId }} search={{ tab: "enroll" }} className="absolute inset-0" aria-label={t("Open profile")} /> });
  if (a.owing.length > 0) rows.push({ key: "owing", icon: CircleAlert, tone: "bg-negative-soft text-destructive", title: t("{n} students have an outstanding balance", { n: fmtNum(a.owing.length, lang) }), detail: t("As of the end of the selected period"), link: <Link to="/students" className="absolute inset-0" aria-label={t("Open students")} /> });
  const badge = a.ready ? a.count : 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9 text-muted-foreground" aria-label={badge ? t("Notifications · {n} items need attention", { n: fmtNum(badge, lang) }) : t("Notifications")}>
          <Bell />
          {badge > 0 && <span className="absolute end-1 top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 text-white ring-2 ring-card num">{badge > 9 ? "9+" : badge}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between border-b px-4 py-3"><div className="text-sm font-semibold">{t("Needs attention")}</div><span className="text-[11px] text-muted-foreground">{t("From live sample data")}</span></div>
        {rows.length ? (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {rows.map((r) => (
              <li key={r.key} className="relative flex gap-3 px-4 py-3 hover:bg-muted/60">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", r.tone)}><r.icon className="size-4" /></span>
                <div className="min-w-0"><div className="truncate text-[13px] font-medium">{r.title}</div><div className="mt-0.5 text-xs text-muted-foreground">{r.detail}</div></div>
                {r.link}
              </li>
            ))}
          </ul>
        ) : <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("Nothing requires attention")}</p>}
      </PopoverContent>
    </Popover>
  );
}

function UserMenu() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const { user, role, center } = useCenter();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const leave = async () => {
    await signOut();
    queryClient.clear(); // no data from this session survives sign-out
    void navigate({ to: "/", replace: true });
  };
  return (
    <DropdownMenu dir={lang === "ar" ? "rtl" : "ltr"}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-2 px-1.5 lg:pe-2.5" aria-label={t("Account menu")}>
          <Avatar name={user.name} size="sm" />
          <span className="hidden min-w-0 text-start lg:block"><bdi className="block max-w-32 truncate text-[13px] font-semibold leading-tight">{user.name}</bdi><span className="block text-[11px] leading-tight text-muted-foreground">{t(roleLabel[role])}</span></span>
          <ChevronDown className="hidden size-3.5 text-muted-foreground lg:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal"><bdi className="block text-sm font-semibold">{user.name}</bdi><bdi className="block truncate text-xs text-muted-foreground" dir="ltr">{user.email}</bdi><span className="text-xs text-muted-foreground">{t(roleLabel[role])} · <bdi>{center.name}</bdi></span></DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/settings"><Settings />{t("Settings")}</Link></DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLang(lang === "en" ? "ar" : "en")}><Languages />{lang === "en" ? "العربية" : "English"}</DropdownMenuItem>
        <DropdownMenuItem onClick={toggle}>{theme === "dark" ? <Sun /> : <Moon />}{t(theme === "dark" ? "Light mode" : "Dark mode")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void leave()}><LogOut className="rtl:-scale-x-100" />{t("Sign out")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** True from 1024px up. Below that (tablet) the desktop sidebar rests collapsed to icons. */
function useWideLayout() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return wide;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { demo } = useLedger();
  const [userCollapsed, setCollapsed] = useState(false);
  const wide = useWideLayout();
  const collapsed = userCollapsed || !wide;
  const [more, setMore] = useState(false);
  const { lang, setLang, t } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();
  const path = useRouterState({ select: (r) => r.location.pathname });
  useEffect(() => { try { setCollapsed(localStorage.getItem("centeros-sidebar-collapsed") === "true"); } catch { /* Storage may be unavailable. */ } }, []);
  const toggle = () => setCollapsed((value) => { const next = !value; try { localStorage.setItem("centeros-sidebar-collapsed", String(next)); } catch { /* Still usable without storage. */ } return next; });
  const meta = pageMeta.find((m) => m.match(path)) ?? pageMeta[1]!;
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside aria-label={t("Sidebar")} className={cn("sticky top-0 hidden h-screen shrink-0 motion-safe:transition-[width] motion-safe:duration-200 md:block", collapsed ? "w-[4.5rem]" : "w-64")}>
        <SidebarBody collapsed={collapsed} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex min-h-16 items-center gap-2 px-page-mobile md:gap-3 md:px-6 lg:px-8">
            <Button variant="ghost" size="icon" aria-label={t("Toggle sidebar")} title={t("Toggle sidebar")} aria-expanded={!collapsed} className="hidden size-9 text-muted-foreground lg:inline-flex" onClick={toggle}>
              {collapsed ? <PanelLeftOpen className="rtl:-scale-x-100" /> : <PanelLeftClose className="rtl:-scale-x-100" />}
            </Button>
            <Button variant="ghost" size="icon" aria-label={t("Main navigation")} className="size-9 md:hidden" onClick={() => setMore(true)}><Menu /></Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-bold leading-tight tracking-tight text-foreground sm:text-page-title">{t(meta.title)}</h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">{t(meta.subtitle)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <CommandSearch />
              {PERIOD_ROUTES.includes(path) && <div className="hidden xl:block"><PeriodSelect /></div>}
              <div className="hidden md:block"><BranchMenu variant="header" /></div>
              <Button variant="ghost" size="sm" onClick={() => setLang(lang === "en" ? "ar" : "en")} className="hidden h-9 gap-1.5 px-2.5 text-muted-foreground sm:inline-flex" aria-label={lang === "en" ? "التبديل إلى العربية" : "Switch to English"}>
                <Languages /><span className="hidden text-[13px] lg:inline">{lang === "en" ? "العربية" : "EN"}</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="hidden size-9 text-muted-foreground sm:inline-flex" aria-label={t(theme === "dark" ? "Light mode" : "Dark mode")} title={t(theme === "dark" ? "Light mode" : "Dark mode")}>
                {theme === "dark" ? <Sun /> : <Moon />}
              </Button>
              <Notifications />
              <div className="hidden h-6 w-px bg-border sm:block" />
              <UserMenu />
            </div>
          </div>
          {/* Students persist; classes, ledger and attendance are still demo data in Phase 1. */}
          <div className="flex items-center justify-center gap-1.5 border-t border-warning/25 bg-warning-soft px-4 py-1 text-[11px] text-foreground" title={t("Classes, payments and attendance are demo data and reset on refresh. Student records are saved.")}>
            <span className="size-1.5 shrink-0 rounded-full bg-warning" /><span className="font-semibold">{t(demo ? "Demo Center" : "Demo data")}</span><span className="hidden text-muted-foreground sm:inline">· {t("Classes, payments and attendance are demo data and reset on refresh. Student records are saved.")}</span>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-page-mobile pt-5 pb-28 md:px-6 md:pt-7 md:pb-10 lg:px-8">{children}</main>
        <nav aria-label={t("Mobile navigation")} className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/95 backdrop-blur md:hidden">
          {bottomNav.map((item) => {
            const active = isActive(path, item.to);
            const label = item.to === "/finance" ? "Payments" : item.label;
            return (
              <Link key={item.to} to={item.to} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[11px] font-medium", active ? "text-brand" : "text-muted-foreground")}>
                {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand" />}
                <item.icon className="size-5 shrink-0" /><span className="max-w-full truncate">{t(label)}</span>
              </Link>
            );
          })}
          <button type="button" aria-expanded={more} onClick={() => setMore(true)} className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium text-muted-foreground"><MoreHorizontal className="size-5" />{t("More")}</button>
        </nav>
      </div>
      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side={lang === "ar" ? "right" : "left"} dir={lang === "ar" ? "rtl" : "ltr"} className="w-72 border-0 bg-sidebar p-0 [&>button]:text-sidebar-foreground">
          <SheetTitle className="sr-only">{t("More")}</SheetTitle><SheetDescription className="sr-only">{t("Main navigation")}</SheetDescription>
          <SidebarBody collapsed={false} onNav={() => setMore(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
