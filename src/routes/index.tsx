import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { CONTACT_WHATSAPP, LANDING_COPY, SAMPLE_NAMES } from "@/components/landing/copy";
import { RegisterSection } from "@/components/landing/register-demo";
import landingCss from "@/components/landing/landing.css?url";

/*
 * Landing page, grammar "Ledger feature": editorial chapters whose figures are working
 * instruments on labelled sample data. Arabic first. Seven chapters:
 *   1 front desk (layered hero) · 2 where money slips (quiet) · 3 the register (peak: the
 *   scroll is the class clock) · 4 nothing is erased (wipe) · 5 your rules (lateral rail)
 *   · 6 questions · 7 the last entry (CTA as a ledger row).
 * Real app screenshots live in public/landing (Demo Center, light mode).
 */

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: LANDING_COPY.en.title },
      { name: "description", content: LANDING_COPY.en.description },
      { property: "og:title", content: "Markazly · Mark attendance. The billing does itself." },
      {
        property: "og:description",
        content: "Back office for tutoring centers and language schools in Egypt.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/landing/overview-en.webp" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: landingCss }],
  }),
  component: Landing,
});

const span = (n: number) => ({ "--span": n }) as CSSProperties;
const waHref = (lang: Lang) =>
  `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(LANDING_COPY[lang].waText)}`;

function Tick({ d = "M2.5 8.5l3.5 3.5 7.5-8" }: { d?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d={d} />
    </svg>
  );
}
const TICKS = ["M2.5 8.5l3.5 3.5 7.5-8", "M2 9l4 3 8-9", "M3 8l3 4 7-8.5"];
const Ticks = ({ n }: { n: number }) => (
  <span className="ticks">
    {Array.from({ length: n }, (_, i) => (
      <Tick key={i} d={TICKS[i % 3]!} />
    ))}
  </span>
);

function Mark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#172540" />
      <path
        d="M8.5 23V10L16 17.5L23.5 10V23"
        fill="none"
        stroke="white"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="24" r="2.4" fill="white" />
    </svg>
  );
}

/** Publishes --p (0..1) on each pinned section and the reveal section, drives the rail, fades [data-in]. */
function useLandingScroll(root: RefObject<HTMLDivElement | null>, onChapter: (i: number) => void) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pins = Array.from(el.querySelectorAll<HTMLElement>(".lp-pin"));
    const flows = Array.from(el.querySelectorAll<HTMLElement>("[data-flow]"));
    const range = el.querySelector<HTMLElement>(".lp-range");
    const rail = el.querySelector<HTMLElement>(".rail");
    let over = 0;
    const measure = () => {
      over = rail ? Math.max(rail.scrollWidth - innerWidth, 0) : 0;
    };
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = innerHeight;
      for (const s of pins) {
        const r = s.getBoundingClientRect();
        const p = Math.min(Math.max(-r.top / Math.max(s.offsetHeight - vh, 1), 0), 1);
        s.style.setProperty("--p", p.toFixed(4));
        if (s === range && rail && !reduce) {
          const dir = document.documentElement.dir === "rtl" ? 1 : -1;
          rail.style.transform = `translate3d(${(over * p * dir).toFixed(1)}px,0,0)`;
        }
      }
      for (const s of flows) {
        const r = s.getBoundingClientRect();
        s.style.setProperty(
          "--p",
          Math.min(Math.max((vh - r.top) / (vh + r.height), 0), 1).toFixed(4),
        );
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    tick();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onResize);
    void document.fonts?.ready.then(onResize);

    const fade = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            fade.unobserve(e.target);
          }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    el.querySelectorAll("[data-in]").forEach((n) => fade.observe(n));

    const folio = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) onChapter(Number((e.target as HTMLElement).dataset["chapter"]));
      },
      { rootMargin: "-45% 0px -54% 0px" },
    );
    el.querySelectorAll("[data-chapter]").forEach((n) => folio.observe(n));

    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onResize);
      if (raf) cancelAnimationFrame(raf);
      fade.disconnect();
      folio.disconnect();
    };
  }, [root, onChapter]);
}

function Landing() {
  const { lang, setLang } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();
  const dark = theme === "dark";
  const shot = (name: "overview" | "attendance") =>
    `/landing/${name}-${lang}${dark ? "-dark" : ""}.webp`;
  const c = LANDING_COPY[lang];
  const names = SAMPLE_NAMES[lang];
  const root = useRef<HTMLDivElement>(null);
  const [chapter, setChapter] = useState(0);
  useLandingScroll(root, setChapter);

  // Arabic first for visitors who have never chosen a language.
  useEffect(() => {
    try {
      if (!localStorage.getItem("centeros-lang")) setLang("ar");
    } catch {
      /* storage may be unavailable */
    }
  }, [setLang]);
  useEffect(() => {
    document.title = c.title;
  }, [c.title]);
  // The rail width changes with the language; re-measure by nudging a resize.
  useEffect(() => {
    dispatchEvent(new Event("resize"));
  }, [lang]);

  const cta = (
    <Link to="/demo" className="lp-btn lp-btn--primary">
      {c.cta}
      <svg
        className="arrow"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 8h10M9 4l4 4-4 4" />
      </svg>
    </Link>
  );
  const wa = (
    <a
      className="lp-btn lp-btn--quiet"
      href={waHref(lang)}
      target="_blank"
      rel="noopener noreferrer"
    >
      {c.wa}
    </a>
  );

  return (
    <div className="lp" ref={root}>
      <div className="lp-grain" aria-hidden="true" />

      <header className="lp-bar">
        <Link to="/" className="lp-mark" aria-label="Markazly">
          <Mark />
          <span>{c.brand}</span>
        </Link>
        <p className="lp-folio" aria-hidden="true">
          <span className="lp-folio__n" dir="ltr">
            {chapter + 1}
          </span>
          <span>{c.chapters[chapter]}</span>
        </p>
        <div className="lp-bar__end">
          <button
            type="button"
            className="lp-lang"
            lang={lang === "en" ? "ar" : "en"}
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
          >
            {c.langSwitch}
          </button>
          <button
            type="button"
            className="lp-lang lp-theme"
            onClick={toggleTheme}
            aria-label={dark ? c.lightMode : c.darkMode}
            title={dark ? c.lightMode : c.darkMode}
          >
            {dark ? (
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="8" cy="8" r="3" />
                <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" />
              </svg>
            )}
          </button>
          <Link to="/login" className="lp-signin">
            {c.signIn}
          </Link>
          <Link to="/demo" className="lp-btn lp-btn--primary lp-btn--sm">
            {c.cta}
          </Link>
        </div>
      </header>

      <main id="top">
        {/* 1 · Front desk: dashboard far, paper register and phone near; scroll lets the near planes fall away. */}
        <section className="lp-pin lp-hero" style={span(1.9)} data-chapter={0}>
          <div className="lp-stage">
            <div className="hero__copy">
              <h1>
                <span>{c.h1a}</span> <span className="h1b">{c.h1b}</span>
              </h1>
              <p className="lede">{c.lede}</p>
              <div className="ctas">
                {cta}
                {wa}
              </div>
              <p className="note">{c.note}</p>
            </div>
            <div className="scene" aria-hidden="true">
              <figure className="plane plane--far">
                <div className="win">
                  <div className="win__bar">
                    <span dir="ltr">markazly.dev/overview</span>
                  </div>
                  <img
                    src={shot("overview")}
                    width={2880}
                    height={1800}
                    alt=""
                    fetchPriority="high"
                  />
                </div>
                <figcaption>{c.farCap}</figcaption>
              </figure>
              <div className="plane sheet">
                <div className="sheet__head">
                  <b>{c.sheetT}</b>
                  <span>{c.sheetM}</span>
                </div>
                <ol>
                  {[3, 2, 1, 0, 2, 0].map((n, i) => (
                    <li key={i}>
                      <span>{names[i]}</span>
                      {n ? <Ticks n={n} /> : <span className="q">?</span>}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="plane phone">
                <div className="phone__screen">
                  <div className="phone__top">
                    <i />
                    <span>
                      {c.chatWho}
                      <small>{c.chatSub}</small>
                    </span>
                  </div>
                  <div className="chat">
                    <div className="bubble">
                      <div className="slip">
                        <div className="slip__ok">{c.slipOk}</div>
                        <div className="slip__amt" dir="ltr">
                          320 EGP
                        </div>
                        <div className="slip__ref" dir="ltr">
                          Ref 48201
                        </div>
                      </div>
                      <span>{c.chatMsg}</span>
                      <time dir="ltr">6:25 PM</time>
                    </div>
                    <div className="bubble">
                      <span>{c.chatMsg2}</span>
                      <time dir="ltr">6:31 PM</time>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2 · Where it slips: authored stillness before the peak. */}
        <section className="lp-slips" data-chapter={1} aria-labelledby="slips-h">
          <div className="lp-wrap">
            <h2 id="slips-h" data-in>
              {c.slipsH}
            </h2>
            <ol className="slips__list">
              <li className="slip-row" data-in>
                <div className="exhibit" aria-hidden="true">
                  <div className="ex-note">
                    <div className="line">
                      <span>{names[0]}</span>
                      <Ticks n={4} />
                      <span className="unbilled">{c.unbilled}</span>
                    </div>
                    <div className="line">
                      <span>{names[1]}</span>
                      <Ticks n={1} />
                    </div>
                  </div>
                </div>
                <div>
                  <h3>{c.slips[0].t}</h3>
                  <p>{c.slips[0].d}</p>
                </div>
              </li>
              <li className="slip-row" data-in>
                <div className="exhibit" aria-hidden="true">
                  <div className="ex-chat">
                    <div className="bubble">
                      <div className="slip">
                        <div className="slip__ok">{c.slipOk}</div>
                        <div className="slip__amt" dir="ltr">
                          320 EGP
                        </div>
                      </div>
                      <time dir="ltr">6:25 PM</time>
                    </div>
                  </div>
                </div>
                <div>
                  <h3>{c.slips[1].t}</h3>
                  <p>{c.slips[1].d}</p>
                </div>
              </li>
              <li className="slip-row" data-in>
                <div className="exhibit" aria-hidden="true">
                  <div className="ex-sticky">
                    <span>{c.stickyT}</span>
                    <div className="sum" dir="ltr">
                      <s>4,800</s> 4,960 ?
                    </div>
                  </div>
                </div>
                <div>
                  <h3>{c.slips[2].t}</h3>
                  <p>{c.slips[2].d}</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* 3 · The register: the peak. */}
        <RegisterSection lang={lang} chapter={2} />

        {/* 4 · Nothing is erased: the wipe replaces edited history with kept history. */}
        <section className="lp-trust" data-flow data-chapter={3} aria-labelledby="trust-h">
          <div className="lp-wrap trust__grid">
            <div className="trust__copy" data-in>
              <h2 id="trust-h">{c.trustH}</h2>
              <p>{c.trustP}</p>
            </div>
            <figure className="tfig">
              <div className="tlayer">
                <p className="tlabel">
                  <b>{c.aLabel}</b>
                  <span>{c.aSub}</span>
                </p>
                <div className="sheetgrid">
                  {c.cols.map((h) => (
                    <div key={h} className="h">
                      {h}
                    </div>
                  ))}
                  <div>{c.sheetRows[0][0]}</div>
                  <div>{c.sheetRows[0][1]}</div>
                  <div className="edited" dir="ltr">
                    <s>1,050</s>1,500
                  </div>
                  <div>{c.sheetRows[1][0]}</div>
                  <div>{c.sheetRows[1][1]}</div>
                  <div className="mono" dir="ltr">
                    560
                  </div>
                  <div>{c.sheetRows[2][0]}</div>
                  <div>{c.sheetRows[2][1]}</div>
                  <div className="mono" dir="ltr">
                    320
                  </div>
                </div>
                <p className="gone">{c.gone}</p>
              </div>
              <div className="tlayer tlayer--b">
                <p className="tlabel">
                  <b>{c.bLabel}</b>
                  <span>{c.bSub}</span>
                </p>
                <ol className="ledger">
                  {(["TX-43771", "REV-43772", "TX-43773"] as const).map((id, i) => (
                    <li key={id} className={i === 1 ? "rev" : undefined}>
                      <span className="stamp" dir="ltr">
                        {id}
                      </span>
                      <span className="what">{c.ledger[i]!.what}</span>
                      <span className="amt" dir="ltr">
                        {["+1,050", "−1,050", "+1,500"][i]}
                      </span>
                      <span className="by">{c.ledger[i]!.by}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </figure>
          </div>
        </section>

        {/* 5 · Your rules: lateral travel, the right way round in RTL. */}
        <section
          className="lp-pin lp-range"
          style={span(2.6)}
          data-chapter={4}
          aria-labelledby="range-h"
        >
          <div className="lp-stage">
            <div className="rail">
              <div className="rail__lead">
                <h2 id="range-h">{c.rangeH}</h2>
                <p>{c.rangeP}</p>
              </div>
              {c.rules.map((r) => (
                <article key={r.t} className="rule-item">
                  <div className="ex" dir="ltr">
                    {r.ex}
                    <span dir="auto">{r.exNote}</span>
                  </div>
                  <h3>{r.t}</h3>
                  <p>{r.d}</p>
                </article>
              ))}
              <article className="rule-item rule-item--shot">
                <div className="win">
                  <div className="win__bar">
                    <span dir="ltr">markazly.dev/attendance</span>
                  </div>
                  <img
                    src={shot("attendance")}
                    width={2880}
                    height={1800}
                    alt={c.shotAlt}
                    loading="lazy"
                  />
                </div>
                <h3>{c.shotT}</h3>
                <p>{c.shotD}</p>
              </article>
              <p className="rail__end">{c.railEnd}</p>
            </div>
          </div>
        </section>

        {/* 6 · Questions: administrative, so it gets little scroll. */}
        <section className="lp-faq" data-chapter={5} aria-labelledby="faq-h">
          <div className="lp-wrap faq__grid">
            <h2 id="faq-h" data-in>
              {c.faqH}
            </h2>
            <div data-in>
              {c.faq.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 7 · The last entry: the call to action is the next ledger row. It holds. */}
        <section
          className="lp-pin lp-close"
          style={span(1.2)}
          data-chapter={6}
          aria-labelledby="close-h"
        >
          <div className="lp-stage">
            <div className="close__main">
              <h2 id="close-h">{c.closeH}</h2>
              <div className="entry">
                <span className="entry__code" dir="ltr">
                  PILOT
                </span>
                <div className="entry__what">
                  <b>{c.pilotT}</b>
                  <span>{c.pilotP}</span>
                </div>
                <div className="entry__act">
                  {cta}
                  {wa}
                </div>
              </div>
            </div>
            <footer className="lp-foot">
              <span>
                {c.brand} · {c.footer}
              </span>
              <span>
                <Link to="/login">{c.signIn}</Link> · <span dir="ltr">© 2026 Markazly</span>
              </span>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
