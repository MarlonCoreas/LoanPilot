import { reviewedLineFor } from "./reviewed";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import type { Lang } from "./routes";
import StatutoryTools from "./StatutoryTools";
import UtilityHero from "./UtilityHero";

const heroCopy = {
  es: {
    settlement: { title: "Calcula lo que corresponde al terminar tu empleo.", lead: "Estima indemnización o prestación, vacaciones, aguinaldo y salarios pendientes con reglas verificables." },
    withholding: { title: "Entiende cada descuento de tu salario.", lead: "Estima AFP, ISSS y renta con la tabla oficial de tu frecuencia de pago, o revisá tu boleta para ver de dónde sale cada diferencia." },
  },
  en: {
    settlement: { title: "Estimate what is due when employment ends.", lead: "Estimate severance or resignation benefit, vacation, year-end bonus and unpaid salary with auditable rules." },
    withholding: { title: "Understand every deduction from your pay.", lead: "Estimate pension, ISSS and income tax against the official table for your pay frequency, or check your payslip to see where each difference comes from." },
  },
} as const;

const guides = {
  es: {
    settlement: {
      eyebrow: "LOANPILOT LABORAL 101",
      title: "Las piezas de una liquidación laboral",
      lead: "El total no es una sola prestación. Estas son las variables que conviene revisar por separado antes de aceptar un cálculo.",
      items: [
        ["Tipo de terminación", "Despido injustificado y renuncia voluntaria tienen requisitos y prestaciones distintas.", "§"],
        ["Antigüedad", "Los años trabajados determinan la indemnización; la renuncia voluntaria exige al menos dos años continuos.", "◷"],
        ["Salario base y topes", "La prestación usa el salario ordinario diario, sujeto al límite legal vinculado al salario mínimo del sector.", "$"],
        ["Prestaciones pendientes", "Vacaciones con 30%, aguinaldo y salario pendiente se calculan aparte de la indemnización.", "+"],
      ],
    },
    withholding: {
      eyebrow: "LOANPILOT RENTA 101",
      title: "Los descuentos que forman tu pago neto",
      lead: "El ISR no se aplica directamente al salario bruto. Primero deben identificarse los aportes y la base gravada del período.",
      items: [
        ["Remuneración gravada", "Es el punto de partida para la tabla después de excluir conceptos no gravados y deducciones admitidas.", "$"],
        ["Aporte AFP", "El aporte laboral del 7.25% se descuenta del pago y reduce la remuneración sujeta a la tabla de renta.", "◷"],
        ["Aporte ISSS", "El trabajador aporta 3% hasta el techo de cotización aplicable; el exceso no aumenta este descuento.", "+"],
        ["Retención de renta", "Se calcula por tramos y en junio y diciembre el patrono realiza un recálculo acumulado.", "%"],
      ],
    },
  },
  en: {
    settlement: {
      eyebrow: "LOANPILOT EMPLOYMENT 101",
      title: "The pieces of an employment settlement",
      lead: "The total is not a single benefit. Review these variables separately before accepting a calculation.",
      items: [
        ["How employment ends", "Unjustified dismissal and voluntary resignation have different requirements and benefits.", "§"],
        ["Length of service", "Years worked determine severance; voluntary resignation requires at least two continuous years.", "◷"],
        ["Salary base and caps", "The benefit uses ordinary daily pay, subject to the statutory cap tied to the sector's minimum wage.", "$"],
        ["Outstanding benefits", "Vacation plus 30%, year-end bonus and unpaid salary are calculated separately from severance.", "+"],
      ],
    },
    withholding: {
      eyebrow: "LOANPILOT TAX 101",
      title: "The deductions that make up take-home pay",
      lead: "Income tax is not applied directly to gross pay. Contributions and the period's taxable base come first.",
      items: [
        ["Taxable remuneration", "This is the table's starting point after excluding non-taxable items and allowed deductions.", "$"],
        ["Pension contribution", "The 7.25% employee contribution is taken from pay and reduces remuneration subject to the tax table.", "◷"],
        ["ISSS contribution", "The employee contributes 3% up to the applicable ceiling; earnings above it do not increase this deduction.", "+"],
        ["Income-tax withholding", "It uses progressive bands, with a cumulative employer recalculation in June and December.", "%"],
      ],
    },
  },
} as const;

function LegalGuide({ lang, page }: { lang: Lang; page: "settlement" | "withholding" }) {
  const guide = guides[lang][page];
  return <section className="guide legal-guide">
    <div className="guide-head"><p>{guide.eyebrow}</p><h2>{guide.title}</h2><span>{guide.lead}</span></div>
    <div className="guide-grid">{guide.items.map(([title, text, icon], index) => <article key={title}>
      <span>0{index + 1}</span><i>{icon}</i><h3>{title}</h3><p>{text}</p>
    </article>)}</div>
  </section>;
}

export default function LegalPage({ lang, page }: { lang: Lang; page: "settlement" | "withholding" }) {
  const hero = heroCopy[lang];
  return <main className="legal-page">
    <SiteHeader lang={lang} page={page} />
    <UtilityHero title={hero[page].title} lead={hero[page].lead} trust={reviewedLineFor(lang, page)} />
    <StatutoryTools lang={lang} tool={page} />
    <LegalGuide lang={lang} page={page} />
    <SiteFooter lang={lang} />
  </main>;
}
