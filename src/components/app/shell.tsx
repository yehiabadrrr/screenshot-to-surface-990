import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Users, BookOpen, CalendarCheck, Wallet, GraduationCap, BarChart3, MessageSquare, Settings,
  Search, ChevronsUpDown, PanelLeft, Languages, Bell, Menu,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { branches } from "@/lib/data";
import { useLedger } from "@/lib/ledger-store";
import { Logo } from "./logo";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
  { to: "/classes", label: "Classes & Courses", icon: BookOpen },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/finance", label: "Payments & Finance", icon: Wallet },
  { to: "/teachers", label: "Teacher Management", icon: GraduationCap },
  { to: "/reports", label: "Reports & Analytics", icon: BarChart3 },
  { to: "/communications", label: "Communications", icon: MessageSquare },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function SidebarBody({ collapsed, onNav }: { collapsed: boolean; onNav?: () => void }) {
  const { t } = useI18n();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { branch, setBranch } = useLedger();
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex h-14 items-center gap-2.5 px-4", collapsed && "justify-center px-0")}>
        <Logo className="size-7" />
        {!collapsed && <span className="text-[15px] font-semibold tracking-tight text-sidebar-accent-foreground">CenterOS</span>}
      </div>
      {!collapsed && (
        <div className="px-3 pb-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg border border-sidebar-border px-2.5 py-2 text-start hover:bg-sidebar-accent">
              <div className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">NA</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-sidebar-accent-foreground">Nile Academy</div>
                <div className="truncate text-xs">{t(branch === "all" ? "All branches" : branch)}</div>
              </div>
              <ChevronsUpDown className="size-4 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {["All branches", ...branches].map((b) => (
                <DropdownMenuItem key={b} onClick={() => setBranch(b === "All branches" ? "all" : b)}>{t(b)}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <nav className="flex-1 space-y-0.5 px-2">
        {nav.map((n) => {
          const active = path === n.to || path.startsWith(n.to + "/");
          return (
            <Link key={n.to} to={n.to} onClick={onNav} title={collapsed ? t(n.label) : undefined}
              className={cn("flex items-center gap-3 rounded-md px-2.5 py-2 text-[13.5px] transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground", collapsed && "justify-center")}>
              <n.icon className={cn("size-4 shrink-0", active && "text-sidebar-primary")} />
              {!collapsed && <span className="truncate">{t(n.label)}</span>}
            </Link>
          );
        })}
      </nav>
      <div className={cn("flex items-center gap-2.5 border-t border-sidebar-border p-3", collapsed && "justify-center")}>
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">YH</div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-sidebar-accent-foreground">Yehia Hazem</div>
            <div className="truncate text-xs">Owner</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const { lang, setLang, t } = useI18n();
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 transition-[width] md:block", collapsed ? "w-16" : "w-60")}>
        <SidebarBody collapsed={collapsed} />
      </aside>
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side={lang === "ar" ? "right" : "left"} className="w-64 border-0 p-0">
          <SidebarBody collapsed={false} onNav={() => setMobile(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:px-6">
          <button aria-label="Toggle sidebar" className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted md:block" onClick={() => setCollapsed((c) => !c)}>
            <PanelLeft className="size-4" />
          </button>
          <button aria-label="Open menu" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted md:hidden" onClick={() => setMobile(true)}>
            <Menu className="size-4" />
          </button>
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder={`${t("Search")}…`} className="h-9 w-full rounded-md border bg-card ps-8 pe-3 text-sm outline-none focus:ring-2 focus:ring-ring/30" />
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-warning/40 bg-warning-soft px-2.5 py-1 text-xs font-medium text-foreground sm:inline-flex" title="Sample data. New payments and corrections live only in this browser tab and disappear on refresh. Nothing is saved to a real ledger.">
            <span className="size-1.5 rounded-full bg-warning" />Demo data · not saved
          </span>
          <div className="ms-auto flex items-center gap-1">
            <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted">
              <Languages className="size-4" /> {lang === "en" ? "العربية" : "English"}
            </button>
            <button aria-label="Notifications" className="rounded-md p-2 text-muted-foreground hover:bg-muted"><Bell className="size-4" /></button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
