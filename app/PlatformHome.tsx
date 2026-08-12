import { FAQ } from "./faq";
import { reviewedDate } from "./reviewed";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { OFFICIAL } from "./sources";
import { ROUTES, type Lang } from "./routes";

const copy = {
  es: {
    eyebrow: "HERRAMIENTAS FINANCIERAS · EL SALVADOR",
    title: "Números importantes, explicados con claridad.",
    lead: "Calculadoras gratuitas para entender un préstamo, revisar una liquidación laboral, cobrar bien tus horas extras o estimar las retenciones de tu salario.",
    trust: "Sin registro · Tus datos no salen de tu dispositivo · Fuentes oficiales visibles",
    choose: "Elige una herramienta",
    chooseLead: "Cada calculadora vive en su propia página para que las reglas, resultados y fuentes sean fáciles de revisar.",
    loans: "Calculadora de préstamos", loansText: "Compara cuota, intereses, seguros, costo efectivo y el impacto de abonos a capital.", loansCta: "Calcular préstamo",
    settlement: "Finiquito e indemnización", settlementText: "Estima indemnización, vacaciones, aguinaldo y salario pendiente según la normativa laboral.", settlementCta: "Calcular finiquito",
    overtime: "Horas extras y recargos", overtimeText: "Calcula la hora extra diurna y nocturna, el recargo nocturno y los días de descanso y asueto.", overtimeCta: "Calcular horas extras",
    withholding: "Retenciones salariales", withholdingText: "Estima AFP, ISSS e ISR y consulta los tramos oficiales mensuales, quincenales y semanales.", withholdingCta: "Calcular retenciones",
    whyEyebrow: "POR QUÉ CONFIAR",
    whyTitle: "Cifras que puedes verificar",
    whyLead: "Una calculadora sirve de poco si no se puede auditar. Estas muestran la regla que aplican, el documento oficial del que sale y la fecha en que se revisó.",
    why: [
      ["Normativa citada", "Cada resultado enlaza al artículo del Código de Trabajo, al decreto o a la tabla de retención que lo respalda.", "§"],
      ["Cálculo en tu dispositivo", "Sin cuentas ni rastreo: las cifras que escribes se procesan en el navegador y no viajan a ningún servidor.", "◉"],
      ["Revisión con fecha", "Las reglas laborales y fiscales indican el día en que se leyeron de nuevo contra el texto oficial vigente.", "◷"],
      ["Fórmulas abiertas", "El proyecto es de código abierto: cualquiera puede revisar el cálculo o reportar una diferencia.", "↗"],
    ],
    verified: (date: string) => `Fuentes verificadas el ${date}`,
    faqEyebrow: "PREGUNTAS FRECUENTES",
    faqTitle: "Dudas comunes sobre salarios, finiquitos y préstamos",
    faqLead: "Respuestas cortas con la regla y la cifra que aplica en El Salvador. Cada calculadora explica el detalle en su propia página.",
  },
  en: {
    eyebrow: "FINANCIAL TOOLS · EL SALVADOR",
    title: "Important numbers, explained clearly.",
    lead: "Free calculators to understand a loan, review an employment settlement, get your overtime right or estimate deductions from your pay.",
    trust: "No signup · Your data stays on your device · Official sources included",
    choose: "Choose a tool",
    chooseLead: "Each calculator has its own page, making its rules, results and sources easier to review.",
    loans: "Loan calculator", loansText: "Compare payments, interest, insurance, effective cost and the impact of extra principal payments.", loansCta: "Calculate a loan",
    settlement: "Settlement and severance", settlementText: "Estimate severance, vacation, year-end bonus and unpaid salary under employment rules.", settlementCta: "Estimate settlement",
    overtime: "Overtime and surcharges", overtimeText: "Work out daytime and night overtime, the night surcharge and rest days and public holidays.", overtimeCta: "Calculate overtime",
    withholding: "Payroll withholding", withholdingText: "Estimate pension, ISSS and income tax and inspect the official monthly, twice-monthly and weekly bands.", withholdingCta: "Estimate withholding",
    whyEyebrow: "WHY TRUST THIS",
    whyTitle: "Figures you can check",
    whyLead: "A calculator is worth little if it cannot be audited. These show the rule they apply, the official document behind it and the date it was last checked.",
    why: [
      ["Rules cited", "Every result links to the article of the Labour Code, the decree or the withholding table behind it.", "§"],
      ["Calculated on your device", "No accounts and no tracking: what you type is processed in the browser and never travels to a server.", "◉"],
      ["Dated review", "Employment and tax rules state the day they were last read back against the official text in force.", "◷"],
      ["Open formulas", "The project is open source: anyone can review the calculation or report a difference.", "↗"],
    ],
    verified: (date: string) => `Sources verified on ${date}`,
    faqEyebrow: "FREQUENTLY ASKED",
    faqTitle: "Common questions about pay, settlements and loans",
    faqLead: "Short answers with the rule and the figure that applies in El Salvador. Each calculator explains the detail on its own page.",
  },
} as const;

const sourceLinks = {
  es: [
    ["Código de Trabajo", OFFICIAL.laborCode],
    ["MTPS", OFFICIAL.laborService],
    ["Ministerio de Hacienda", OFFICIAL.treasury],
    ["SSF", OFFICIAL.ssf],
  ],
  en: [
    ["Labour Code", OFFICIAL.laborCode],
    ["MTPS", OFFICIAL.laborService],
    ["Ministry of Finance", OFFICIAL.treasury],
    ["SSF", OFFICIAL.ssf],
  ],
} as const;

export default function PlatformHome({ lang }: { lang: Lang }) {
  const t = copy[lang];

  const tools = [
    { icon: "◎", title: t.loans, text: t.loansText, cta: t.loansCta, href: ROUTES[lang].loans, className: "loan" },
    { icon: "§", title: t.settlement, text: t.settlementText, cta: t.settlementCta, href: ROUTES[lang].settlement, className: "labor" },
    { icon: "◷", title: t.overtime, text: t.overtimeText, cta: t.overtimeCta, href: ROUTES[lang].overtime, className: "hours" },
    { icon: "%", title: t.withholding, text: t.withholdingText, cta: t.withholdingCta, href: ROUTES[lang].withholding, className: "tax" },
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
        {tools.map((tool, index) => <a className={`tool-card ${tool.className}`} href={tool.href} key={tool.href}>
          <div className="tool-card-top"><span>{`0${index + 1}`}</span><i>{tool.icon}</i></div>
          <h3>{tool.title}</h3><p>{tool.text}</p><b>{tool.cta}<span>→</span></b>
        </a>)}
      </div>
    </section>
    {/* The claims the hero makes in one line, each with the evidence behind it.
        A visitor deciding whether to trust a figure about their own salary has
        no other way to check who is doing the arithmetic. */}
    <section className="guide home-guide">
      <div className="guide-head"><p>{t.whyEyebrow}</p><h2>{t.whyTitle}</h2><span>{t.whyLead}</span></div>
      <div className="guide-grid">{t.why.map(([title, text, icon], index) => <article key={title}>
        <span>0{index + 1}</span><i>{icon}</i><h3>{title}</h3><p>{text}</p>
      </article>)}</div>
      <div className="guide-sources">
        <b>{t.verified(reviewedDate(lang))}</b>
        <div>{sourceLinks[lang].map(([label, href]) =>
          <a href={href} target="_blank" rel="noreferrer" key={href}>{label}<span>↗</span></a>)}</div>
      </div>
    </section>
    <section className="home-faq">
      <div className="directory-head"><div><p>{t.faqEyebrow}</p><h2>{t.faqTitle}</h2></div><span>{t.faqLead}</span></div>
      <div className="faq-grid">{FAQ[lang].map(({ question, answer }) => <article key={question}>
        <h3>{question}</h3><p>{answer}</p>
      </article>)}</div>
    </section>
    <SiteFooter lang={lang} />
  </main>;
}
