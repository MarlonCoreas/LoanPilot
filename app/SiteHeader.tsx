export type Lang = "es" | "en";
export type SiteSection = "home" | "loans" | "settlement" | "withholding";

export function getInitialLanguage(): Lang {
  if (typeof window === "undefined") return "es";
  try { return window.localStorage.getItem("loanpilot-language") === "en" ? "en" : "es"; }
  catch { return "es"; }
}

const labels = {
  es: { loans: "Préstamos", settlement: "Finiquito", withholding: "Retenciones", home: "LoanPilot — inicio" },
  en: { loans: "Loans", settlement: "Settlement", withholding: "Withholding", home: "LoanPilot — home" },
} as const;

export default function SiteHeader({ lang, setLang, active }: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  active: SiteSection;
}) {
  const t = labels[lang];
  const chooseLanguage = (next: Lang) => {
    try { window.localStorage.setItem("loanpilot-language", next); } catch { /* Storage can be disabled. */ }
    setLang(next);
  };
  return <header className="topbar site-topbar">
    <a className="brand" href="/" aria-label={t.home}><span>LP</span> LoanPilot</a>
    <nav aria-label={lang === "es" ? "Herramientas" : "Tools"}>
      <a className={active === "loans" ? "active" : ""} href="/prestamos/">{t.loans}</a>
      <a className={active === "settlement" ? "active" : ""} href="/finiquito/">{t.settlement}</a>
      <a className={active === "withholding" ? "active" : ""} href="/retenciones/">{t.withholding}</a>
    </nav>
    <div className="language" aria-label={lang === "es" ? "Idioma" : "Language"}>
      <button className={lang === "es" ? "active" : ""} onClick={() => chooseLanguage("es")}>ES</button>
      <button className={lang === "en" ? "active" : ""} onClick={() => chooseLanguage("en")}>EN</button>
    </div>
  </header>;
}
