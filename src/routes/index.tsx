import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  Languages,
  MessageCircle,
  NotebookPen,
  Receipt,
  RotateCcw,
  UsersRound,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/app/logo";
import { SessionDemo, mono } from "@/components/landing/session-demo";
import { Button } from "@/components/ui/button";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Sales contact for "Book a demo". Set to an international number without "+"
 * (e.g. "2010xxxxxxxx") to show the WhatsApp buttons; while null they are hidden.
 */
const CONTACT_WHATSAPP: string | null = null;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Markazly — Attendance, fees and teacher pay for education centers in Egypt" },
      {
        name: "description",
        content:
          "Markazly turns every session into a ledger line: monthly, per-session and package fees, cash, InstaPay and Fawry, and teacher pay, in Arabic and English.",
      },
      { property: "og:title", content: "Markazly — Mark attendance. The billing does itself." },
      {
        property: "og:description",
        content: "Back office for tutoring centers and language schools in Egypt.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/landing/overview-en.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap",
      },
    ],
  }),
  component: Landing,
});

const COPY = {
  en: {
    nav: { how: "How it works", features: "Features", faq: "FAQ", signIn: "Sign in" },
    eyebrow: "For tutoring centers and language schools in Egypt",
    title: ["Mark attendance.", "The billing does itself."],
    lede: "Markazly turns every session into a ledger line: fees by month, by session or by package; cash, InstaPay and Fawry; and teacher pay. One set of numbers that always adds up.",
    demo: "Try the live demo",
    book: "Book a demo on WhatsApp",
    demoNote: "The live demo uses sample data. No sign-up.",
    problemTitle: "Where the money slips today",
    problems: [
      {
        icon: NotebookPen,
        t: "The attendance notebook",
        d: "Sessions get marked on paper, and nobody bills from the paper.",
      },
      {
        icon: Receipt,
        t: "Payment screenshots",
        d: "InstaPay transfers live in WhatsApp chats, not in a ledger.",
      },
      {
        icon: UsersRound,
        t: "Month-end with teachers",
        d: "Percentage pay gets argued from memory instead of read from collections.",
      },
    ],
    howTitle: "How a session becomes money",
    steps: [
      {
        t: "Mark the register",
        d: "Present, absent or excused, from a phone at the classroom door.",
      },
      {
        t: "Billing posts by the class rule",
        d: "Monthly fee, per attended session or a prepaid package. A student can have their own rule.",
      },
      {
        t: "See who owes and what teachers earn",
        d: "Balances, collections by method and teacher pay, all from the same entries.",
      },
    ],
    shotAlt:
      "Markazly owner dashboard with revenue, collections, outstanding balances and today's classes",
    shotCaption:
      "The owner's dashboard: revenue, collections, balances and today's classes, per branch or for the whole center.",
    featuresTitle: "What's in it",
    features: [
      {
        icon: BookOpenCheck,
        t: "Monthly, per session or packages",
        d: "Set a billing rule per class and override it per student.",
      },
      {
        icon: Wallet,
        t: "Every way students pay",
        d: "Record the method and reference, so each transfer can be traced.",
      },
      {
        icon: UsersRound,
        t: "Teacher pay",
        d: "Fixed salary, per session, or a percentage of what their classes collect.",
      },
      {
        icon: MessageCircle,
        t: "WhatsApp to guardians",
        d: "Open a chat with a guardian's number in one tap.",
      },
      {
        icon: Building2,
        t: "Every branch, one view",
        d: "Filter any screen by branch, or see the whole center.",
      },
      { icon: Languages, t: "Arabic and English", d: "Switch any screen, right to left included." },
    ],
    methods: ["Cash", "InstaPay", "Fawry", "Bank transfer"],
    trustEyebrow: "Audit trail",
    trustTitle: "Nothing is erased.",
    trustBody:
      "A wrong payment isn't edited or deleted. A reversal is added with the reason and who made it, then the correct amount is posted again. The owner can always see what happened, and the dashboard can't disagree with the transactions.",
    trustLines: [
      {
        id: "TX-43771",
        what: "Payment · InstaPay · Logy Soliman",
        amt: "+1,050",
        by: "Reem, front desk",
      },
      {
        id: "REV-43772",
        what: "Reversal of TX-43771 · typed 1,050 instead of 1,500",
        amt: "−1,050",
        by: "Karim, accountant",
        rev: true,
      },
      {
        id: "TX-43773",
        what: "Replaces TX-43771 · same reference",
        amt: "+1,500",
        by: "Karim, accountant",
      },
    ],
    pilotTitle: "Free pilot for the first centers",
    pilotBody:
      "We're onboarding a small group of centers now. Try the demo, then tell us how your center runs.",
    faqTitle: "Questions owners ask",
    faq: [
      {
        q: "Does it work on a phone?",
        a: "Yes. Attendance and payments are designed for a phone at the front desk or the classroom door.",
      },
      {
        q: "Is it in Arabic?",
        a: "Every screen, right to left. Each person can switch between Arabic and English.",
      },
      {
        q: "We use Excel today. Can we move over?",
        a: "During the pilot we set it up with you, starting from your current student list.",
      },
      {
        q: "What does the live demo show?",
        a: "A sample center with three branches and 300 students. Nothing you enter is saved.",
      },
    ],
    footer: "Back office for education centers in Egypt.",
  },
  ar: {
    nav: { how: "بيشتغل إزاي", features: "المميزات", faq: "أسئلة", signIn: "تسجيل الدخول" },
    eyebrow: "للسناتر ومدارس اللغات في مصر",
    title: ["سجّل الحضور…", "والحساب بيتعمل لوحده."],
    lede: "مركزلي بيحوّل كل حصة لقيد في الدفاتر: اشتراك شهري أو بالحصة أو باكدج، كاش وإنستاباي وفوري، ومستحقات المدرسين. أرقام واحدة دايمًا مظبوطة.",
    demo: "جرّب النسخة التجريبية",
    book: "احجز عرض على واتساب",
    demoNote: "النسخة التجريبية ببيانات تجريبية. من غير تسجيل.",
    problemTitle: "الفلوس بتضيع فين النهارده",
    problems: [
      { icon: NotebookPen, t: "كشكول الغياب", d: "الحضور بيتسجّل على ورق، ومحدش بيحاسب من الورق." },
      {
        icon: Receipt,
        t: "سكرين شوت التحويلات",
        d: "تحويلات إنستاباي في شاتات واتساب، مش في دفتر.",
      },
      {
        icon: UsersRound,
        t: "آخر الشهر مع المدرسين",
        d: "النسبة بتتحسب من الذاكرة بدل ما تتقري من التحصيل.",
      },
    ],
    howTitle: "إزاي الحصة بتتحول لفلوس",
    steps: [
      { t: "سجّل الحضور", d: "حاضر أو غايب أو بعذر، من الموبايل على باب الفصل." },
      {
        t: "الحساب بيتسجّل حسب نظام الفصل",
        d: "شهري أو بالحصة أو باكدج مدفوع مقدمًا، ولكل طالب نظامه لو حبيت.",
      },
      {
        t: "اعرف مين عليه فلوس والمدرس ليه كام",
        d: "الأرصدة والتحصيل بطريقة الدفع ومستحقات المدرسين، كلها من نفس القيود.",
      },
    ],
    shotAlt: "لوحة صاحب السنتر في مركزلي: الإيرادات والتحصيل والأرصدة وحصص النهارده",
    shotCaption:
      "لوحة صاحب السنتر: الإيرادات والتحصيل والأرصدة وحصص النهارده، لكل فرع أو للسنتر كله.",
    featuresTitle: "فيه إيه",
    features: [
      {
        icon: BookOpenCheck,
        t: "شهري أو بالحصة أو باكدج",
        d: "حدّد نظام الحساب لكل فصل، وغيّره لطالب معيّن لو محتاج.",
      },
      { icon: Wallet, t: "كل طرق الدفع", d: "سجّل طريقة الدفع ورقم العملية، عشان أي تحويل يتتبع." },
      {
        icon: UsersRound,
        t: "مستحقات المدرسين",
        d: "مرتب ثابت، أو بالحصة، أو نسبة من تحصيل فصوله.",
      },
      { icon: MessageCircle, t: "واتساب لأولياء الأمور", d: "افتح شات مع ولي الأمر بضغطة واحدة." },
      {
        icon: Building2,
        t: "كل الفروع في مكان واحد",
        d: "فلتر أي شاشة بالفرع، أو شوف السنتر كله.",
      },
      { icon: Languages, t: "عربي وإنجليزي", d: "غيّر لغة أي شاشة، ومن اليمين للشمال." },
    ],
    methods: ["كاش", "إنستاباي", "فوري", "تحويل بنكي"],
    trustEyebrow: "سجل المراجعة",
    trustTitle: "مفيش حاجة بتتمسح.",
    trustBody:
      "الدفعة الغلط مش بتتعدّل ولا بتتمسح. بيتضاف قيد إلغاء بالسبب واسم اللي عمله، وبعدين المبلغ الصح بيتسجّل من جديد. صاحب السنتر دايمًا شايف اللي حصل، واللوحة عمرها ما تختلف عن المعاملات.",
    trustLines: [
      {
        id: "TX-43771",
        what: "دفعة · إنستاباي · لوجي سليمان",
        amt: "+1,050",
        by: "ريم، الاستقبال",
      },
      {
        id: "REV-43772",
        what: "إلغاء TX-43771 · اتكتب 1,050 بدل 1,500",
        amt: "−1,050",
        by: "كريم، المحاسب",
        rev: true,
      },
      {
        id: "TX-43773",
        what: "بدل TX-43771 · نفس رقم العملية",
        amt: "+1,500",
        by: "كريم، المحاسب",
      },
    ],
    pilotTitle: "تجربة مجانية لأول السناتر",
    pilotBody:
      "بنضم مجموعة صغيرة من السناتر دلوقتي. جرّب النسخة التجريبية، وبعدين احكيلنا السنتر بتاعك بيشتغل إزاي.",
    faqTitle: "أسئلة أصحاب السناتر",
    faq: [
      {
        q: "بيشتغل على الموبايل؟",
        a: "أيوه. الحضور والمدفوعات معمولين للموبايل على الاستقبال أو على باب الفصل.",
      },
      {
        q: "هو بالعربي؟",
        a: "كل الشاشات، ومن اليمين للشمال. وكل واحد يقدر يبدّل بين العربي والإنجليزي.",
      },
      {
        q: "إحنا شغالين على إكسل. نقدر ننقل؟",
        a: "في فترة التجربة بنجهّزه معاك، ونبدأ من قائمة الطلاب اللي عندك.",
      },
      {
        q: "النسخة التجريبية فيها إيه؟",
        a: "سنتر تجريبي بتلات فروع و300 طالب. مفيش حاجة بتدخلها بتتحفظ.",
      },
    ],
    footer: "إدارة السناتر والمراكز التعليمية في مصر.",
  },
} as const;

const waLink = (lang: Lang) =>
  CONTACT_WHATSAPP
    ? `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(
        lang === "ar" ? "أهلًا، عايز أحجز عرض لمركزلي." : "Hi, I'd like to book a Markazly demo.",
      )}`
    : null;

function Ctas({ lang, onDark = false }: { lang: Lang; onDark?: boolean }) {
  const c = COPY[lang];
  const wa = waLink(lang);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        asChild
        size="lg"
        className={cn("h-11 gap-2 px-5", onDark && "bg-white text-navy hover:bg-white/90")}
      >
        <Link to="/overview">
          {c.demo}
          <ArrowRight className="size-4 rtl:-scale-x-100" />
        </Link>
      </Button>
      {wa && (
        <Button
          asChild
          size="lg"
          variant="outline"
          className={cn(
            "h-11 gap-2 px-5",
            onDark &&
              "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white",
          )}
        >
          <a href={wa} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4" />
            {c.book}
          </a>
        </Button>
      )}
    </div>
  );
}

function Landing() {
  const { lang, setLang } = useI18n();
  const c = COPY[lang];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-navy/10 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Logo className="size-8" />
            <span className="font-display text-lg font-extrabold tracking-tight">
              {lang === "ar" ? "مركزلي" : "Markazly"}
            </span>
          </Link>
          <nav
            aria-label="Page sections"
            className="hidden items-center gap-5 text-sm text-muted-foreground md:flex"
          >
            <a href="#how" className="hover:text-foreground">
              {c.nav.how}
            </a>
            <a href="#features" className="hover:text-foreground">
              {c.nav.features}
            </a>
            <a href="#faq" className="hover:text-foreground">
              {c.nav.faq}
            </a>
          </nav>
          <div className="ms-auto flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="gap-1.5 text-muted-foreground"
            >
              <Languages className="size-4" />
              {lang === "en" ? "العربية" : "English"}
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/login">{c.nav.signIn}</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/overview">{c.demo}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero: the thesis is the demo itself — attendance in, ledger out. */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[0.9fr_1.2fr] lg:pt-20 lg:pb-28">
          <div>
            <p className="text-sm font-semibold text-teal">{c.eyebrow}</p>
            <h1 className="mt-4 font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-navy sm:text-6xl dark:text-foreground">
              {c.title[0]}
              <br />
              <span className="text-brand">{c.title[1]}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{c.lede}</p>
            <div className="mt-8">
              <Ctas lang={lang} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{c.demoNote}</p>
          </div>
          <SessionDemo lang={lang} />
        </section>

        {/* The problem, in the center's own materials. */}
        <section className="border-y border-navy/10 bg-card">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {c.problemTitle}
            </h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {c.problems.map((p) => (
                <div key={p.t} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
                    <p.icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{p.t}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* A real sequence, so the steps are numbered. */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {c.howTitle}
          </h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
            {c.steps.map((s, i) => (
              <li key={s.t} className="relative border-t-2 border-navy/15 pt-5">
                <span
                  className={cn("absolute -top-[2px] start-0 h-[2px] w-12 bg-teal-bright")}
                  aria-hidden
                />
                <span className={mono + " " + cn("text-sm font-semibold text-teal")} dir="ltr">
                  {i + 1}
                </span>
                <h3 className="mt-2 text-lg font-semibold">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>

          <figure className="mt-16">
            <div className="overflow-hidden rounded-2xl border border-navy/10 bg-card shadow-[0_30px_80px_-40px_oklch(0.288_0.064_256.5/0.5)]">
              <div
                className="flex h-8 items-center gap-1.5 border-b border-navy/10 bg-muted/60 px-4"
                aria-hidden
              >
                <span className="size-2.5 rounded-full bg-navy/15" />
                <span className="size-2.5 rounded-full bg-navy/15" />
                <span className="size-2.5 rounded-full bg-navy/15" />
              </div>
              <img
                src={`/landing/overview-${lang}.jpg`}
                alt={c.shotAlt}
                width={1440}
                height={900}
                loading="lazy"
                className="block h-auto w-full"
              />
            </div>
            <figcaption className="mt-3 text-center text-sm text-muted-foreground">
              {c.shotCaption}
            </figcaption>
          </figure>
        </section>

        <section id="features" className="scroll-mt-20 border-t border-navy/10 bg-card">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {c.featuresTitle}
            </h2>
            <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-navy/10 bg-navy/10 sm:grid-cols-2 lg:grid-cols-3">
              {c.features.map((f, i) => (
                <div key={f.t} className="bg-card p-6">
                  <f.icon className="size-5 text-brand" />
                  <h3 className="mt-4 font-semibold">{f.t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
                  {i === 1 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {c.methods.map((m) => (
                        <span
                          key={m}
                          className="rounded-full border border-navy/10 bg-muted px-2.5 py-0.5 text-xs font-medium"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust: the ledger rule, shown as the ledger. */}
        <section className="bg-sidebar-gradient text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold text-teal-bright">{c.trustEyebrow}</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                {c.trustTitle}
              </h2>
              <p className="mt-5 max-w-lg leading-relaxed text-white/75">{c.trustBody}</p>
            </div>
            <ol className="space-y-2">
              {c.trustLines.map((l) => (
                <li
                  key={l.id}
                  className={cn(
                    "rounded-xl border px-4 py-3",
                    "rev" in l && l.rev
                      ? "border-warning/50 bg-warning/10"
                      : "border-white/10 bg-white/5",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className={mono + " " + cn("text-xs text-white/60")} dir="ltr">
                      {l.id}
                    </span>
                    <span
                      className={
                        mono +
                        " " +
                        cn(
                          "text-base font-semibold",
                          "rev" in l && l.rev ? "text-warning" : "text-white",
                        )
                      }
                      dir="ltr"
                    >
                      {l.amt}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
                    {"rev" in l && l.rev && (
                      <RotateCcw className="size-3.5 shrink-0 text-warning" />
                    )}
                    {l.what}
                  </div>
                  <div className="mt-0.5 text-xs text-white/50">{l.by}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {c.pilotTitle}
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">{c.pilotBody}</p>
              <div className="mt-6">
                <Ctas lang={lang} />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground">{c.faqTitle}</h2>
              <div className="mt-3 divide-y divide-navy/10 border-y border-navy/10">
                {c.faq.map((f) => (
                  <details key={f.q} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand [&::-webkit-details-marker]:hidden">
                      {f.q}
                      <span
                        className="text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45"
                        aria-hidden
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-navy/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <span className="flex items-center gap-2">
            <Logo className="size-6" />
            <span className="font-semibold text-foreground">
              {lang === "ar" ? "مركزلي" : "Markazly"}
            </span>
          </span>
          <span>{c.footer}</span>
          <span className="ms-auto flex gap-5">
            <Link to="/login" className="hover:text-foreground">
              {c.nav.signIn}
            </Link>
            <span dir="ltr">© 2026</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
