import { PAGE_LABELS, ROUTES, type Lang, type Page } from "./routes";
import { OFFICIAL } from "./sources";

const copy = {
  es: {
    statement: "Herramientas claras para decisiones financieras, laborales y fiscales en El Salvador.",
    private: "Privado por diseño", privateText: "Sin cuentas ni seguimiento. Tus datos permanecen en tu dispositivo.",
    tools: "Herramientas",
    sources: "Fuentes oficiales", ssf: "Tasas y cargos · SSF", mtps: "Cálculo laboral · MTPS", treasury: "Tablas de renta · Hacienda",
    independent: "Proyecto independiente de", disclaimer: "Estimaciones educativas; no sustituyen asesoría financiera, contable o legal.",
    report: "Reportar una diferencia de cálculo",
  },
  en: {
    statement: "Clear tools for financial, employment and tax decisions in El Salvador.",
    private: "Private by design", privateText: "No accounts or tracking. Your data stays on your device.",
    tools: "Tools",
    sources: "Official sources", ssf: "Rates and charges · SSF", mtps: "Employment calculation · MTPS", treasury: "Tax tables · Treasury",
    independent: "An independent project by", disclaimer: "Educational estimates; not a substitute for financial, accounting or legal advice.",
    report: "Report a calculation difference",
  },
} as const;

export default function SiteFooter({ lang }: { lang: Lang }) {
  const t = copy[lang];
  return <footer className="site-footer">
    <div className="footer-main">
      <div className="footer-intro">
        <a className="brand footer-brand" href={ROUTES[lang].home} aria-label="LoanPilot"><span>LP</span> LoanPilot</a>
        <p>{t.statement}</p>
        <div className="footer-privacy"><i>✓</i><span><b>{t.private}</b><small>{t.privateText}</small></span></div>
      </div>
      <nav className="footer-column" aria-label={t.tools}>
        <h2>{t.tools}</h2>
        {(["loans", "settlement", "withholding"] as Page[]).map((page) =>
          <a key={page} href={ROUTES[lang][page]}>{PAGE_LABELS[lang][page]}<span>→</span></a>)}
      </nav>
      <nav className="footer-column" aria-label={t.sources}>
        <h2>{t.sources}</h2>
        <a href={OFFICIAL.ssf} target="_blank" rel="noreferrer">{t.ssf}<span>↗</span></a>
        <a href={OFFICIAL.laborService} target="_blank" rel="noreferrer">{t.mtps}<span>↗</span></a>
        <a href={OFFICIAL.treasury} target="_blank" rel="noreferrer">{t.treasury}<span>↗</span></a>
      </nav>
    </div>
    <div className="footer-bottom">
      <p>© 2026 LoanPilot · {t.independent} <a href="https://marloncoreas.com">marloncoreas.com</a></p>
      <div><span>{t.disclaimer}</span><a href={OFFICIAL.issues} target="_blank" rel="noreferrer">{t.report} ↗</a></div>
    </div>
  </footer>;
}
