import { LANGS, PAGE_LABELS, ROUTES, TOOL_PAGES, type Lang, type Page } from "./routes";

const labels = {
  es: { tools: "Herramientas", language: "Idioma", home: "LoanPilot — inicio" },
  en: { tools: "Tools", language: "Language", home: "LoanPilot — home" },
} as const;

export default function SiteHeader({ lang, page }: { lang: Lang; page: Page }) {
  const t = labels[lang];
  return <header className="topbar site-topbar">
    <a className="brand" href={ROUTES[lang].home} aria-label={t.home}><span>LP</span> LoanPilot</a>
    <nav aria-label={t.tools}>
      {TOOL_PAGES.map((item) => <a
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
        hrefLang={item}
        aria-current={lang === item ? "true" : undefined}
      >{item.toUpperCase()}</a>)}
    </div>
  </header>;
}
