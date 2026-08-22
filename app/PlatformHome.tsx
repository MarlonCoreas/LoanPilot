import { FAQ } from "./faq";
import { reviewedDate } from "./reviewed";
import { institutionsCited } from "./rules";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { ROUTES, type Lang } from "./routes";

const copy = {
  es: {
    eyebrow: "HERRAMIENTAS FINANCIERAS · EL SALVADOR",
    title: "Calculadoras gratis para El Salvador, explicadas con claridad.",
    leadOpen: "Calculadoras gratuitas para", leadClose: ", sin registro y con la fuente oficial a la vista.",
    trust: "Sin registro · Tus datos no salen de tu dispositivo · Fuentes oficiales visibles",
    choose: "Elige una herramienta",
    chooseLead: "Cada calculadora vive en su propia página para que las reglas, resultados y fuentes sean fáciles de revisar.",
    loans: "Calculadora de préstamos", loansLead: "entender un préstamo", loansText: "Compara cuota, intereses, seguros, costo efectivo y el impacto de abonos a capital.", loansCta: "Calcular préstamo",
    creditCard: "Tarjeta de crédito", creditCardLead: "medir lo que cuesta la tarjeta", creditCardText: "Calcula cuánto tarda y cuánto interés cuesta pagar con el mínimo, y cuánto cambia si abonás algo más.", creditCardCta: "Calcular tarjeta",
    settlement: "Finiquito e indemnización", settlementLead: "revisar una liquidación laboral", settlementText: "Estima indemnización, vacaciones, aguinaldo y salario pendiente según la normativa laboral.", settlementCta: "Calcular finiquito",
    aguinaldo: "Aguinaldo", aguinaldoLead: "saber qué aguinaldo te toca", aguinaldoText: "Calcula los días que gana tu antigüedad, el ciclo sobre el que se cuentan y hasta cuándo tienen para pagártelo.", aguinaldoCta: "Calcular aguinaldo",
    overtime: "Horas extras y recargos", overtimeLead: "cobrar bien tus horas extras", overtimeText: "Calcula la hora extra diurna y nocturna, el recargo nocturno y los días de descanso y asueto.", overtimeCta: "Calcular horas extras",
    annualTax: "Renta anual", annualTaxLead: "ver cómo te queda la renta anual", annualTaxText: "Estima el impuesto del año contra lo retenido y si el saldo te queda a favor o en contra al declarar.", annualTaxCta: "Estimar el saldo",
    withholding: "Retenciones salariales", withholdingLead: "estimar las retenciones de tu salario", withholdingText: "Estima AFP, ISSS e ISR y consulta los tramos oficiales mensuales, quincenales y semanales.", withholdingCta: "Calcular retenciones",
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
    disputedEyebrow: "LO QUE NADIE MÁS PUBLICA",
    disputedTitle: "Las reglas que no están resueltas",
    disputedText: "Hay cifras de la normativa salvadoreña que admiten más de una lectura: el texto dice una cosa y el ministerio hace otra, o ningún artículo fija el dato. Este sitio las aplica igual, porque hay que dar una cifra, pero las nombra una por una: las dos lecturas, la que se usa aquí y por qué.",
    disputedCta: "Ver las reglas en disputa",
    faqEyebrow: "PREGUNTAS FRECUENTES",
    faqTitle: "Dudas comunes sobre salarios, finiquitos y préstamos",
    faqLead: "Respuestas cortas con la regla y la cifra que aplica en El Salvador. Cada calculadora explica el detalle en su propia página.",
  },
  en: {
    eyebrow: "FINANCIAL TOOLS · EL SALVADOR",
    title: "Free calculators for El Salvador, explained clearly.",
    leadOpen: "Free calculators to", leadClose: ", with no signup and the official source in view.",
    trust: "No signup · Your data stays on your device · Official sources included",
    choose: "Choose a tool",
    chooseLead: "Each calculator has its own page, making its rules, results and sources easier to review.",
    loans: "Loan calculator", loansLead: "understand a loan", loansText: "Compare payments, interest, insurance, effective cost and the impact of extra principal payments.", loansCta: "Calculate a loan",
    creditCard: "Credit card", creditCardLead: "see what a card really costs", creditCardText: "Work out how long the minimum payment takes and what it costs in interest, and how much an extra changes it.", creditCardCta: "Calculate a card",
    settlement: "Settlement and severance", settlementLead: "review an employment settlement", settlementText: "Estimate severance, vacation, year-end bonus and unpaid salary under employment rules.", settlementCta: "Estimate settlement",
    aguinaldo: "Year-end bonus", aguinaldoLead: "work out the year-end bonus you are owed", aguinaldoText: "Work out the days your length of service earns, the cycle they are counted over and the deadline to pay them.", aguinaldoCta: "Calculate the bonus",
    overtime: "Overtime and surcharges", overtimeLead: "get your overtime right", overtimeText: "Work out daytime and night overtime, the night surcharge and rest days and public holidays.", overtimeCta: "Calculate overtime",
    annualTax: "Annual return", annualTaxLead: "see how your annual return lands", annualTaxText: "Estimate the year's tax against what was withheld, and whether the balance lands in your favour or against you.", annualTaxCta: "Estimate the balance",
    withholding: "Payroll withholding", withholdingLead: "estimate the deductions from your pay", withholdingText: "Estimate pension, ISSS and income tax and inspect the official monthly, twice-monthly and weekly bands.", withholdingCta: "Estimate withholding",
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
    disputedEyebrow: "WHAT NOBODY ELSE PUBLISHES",
    disputedTitle: "The rules that are not settled",
    disputedText: "Some figures in Salvadoran law allow more than one reading: the text says one thing and the ministry does another, or no article fixes the figure at all. This site applies one anyway, because a number has to come out, but it names every such case: both readings, the one used here and why.",
    disputedCta: "See the disputed rules",
    faqEyebrow: "FREQUENTLY ASKED",
    faqTitle: "Common questions about pay, settlements and loans",
    faqLead: "Short answers with the rule and the figure that applies in El Salvador. Each calculator explains the detail on its own page.",
  },
} as const;

export default function PlatformHome({ lang }: { lang: Lang }) {
  const t = copy[lang];

  // ONE TABLE, TWO PLACES IT HAS TO BE TRUE. The grid below renders it, and the
  // hero sentence is composed from its `lead` phrases. The hand-written hero
  // named four tools while this list held seven for two releases and nothing
  // could notice: the sentence and the grid were separate prose, so adding a
  // calculator updated one of them. Adding a row here now moves both, and the
  // type checker asks for the phrase the sentence needs.
  const tools = [
    { icon: "◎", title: t.loans, lead: t.loansLead, text: t.loansText, cta: t.loansCta, href: ROUTES[lang].loans, className: "loan" },
    { icon: "▤", title: t.creditCard, lead: t.creditCardLead, text: t.creditCardText, cta: t.creditCardCta, href: ROUTES[lang].creditCard, className: "loan" },
    { icon: "§", title: t.settlement, lead: t.settlementLead, text: t.settlementText, cta: t.settlementCta, href: ROUTES[lang].settlement, className: "labor" },
    { icon: "★", title: t.aguinaldo, lead: t.aguinaldoLead, text: t.aguinaldoText, cta: t.aguinaldoCta, href: ROUTES[lang].aguinaldo, className: "labor" },
    { icon: "◷", title: t.overtime, lead: t.overtimeLead, text: t.overtimeText, cta: t.overtimeCta, href: ROUTES[lang].overtime, className: "hours" },
    { icon: "%", title: t.withholding, lead: t.withholdingLead, text: t.withholdingText, cta: t.withholdingCta, href: ROUTES[lang].withholding, className: "tax" },
    { icon: "∑", title: t.annualTax, lead: t.annualTaxLead, text: t.annualTaxText, cta: t.annualTaxCta, href: ROUTES[lang].annualTax, className: "tax" },
  ];

  // "a, b, c y d" in Spanish, "a, b, c and d" in English, from the runtime that
  // already knows the difference. Joining with a hand-written " y " would put
  // the one piece of grammar this sentence has back into the copy table.
  const lead = t.leadOpen + " "
    + new Intl.ListFormat(lang === "es" ? "es-SV" : "en-GB", { type: "conjunction" })
      .format(tools.map((tool) => tool.lead))
    + t.leadClose;

  return <main className="platform-home">
    <SiteHeader lang={lang} page="home" />
    <section className="platform-hero">
      <p>{t.eyebrow}</p>
      <h1>{t.title}</h1>
      <span>{lead}</span>
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
        {/* Derived from the registry, not typed here. The hand-kept version of
            this row named four documents while the calculators behind it cited
            fifteen, and nothing could notice. */}
        <div>{institutionsCited().map(({ name, href }) =>
          <a href={href} target="_blank" rel="noreferrer" key={name}>{name}<span>↗</span></a>)}</div>
      </div>
    </section>
    {/* The claim the rest of the section makes — that these figures can be
        audited — is only worth anything if the places where the law itself does
        not settle the answer are published too. That is the page this points
        at, and it earns a band rather than a link in a list. */}
    <section className="disputed-band">
      <div>
        <p>{t.disputedEyebrow}</p>
        <h2>{t.disputedTitle}</h2>
        <span>{t.disputedText}</span>
      </div>
      <a href={ROUTES[lang].disputed}>{t.disputedCta}<i aria-hidden="true">→</i></a>
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
