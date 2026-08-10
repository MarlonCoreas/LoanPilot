import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { PAGE_LABELS, ROUTES, type Lang } from "./routes";

const copy = {
  es: {
    eyebrow: "HERRAMIENTAS FINANCIERAS · EL SALVADOR",
    title: "Números importantes, explicados con claridad.",
    lead: "Calculadoras gratuitas para entender un préstamo, revisar una liquidación laboral o estimar las retenciones de tu salario.",
    trust: "Sin registro · Tus datos no salen de tu dispositivo · Fuentes oficiales visibles",
    choose: "Elige una herramienta",
    chooseLead: "Cada calculadora vive en su propia página para que las reglas, resultados y fuentes sean fáciles de revisar.",
    loans: "Calculadora de préstamos", loansText: "Compara cuota, intereses, seguros, costo efectivo y el impacto de abonos a capital.", loansCta: "Calcular préstamo",
    settlement: "Finiquito e indemnización", settlementText: "Estima indemnización, vacaciones, aguinaldo y salario pendiente según la normativa laboral.", settlementCta: "Calcular finiquito",
    withholding: "Retenciones salariales", withholdingText: "Estima AFP, ISSS e ISR y consulta los tramos oficiales mensuales, quincenales y semanales.", withholdingCta: "Calcular retenciones",
    local: "Diseñado para El Salvador", localText: "Las reglas laborales y fiscales muestran su fecha de actualización y enlazan directamente a las normas oficiales.",
  },
  en: {
    eyebrow: "FINANCIAL TOOLS · EL SALVADOR",
    title: "Important numbers, explained clearly.",
    lead: "Free calculators to understand a loan, review an employment settlement or estimate deductions from your pay.",
    trust: "No signup · Your data stays on your device · Official sources included",
    choose: "Choose a tool",
    chooseLead: "Each calculator has its own page, making its rules, results and sources easier to review.",
    loans: "Loan calculator", loansText: "Compare payments, interest, insurance, effective cost and the impact of extra principal payments.", loansCta: "Calculate a loan",
    settlement: "Settlement and severance", settlementText: "Estimate severance, vacation, year-end bonus and unpaid salary under employment rules.", settlementCta: "Estimate settlement",
    withholding: "Payroll withholding", withholdingText: "Estimate pension, ISSS and income tax and inspect the official monthly, twice-monthly and weekly bands.", withholdingCta: "Estimate withholding",
    local: "Built for El Salvador", localText: "Employment and tax rules show their update date and link directly to official sources.",
  },
} as const;

export default function PlatformHome({ lang }: { lang: Lang }) {
  const t = copy[lang];

  const tools = [
    { number: "01", icon: "◎", title: t.loans, text: t.loansText, cta: t.loansCta, href: ROUTES[lang].loans, className: "loan" },
    { number: "02", icon: "§", title: t.settlement, text: t.settlementText, cta: t.settlementCta, href: ROUTES[lang].settlement, className: "labor" },
    { number: "03", icon: "%", title: t.withholding, text: t.withholdingText, cta: t.withholdingCta, href: ROUTES[lang].withholding, className: "tax" },
  ];

  return <main className="platform-home">
    <SiteHeader lang={lang} page="home" />
    <section className="platform-hero">
      <p>{t.eyebrow}</p>
      <h1>{t.title}</h1>
      <span>{t.lead}</span>
      <div className="trust-line"><b>✓</b>{t.trust}</div>
    </section>
    <section className="tool-directory">
      <div className="directory-head"><div><p>LOANPILOT</p><h2>{t.choose}</h2></div><span>{t.chooseLead}</span></div>
      <div className="tool-cards">
        {tools.map((tool) => <a className={`tool-card ${tool.className}`} href={tool.href} key={tool.href}>
          <div className="tool-card-top"><span>{tool.number}</span><i>{tool.icon}</i></div>
          <h3>{tool.title}</h3><p>{tool.text}</p><b>{tool.cta}<span>→</span></b>
        </a>)}
      </div>
    </section>
    <section className="local-trust"><span>SV</span><div><h2>{t.local}</h2><p>{t.localText}</p></div></section>
    <SiteFooter lang={lang} />
  </main>;
}
