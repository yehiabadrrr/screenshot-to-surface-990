import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { useI18n } from "@/lib/i18n";
import { useLedger } from "@/lib/ledger-store";

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const { t, lang } = useI18n();
  const { students, classes } = useLedger();
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return <>
    <Button variant="ghost" size="icon" aria-label={t("Search students and classes")} title={t("Search students and classes")} onClick={() => setOpen(true)} className="size-9 text-muted-foreground lg:hidden">
      <Search />
    </Button>
    <button type="button" aria-label={t("Search students and classes")} onClick={() => setOpen(true)} className="hidden h-9 w-52 items-center gap-2 rounded-lg border bg-muted/60 px-3 text-start text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring lg:flex 2xl:w-72">
      <Search className="size-4 shrink-0" /><span className="min-w-0 flex-1 truncate text-xs">{t("Search students and classes")}</span>
      <kbd className="hidden shrink-0 rounded border bg-card px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground lg:inline" dir="ltr">Ctrl K</kbd>
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent dir={lang === "ar" ? "rtl" : "ltr"} className="overflow-hidden p-0" >
        <DialogTitle className="sr-only">{t("Search students and classes")}</DialogTitle>
        <DialogDescription className="sr-only">{t("Demo data")}</DialogDescription>
        <Command dir={lang === "ar" ? "rtl" : "ltr"} filter={(value, search) => value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0}>
          <CommandInput aria-label={t("Search students and classes")} placeholder={t("Name, ID or phone")} className="pe-10" />
          <CommandList>
            <CommandEmpty>{t("No results found")}</CommandEmpty>
            <CommandGroup heading={t("Students")}>
              {students.map((student) => <CommandItem key={student.id} value={`${student.name} ${student.id} ${student.phone}`} onSelect={() => { setOpen(false); void navigate({ to: "/students/$id", params: { id: student.id } }); }}>
                <Users /><bdi className="min-w-0 flex-1 break-words">{student.name}</bdi><bdi className="text-xs text-muted-foreground">{student.id}</bdi>
              </CommandItem>)}
            </CommandGroup>
            <CommandGroup heading={t("Classes")}>
              {classes.map((item) => <CommandItem key={item.id} value={`${item.name} ${item.id}`} onSelect={() => { setOpen(false); void navigate({ to: "/classes" }); }}>
                <BookOpen /><bdi className="min-w-0 flex-1 break-words">{item.name}</bdi><bdi className="text-xs text-muted-foreground">{item.id}</bdi>
              </CommandItem>)}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  </>;
}
