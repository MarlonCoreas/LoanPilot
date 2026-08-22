import { buildStamp } from "./build";
import { PAGE_LABELS, ROUTES, TOOL_PAGES, type Lang } from "./routes";
import { OFFICIAL } from "./sources";

const copy = {
  es: {
    statement: "Herramientas claras para decisiones financieras, laborales y fiscales en El Salvador.",
    private: "Privado por diseño", privateText: "Sin cuentas ni seguimiento. Tus datos permanecen en tu dispositivo.",
    tools: "Herramientas",
    sources: "Fuentes oficiales", ssf: "Tasas y cargos · SSF", mtps: "Cálculo laboral · MTPS", treasury: "Tablas de renta · Hacienda",
    transparency: "Transparencia", disputed: "Reglas en disputa", disputedHint: "Dónde la ley admite más de una lectura",
    independent: "Proyecto independiente de", disclaimer: "Estimaciones educativas; no sustituyen asesoría financiera, contable o legal.",
    report: "Reportar una diferencia de cálculo",
  },
  en: {
    statement: "Clear tools for financial, employment and tax decisions in El Salvador.",
    private: "Private by design", privateText: "No accounts or tracking. Your data stays on your device.",
    tools: "Tools",
    sources: "Official sources", ssf: "Rates and charges · SSF", mtps: "Employment calculation · MTPS", treasury: "Tax tables · Treasury",
    transparency: "Transparency", disputed: "Disputed rules", disputedHint: "Where the law allows more than one reading",
    independent: "An independent project by", disclaimer: "Educational estimates; not a substitute for financial, accounting or legal advice.",
    report: "Report a calculation difference",
  },
} as const;

export default function SiteFooter({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const stamp = buildStamp(lang);
  return <footer className="site-footer">
    <div className="footer-main">
      <div className="footer-intro">
        <a className="brand footer-brand" href={ROUTES[lang].home} aria-label="LoanPilot"><span>LP</span> LoanPilot</a>
        <p>{t.statement}</p>
        <div className="footer-privacy"><i>✓</i><span><b>{t.private}</b><small>{t.privateText}</small></span></div>
      </div>
      <nav className="footer-column" aria-label={t.tools}>
        <h2>{t.tools}</h2>
        {TOOL_PAGES.map((page) =>
          <a key={page} href={ROUTES[lang][page]}>{PAGE_LABELS[lang][page]}<span>→</span></a>)}
      </nav>
      {/* Its own column, and not a line under "Herramientas": the page is the
          strongest thing the site has to say about itself, and filing it with
          the calculators would read as a sixth calculator. */}
      <nav className="footer-column" aria-label={t.transparency}>
        <h2>{t.transparency}</h2>
        <a className="footer-feature" href={ROUTES[lang].disputed}>
          {t.disputed}<small>{t.disputedHint}</small><span>→</span>
        </a>
      </nav>
      <nav className="footer-column" aria-label={t.sources}>
        <h2>{t.sources}</h2>
        <a href={OFFICIAL.ssf} target="_blank" rel="noreferrer">{t.ssf}<span>↗</span></a>
        <a href={OFFICIAL.laborService} target="_blank" rel="noreferrer">{t.mtps}<span>↗</span></a>
        <a href={OFFICIAL.treasury} target="_blank" rel="noreferrer">{t.treasury}<span>↗</span></a>
      </nav>
    </div>
    <div className="footer-bottom">
      {/* The build stamp rides with the copyright line rather than getting a
          row of its own: it is for the person checking which version they are
          reading, and it should not read as a claim the site is making. */}
      <p>© 2026 LoanPilot · {t.independent} <a href="https://marloncoreas.com">marloncoreas.com</a>
        {stamp !== undefined && <small className="build-stamp">{stamp}</small>}</p>
      <div><span>{t.disclaimer}</span><a href={OFFICIAL.issues} target="_blank" rel="noreferrer">{t.report} ↗</a></div>
    </div>
  </footer>;
}
