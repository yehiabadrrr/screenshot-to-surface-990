import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, Users, BookOpen, CalendarCheck, Wallet, GraduationCap, BarChart3, MessageSquare, Settings, ChevronsUpDown, PanelLeft, Languages, MoreHorizontal } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLedger } from "@/lib/ledger-store";
import { centerProfile, initials } from "@/lib/center-config";
import { Logo } from "./logo";
import { CommandSearch } from "./command-search";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard, group: "Daily work" },
  { to: "/students", label: "Students", icon: Users, group: "Daily work" },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck, group: "Daily work" },
  { to: "/classes", label: "Classes & Courses", icon: BookOpen, group: "Daily work" },
  { to: "/finance", label: "Payments & Finance", icon: Wallet, group: "Financial management" },
  { to: "/teachers", label: "Teacher Management", icon: GraduationCap, group: "Financial management" },
  { to: "/reports", label: "Reports & Analytics", icon: BarChart3, group: "Financial management" },
  { to: "/communications", label: "Communications", icon: MessageSquare, group: "Center" },
  { to: "/settings", label: "Settings", icon: Settings, group: "Center" },
] as const;
const groups = ["Daily work", "Financial management", "Center"] as const;
const bottomNav = nav.filter((item) => ["/overview", "/students", "/attendance", "/finance"].includes(item.to));

function SidebarBody({ collapsed, onNav }: { collapsed: boolean; onNav?: () => void }) {
  const { t, lang } = useI18n();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { branch, setBranch } = useLedger();
  return <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
    <div className={cn("flex h-14 items-center gap-2.5 px-4", collapsed && "justify-center px-0")}>
      <Logo className="size-7" />{!collapsed && <span className="text-[15px] font-semibold text-sidebar-accent-foreground">CenterOS</span>}
    </div>
    {!collapsed && <div className="px-3 pb-3">
      <DropdownMenu dir={lang === "ar" ? "rtl" : "ltr"}>
        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-auto w-full justify-start border border-sidebar-border px-2.5 py-2 text-start text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">{initials(centerProfile.name)}</span>
          <span className="min-w-0 flex-1"><bdi className="block truncate text-[13px] font-medium">{centerProfile.name}</bdi><span className="block truncate text-xs text-sidebar-foreground">{t(branch === "all" ? "All branches" : branch)}</span></span><ChevronsUpDown className="size-4" />
        </Button></DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => setBranch("all")}>{t("All branches")}</DropdownMenuItem>
          {centerProfile.branches.map((item) => <DropdownMenuItem key={item} onClick={() => setBranch(item)}>{t(item)}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>}
    <nav aria-label={t("Main navigation")} className="min-h-0 flex-1 overflow-y-auto px-2">
      {groups.map((group) => <div key={group} className="mb-3">
        {!collapsed && <div className="px-2.5 py-2 text-xs font-medium text-sidebar-foreground">{t(group)}</div>}
        {nav.filter((item) => item.group === group).map((item) => {
          const active = path === item.to || path.startsWith(item.to + "/");
          return <Link key={item.to} to={item.to} onClick={onNav} aria-current={active ? "page" : undefined} title={collapsed ? t(item.label) : undefined}
            className={cn("flex min-h-10 items-center gap-3 rounded-md px-2.5 py-2 text-[13.5px] transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground", collapsed && "justify-center")}>
            <item.icon className={cn("size-4 shrink-0", active && "text-sidebar-primary")} />{!collapsed && <span>{t(item.label)}</span>}
          </Link>;
        })}
      </div>)}
    </nav>
    <div className={cn("flex items-center gap-2.5 border-t border-sidebar-border p-3", collapsed && "justify-center")}>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">{initials(centerProfile.currentUser.name)}</span>
      {!collapsed && <div className="min-w-0"><bdi className="block truncate text-[13px] font-medium text-sidebar-accent-foreground">{centerProfile.currentUser.name}</bdi><div className="text-xs">{t(centerProfile.currentUser.role)} · {t("Demo data")}</div></div>}
    </div>
  </div>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [more, setMore] = useState(false);
  const { lang, setLang, t } = useI18n();
  const path = useRouterState({ select: (r) => r.location.pathname });
  useEffect(() => { try { setCollapsed(localStorage.getItem("centeros-sidebar-collapsed") === "true"); } catch { /* Storage may be unavailable. */ } }, []);
  const toggle = () => setCollapsed((value) => { const next = !value; try { localStorage.setItem("centeros-sidebar-collapsed", String(next)); } catch { /* Still usable without storage. */ } return next; });
  return <div className="flex min-h-screen w-full bg-background">
    <aside aria-label={t("Sidebar")} className={cn("sticky top-0 hidden h-screen shrink-0 motion-safe:transition-[width] md:block", collapsed ? "w-16" : "w-60")}><SidebarBody collapsed={collapsed} /></aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background px-page-mobile md:gap-3 md:px-6">
        <Button variant="ghost" size="icon" aria-label={t("Toggle sidebar")} title={t("Toggle sidebar")} aria-expanded={!collapsed} className="hidden md:inline-flex" onClick={toggle}><PanelLeft /></Button>
        <Logo className="size-6 shrink-0 md:hidden" />
        <CommandSearch />
        {centerProfile.isDemo && <span className="inline-flex shrink-0 items-center gap-1.5 rounded border border-warning/40 bg-warning-soft px-2 py-1 text-xs font-medium" title={t("Sample data resets on refresh. Nothing is saved.")}><span className="size-1.5 rounded-full bg-warning" />{t("Demo data")}</span>}
        <Button variant="ghost" onClick={() => setLang(lang === "en" ? "ar" : "en")} className="ms-auto h-10 gap-1.5 px-2 text-muted-foreground"><Languages />{lang === "en" ? "العربية" : "English"}</Button>
      </header>
      <main className="min-w-0 flex-1 px-page-mobile pt-6 pb-24 md:px-page md:pb-6">{children}</main>
      <nav aria-label={t("Mobile navigation")} className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background md:hidden">
        {bottomNav.map((item) => {
          const active = path === item.to || path.startsWith(item.to + "/");
          const label = item.to === "/finance" ? "Payments" : item.label;
          return <Link key={item.to} to={item.to} aria-current={active ? "page" : undefined} className={cn("flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center text-[11px]", active ? "bg-accent text-brand" : "text-muted-foreground")}><item.icon className="size-5 shrink-0" /><span className="max-w-full break-words">{t(label)}</span></Link>;
        })}
        <Button variant="ghost" aria-expanded={more} onClick={() => setMore(true)} className="h-auto min-h-16 flex-col gap-1 rounded-none px-1 py-2 text-[11px] text-muted-foreground"><MoreHorizontal className="size-5" />{t("More")}</Button>
      </nav>
    </div>
    <Sheet open={more} onOpenChange={setMore}>
      <SheetContent side="bottom" dir={lang === "ar" ? "rtl" : "ltr"} className="h-[85dvh] p-0 [&>button]:text-sidebar-accent-foreground">
        <SheetTitle className="sr-only">{t("More")}</SheetTitle><SheetDescription className="sr-only">{t("Main navigation")}</SheetDescription>
        <SidebarBody collapsed={false} onNav={() => setMore(false)} />
      </SheetContent>
    </Sheet>
  </div>;
}
