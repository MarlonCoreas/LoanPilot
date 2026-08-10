import { LANGS, PAGE_LABELS, ROUTES, type Lang, type Page } from "./routes";

const labels = {
  es: { tools: "Herramientas", language: "Idioma", home: "LoanPilot — inicio" },
  en: { tools: "Tools", language: "Language", home: "LoanPilot — home" },
} as const;

const NAV: Page[] = ["loans", "settlement", "withholding"];

export default function SiteHeader({ lang, page }: { lang: Lang; page: Page }) {
  const t = labels[lang];
  return <header className="topbar site-topbar">
    <a className="brand" href={ROUTES[lang].home} aria-label={t.home}><span>LP</span> LoanPilot</a>
    <nav aria-label={t.tools}>
      {NAV.map((item) => <a
        key={item}
        className={page === item ? "active" : ""}
        href={ROUTES[lang][item]}
        aria-current={page === item ? "page" : undefined}
      >{PAGE_LABELS[lang][item]}</a>)}
    </nav>
    {/* Anchors, not buttons: switching language is a navigation to the other
        translation, which is what makes it reachable and indexable. */}
    <div className="language" aria-label={t.language}>
      {LANGS.map((item) => <a
        key={item}
        className={lang === item ? "active" : ""}
        href={ROUTES[item][page]}
        // Spread, not the camelCase prop: React serialises `hrefLang` verbatim.
        // Browsers fold attribute case, but crawlers and greps are literal.
        {...{ hreflang: item }}
        aria-current={lang === item ? "true" : undefined}
      >{item.toUpperCase()}</a>)}
    </div>
  </header>;
}
