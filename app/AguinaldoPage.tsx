import { useMemo, useState } from "react";
import {
  aguinaldoCutoffFor, aguinaldoPaymentDates, aguinaldoTax, AGUINALDO_TAX_PREVIEW,
  calculateAguinaldo,
} from "./aguinaldo";
import { CheckField, DateField, MoneyField, SegmentedField } from "./fields";
import { isoAfterMonths, todayIso } from "./loan";
import { downloadPdf } from "./pdf";
import { reviewedLineFor } from "./reviewed";
import { citationsFor, currentValue, aguinaldoScale, reviewedFor, RULE_USAGE } from "./rules";
import type { Lang } from "./routes";
import { ROUTES } from "./routes";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { OFFICIAL } from "./sources";
import { EARLIEST_EMPLOYMENT_DATE, withholdingForTaxable } from "./statutory";
import UtilityHero from "./UtilityHero";

/** Whether the reader is still on the payroll, which decides what day they are measured at. */
type Standing = "employed" | "ended";

const copy = {
  es: {
    heroTitle: "Cuánto aguinaldo te toca este año.",
    heroLead: "Los días que gana tu antigüedad al 20 de octubre, la parte proporcional si llevás menos de un año, y la fecha límite que tiene el patrono para pagarlo.",
    data: "Tus datos", dataHint: "Sector privado regido por el Código de Trabajo",
    standing: "Tu situación", employed: "Sigo laborando", ended: "Ya terminó la relación",
    start: "Fecha de ingreso", end: "Último día de trabajo",
    salary: "Salario mensual ordinario",
    salaryHint: "Incluye comisiones habituales promediadas, si aplican.",
    alreadyPaid: "El aguinaldo de este año ya me lo pagaron",
    result: "Estimación bruta", total: "Aguinaldo estimado",
    days: "Días de salario", scale: "Escala aplicada",
    seniority: "Antigüedad al corte", seniorityAtEnd: "Antigüedad al último día",
    dailySalary: "Salario diario ordinario", proportion: "Proporción del ciclo",
    daysLabel: "días", year: "año", yearPlural: "años", ofSalary: "de salario",
    measuredAt: "Medido al", cycleFrom: "Ciclo contado desde el",
    scaleTitle: "La escala del artículo 198", scaleFrom: "Desde", scaleDays: "Días de salario",
    scaleUnder: "Menos de 1 año", scaleUnderText: "La parte proporcional al tiempo trabajado en el ciclo.",
    scaleOne: "De 1 a menos de 3 años", scaleThree: "De 3 a menos de 10 años", scaleTen: "10 años o más",
    windowTitle: "Cuándo te lo tienen que pagar", windowSubtitle: "Art. 200 del Código de Trabajo, reformado en 2025",
    windowOpens: "Se puede pagar desde", windowCloses: "Fecha límite de pago",
    cutoffLabel: "Fecha de corte de la antigüedad",
    windowNote: "Antes de la reforma de 2025 la fecha de corte y la ventana de pago eran el 12 de diciembre. El D.L. 433 las movió: la antigüedad se lee al 20 de octubre y el pago va del 20 de octubre al 20 de diciembre de cada año. Pagarlo después de esa fecha es incumplimiento y se puede denunciar en el MTPS.",
    proportionalNote: "Se paga la parte proporcional al tiempo trabajado en el ciclo, no los días completos del escalón. Pasa en dos casos: cuando llevás menos de un año de servicio, y cuando la relación terminó antes de la fecha de corte y por eso no alcanzaste el ciclo entero.",
    cycleNote: "El período sobre el que se cuenta la proporción no está fijado por ningún artículo del capítulo VII. Aquí se usa el año calendario, que es lo que sostiene el MTPS al explicar el pago anticipado; también se usa en el país el ciclo que cierra el 12 de diciembre. Si tu caso es proporcional, esa diferencia mueve la cifra y conviene contrastarla.",
    ambiguousLead: "Tu último día cae antes del 20 de octubre y la antigüedad cambia de escalón entre esas dos fechas. Aquí se usa la escala del último día trabajado",
    ambiguousMid: "días, que es la lectura que no presupone tiempo no trabajado. Con la escala del 20 de octubre serían",
    ambiguousTail: "días. La reforma no dice expresamente qué escala rige para quien terminó antes del corte; si la diferencia te importa, consultalo con el MTPS.",
    notYet: "Con esa fecha de ingreso todavía no se genera aguinaldo para este ciclo: la estimación se hace sobre el corte del año siguiente.",
    paidNote: "Marcaste que ya te lo pagaron, así que la estimación queda en cero. Desmarcá la casilla para ver lo que correspondía.",
    grossNote: "Es una estimación bruta. El aguinaldo tiene un tratamiento de renta propio que esta página todavía no calcula, y el resultado no incluye ningún descuento.",
    invalid: "Revisá las fechas: el último día de trabajo debe ser posterior al ingreso y ambas deben caer entre 1950 y 2100.",
    sources: "Fuentes y reglas aplicadas",
    related: "Seguí con", relatedSettlement: "Finiquito completo", relatedSettlementText: "Si ya terminó la relación, el aguinaldo es una línea de un cálculo más grande: indemnización, vacaciones y salario pendiente.",
    relatedWithholding: "Retenciones de tu salario", relatedWithholdingText: "AFP, ISSS y renta del pago ordinario, con las tablas oficiales y la revisión de tu boleta.",
    exportPdf: "Descargar PDF", exportHint: "Llevate el cálculo",
    pdfTitle: "Estimación de aguinaldo", pdfSubtitle: "Sector privado · Código de Trabajo de El Salvador",
    pdfInput: "Dato usado", pdfValue: "Valor", pdfConcept: "Concepto", pdfAmount: "Monto",
    pdfYes: "Sí", pdfNo: "No",
    pdfNotAdvice: "Estimación educativa calculada en el navegador de quien la generó; no sustituye asesoría legal o contable.",
    pdfSlug: "aguinaldo",
    guideEyebrow: "LOANPILOT AGUINALDO 101",
    guideTitle: "Cómo se arma tu aguinaldo",
    guideLead: "No es un mes de salario para todo el mundo. Son cuatro piezas, y conviene revisarlas por separado antes de aceptar una cifra.",
    guide: [
      ["Antigüedad al corte", "Los años completos que llevás al 20 de octubre deciden el escalón: 15, 19 o 21 días de salario.", "◷"],
      ["Salario diario", "El aguinaldo se paga en días de salario, y el diario sale del salario mensual ordinario dividido entre 30.", "$"],
      ["Parte proporcional", "Con menos de un año, o si entraste durante el ciclo, se paga la fracción del período efectivamente trabajado.", "+"],
      ["Fecha límite", "El pago va del 20 de octubre al 20 de diciembre. Después de esa fecha hay incumplimiento denunciable.", "§"],
    ],
    helpStart: "El primer día que trabajaste para este patrono, tal como aparece en el contrato. De aquí sale la antigüedad, que define el escalón de días.",
    helpEnd: "El último día que trabajaste, no el día que te avisaron ni el día que te pagaron. Se cuenta como día trabajado.",
    helpSalary: "El salario mensual ordinario, antes de descuentos. Si tenés comisiones habituales, promedialas y sumalas; no incluyas viáticos.",
    taxTitle: "Tratamiento de renta", taxGross: "Aguinaldo bruto", taxExempt: "Porción exenta",
    taxBase: "Base gravada", taxWithheld: "Retención estimada", taxNet: "Neto estimado",
  },
  en: {
    heroTitle: "How much year-end bonus you are owed.",
    heroLead: "The days your length of service earns at 20 October, the proportional share if you have been there under a year, and the deadline your employer has to pay it.",
    data: "Your details", dataHint: "Private sector governed by the Labour Code",
    standing: "Where you stand", employed: "Still employed", ended: "The job has ended",
    start: "Employment start date", end: "Last day worked",
    salary: "Ordinary monthly salary",
    salaryHint: "Include averaged recurring commissions, when applicable.",
    alreadyPaid: "This year's bonus has already been paid to me",
    result: "Gross estimate", total: "Estimated year-end bonus",
    days: "Days of salary", scale: "Scale applied",
    seniority: "Service at the cutoff", seniorityAtEnd: "Service at the last day worked",
    dailySalary: "Ordinary daily salary", proportion: "Share of the cycle",
    daysLabel: "days", year: "year", yearPlural: "years", ofSalary: "of salary",
    measuredAt: "Measured at", cycleFrom: "Cycle counted from",
    scaleTitle: "The article 198 scale", scaleFrom: "From", scaleDays: "Days of salary",
    scaleUnder: "Under 1 year", scaleUnderText: "The share proportional to the time worked in the cycle.",
    scaleOne: "1 to under 3 years", scaleThree: "3 to under 10 years", scaleTen: "10 years or more",
    windowTitle: "When it has to be paid", windowSubtitle: "Labour Code article 200, as amended in 2025",
    windowOpens: "Can be paid from", windowCloses: "Payment deadline",
    cutoffLabel: "Date length of service is read at",
    windowNote: "Before the 2025 reform the cutoff and the payment window were both 12 December. D.L. 433 moved them: service is read at 20 October and payment runs from 20 October to 20 December each year. Paying after that date is a breach and can be reported to the MTPS.",
    proportionalNote: "What is paid is the share proportional to the time worked in the cycle, not the step's full days. It happens in two cases: where you have under a year of service, and where the job ended before the cutoff so you did not reach the whole cycle.",
    cycleNote: "No article of chapter VII fixes the period the proportion runs over. The calendar year is used here, which is what the MTPS supports when it explains early payment; a cycle closing on 12 December is also in use in the country. Where your case is proportional, that difference moves the figure and is worth checking.",
    ambiguousLead: "Your last day falls before 20 October, and length of service crosses a step between those two dates. The scale used here is the one at the last day worked",
    ambiguousMid: "days, the reading that does not assume time that was not worked. On the 20 October scale it would be",
    ambiguousTail: "days. The reform does not expressly say which scale governs someone whose contract ended before the cutoff; if the difference matters to you, check it with the MTPS.",
    notYet: "With that start date no bonus accrues for this cycle yet, so the estimate is made against the following year's cutoff.",
    paidNote: "You ticked that it has already been paid, so the estimate stays at zero. Untick the box to see what was due.",
    grossNote: "This is a gross estimate. The year-end bonus has an income-tax treatment of its own that this page does not yet work out, and the result carries no deductions.",
    invalid: "Check the dates: the last day worked must be after the start date and both must fall between 1950 and 2100.",
    sources: "Sources and rules applied",
    related: "Carry on with", relatedSettlement: "The full settlement", relatedSettlementText: "Where the job has ended, the bonus is one line of a bigger calculation: severance, vacation and unpaid salary.",
    relatedWithholding: "Deductions from your pay", relatedWithholdingText: "Pension, ISSS and income tax on ordinary pay, with the official tables and a payslip check.",
    exportPdf: "Download PDF", exportHint: "Take the calculation with you",
    pdfTitle: "Year-end bonus estimate", pdfSubtitle: "Private sector · Labour Code of El Salvador",
    pdfInput: "Detail used", pdfValue: "Value", pdfConcept: "Concept", pdfAmount: "Amount",
    pdfYes: "Yes", pdfNo: "No",
    pdfNotAdvice: "An educational estimate, worked out in the browser of whoever generated it; it is not legal or accounting advice.",
    pdfSlug: "year-end-bonus",
    guideEyebrow: "LOANPILOT BONUS 101",
    guideTitle: "How your year-end bonus is built",
    guideLead: "It is not a month's salary for everyone. It is four pieces, and they are worth reviewing separately before accepting a figure.",
    guide: [
      ["Service at the cutoff", "The complete years you have reached at 20 October decide the step: 15, 19 or 21 days of salary.", "◷"],
      ["Daily salary", "The bonus is paid in days of salary, and the daily figure is the ordinary monthly salary divided by 30.", "$"],
      ["Proportional share", "Under a year, or where you joined mid-cycle, what is paid is the fraction of the period actually worked.", "+"],
      ["The deadline", "Payment runs from 20 October to 20 December. After that date there is a breach that can be reported.", "§"],
    ],
    helpStart: "The first day you worked for this employer, as the contract states it. Length of service comes from here, and it sets the step.",
    helpEnd: "The last day you actually worked — not the day you were told, nor the day you were paid. It counts as a worked day.",
    helpSalary: "The ordinary monthly salary before deductions. Average any recurring commissions and add them; leave out travel allowances.",
    taxTitle: "Income-tax treatment", taxGross: "Gross bonus", taxExempt: "Exempt portion",
    taxBase: "Taxable base", taxWithheld: "Estimated withholding", taxNet: "Estimated net",
  },
} as const;

const number = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const LATEST_END_DATE = `${Number(todayIso().slice(0, 4)) + 1}-12-31`;

export default function AguinaldoPage({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const money = useMemo(() => new Intl.NumberFormat(lang === "es" ? "es-SV" : "en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
  }), [lang]);
  const longDate = useMemo(() => new Intl.DateTimeFormat(lang === "es" ? "es-SV" : "en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }), [lang]);
  const date = (iso: string) => longDate.format(new Date(`${iso}T00:00:00Z`));

  const [standing, setStanding] = useState<Standing>("employed");
  const [startDate, setStartDate] = useState(() => isoAfterMonths(-36));
  const [endDate, setEndDate] = useState(todayIso);
  const [monthlySalary, setMonthlySalary] = useState("900");
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  const bonus = useMemo(() => {
    const thisYear = Number(todayIso().slice(0, 10).slice(0, 4));
    // Someone hired after this year's cutoff has not reached it and never will;
    // their first bonus is the next one, so that is the cycle they are shown.
    // Measuring them against a cutoff they were not employed at would answer
    // "nothing", which is true of a date that has already passed and useless as
    // an answer to what they will be paid.
    const notYet = standing === "employed" && startDate > aguinaldoCutoffFor(thisYear);
    const year = notYet ? thisYear + 1 : thisYear;
    // Still employed: measured at the qualifying date, which is the day
    // article 198 reads seniority and article 197 fully earns the bonus.
    const measuredTo = standing === "employed" ? aguinaldoCutoffFor(year) : endDate;
    const invalid = standing === "ended"
      && (endDate < startDate || startDate < EARLIEST_EMPLOYMENT_DATE || endDate > LATEST_END_DATE);
    return {
      notYet, year, measuredTo, invalid,
      ...calculateAguinaldo({
        startDate, endDate: measuredTo, monthlySalary: number(monthlySalary), alreadyPaid,
      }),
    };
  }, [alreadyPaid, endDate, monthlySalary, standing, startDate]);

  const payment = useMemo(() => aguinaldoPaymentDates(bonus.year), [bonus.year]);
  const scale = currentValue(aguinaldoScale);
  const citations = useMemo(() => citationsFor(RULE_USAGE.aguinaldo, bonus.measuredTo), [bonus.measuredTo]);
  const proportional = bonus.fraction > 0 && bonus.fraction < 1;

  /**
   * The bonus as a document.
   *
   * Same shape as the settlement's, and for the same reason: a figure somebody
   * takes to a human resources desk has to carry the seniority it was read at,
   * the scale that produced it and the articles behind it, or it is a number
   * with no argument attached. The deadline goes in as its own row, because on
   * a printed page that is the line that does work after the conversation.
   */
  const exportPdf = () => {
    const notes: string[] = [t.windowNote];
    if (proportional) notes.push(t.proportionalNote, t.cycleNote);
    if (bonus.scaleAmbiguous) {
      notes.push(`${t.ambiguousLead} (${bonus.scaleDays} ${t.daysLabel}): ${money.format(bonus.amount)} ${t.ambiguousMid} (${bonus.alternativeScaleDays} ${t.daysLabel}): ${money.format(bonus.alternativeAmount)} ${t.ambiguousTail}`);
    }
    if (bonus.notYet) notes.push(t.notYet);

    return downloadPdf({
      slug: t.pdfSlug,
      title: t.pdfTitle,
      subtitle: `${t.pdfSubtitle} · ${standing === "employed" ? t.employed : t.ended}`,
      tables: [
        {
          head: [t.pdfInput, t.pdfValue],
          body: [
            [t.standing, standing === "employed" ? t.employed : t.ended],
            [t.start, date(startDate)],
            ...(standing === "ended" ? [[t.end, date(endDate)]] : []),
            [t.salary, money.format(number(monthlySalary))],
            [t.alreadyPaid, alreadyPaid ? t.pdfYes : t.pdfNo],
            [t.measuredAt, date(bonus.measuredTo)],
            [t.cycleFrom, date(bonus.cycleStartDate)],
          ],
        },
        {
          head: [t.pdfConcept, t.pdfAmount],
          body: [
            [bonus.reachedCutoff ? t.seniority : t.seniorityAtEnd, `${bonus.completedYears} ${bonus.completedYears === 1 ? t.year : t.yearPlural}`],
            [t.scale, `${bonus.scaleDays} ${t.daysLabel}`],
            [t.proportion, `${(bonus.fraction * 100).toFixed(1)}%`],
            [t.dailySalary, money.format(bonus.dailySalary)],
            [t.days, `${bonus.days.toFixed(2)} ${t.daysLabel}`],
            [t.total, money.format(bonus.amount)],
          ],
          totalRow: 5,
          numeric: [1],
        },
        {
          head: [t.windowTitle, t.pdfValue],
          body: [
            [t.cutoffLabel, date(bonus.cutoffDate)],
            [t.windowOpens, date(payment.opens)],
            [t.windowCloses, date(payment.closes)],
          ],
        },
      ],
      notes,
      citations,
      reviewed: reviewedFor("aguinaldo"),
      disclaimer: `${t.grossNote} ${t.pdfNotAdvice}`,
    }, lang);
  };

  /**
   * The fiscal panel, which is written and switched off. See
   * `AGUINALDO_TAX_PREVIEW`: the $1,500 exemption was transitory for the 2025
   * fiscal year and nothing published as of August 2026 says what replaces it.
   * Showing a figure here would be the one thing this site cannot afford.
   */
  const tax = AGUINALDO_TAX_PREVIEW
    ? aguinaldoTax({
      bonus: bonus.amount,
      exemption: { kind: "amount", amount: 1500 },
      withhold: (taxable) => withholdingForTaxable(taxable, "monthly").amount,
    })
    : undefined;

  return <main className="legal-page">
    <SiteHeader lang={lang} page="aguinaldo" />
    <UtilityHero title={t.heroTitle} lead={t.heroLead} trust={reviewedLineFor(lang, "aguinaldo")} />
    <section className="statutory-tools standalone-tools" id="tools">
      {!bonus.invalid && bonus.amount > 0 && <div className="shell-toolbar export-toolbar">
        <div className="export-actions">
          <span>{t.exportHint}</span>
          <button type="button" onClick={exportPdf}><i>PDF</i>{t.exportPdf}</button>
        </div>
      </div>}
      <div className="calculator-grid">
        <div className="form-panel">
          <div className="section-title"><span>01</span><div><h2>{t.data}</h2><p>{t.dataHint}</p></div></div>
          <div className="field-grid">
            <SegmentedField full label={t.standing} lang={lang} value={standing} onChange={setStanding}
              options={[{ value: "employed", label: t.employed }, { value: "ended", label: t.ended }] as const} />
            <DateField label={t.start} lang={lang} value={startDate} onChange={setStartDate}
              min={EARLIEST_EMPLOYMENT_DATE} max={standing === "ended" ? endDate : undefined} help={t.helpStart} />
            {standing === "ended" && <DateField label={t.end} lang={lang} value={endDate} onChange={setEndDate}
              min={startDate} max={LATEST_END_DATE} help={t.helpEnd} />}
            <MoneyField label={t.salary} lang={lang} value={monthlySalary} onChange={setMonthlySalary}
              note={t.salaryHint} help={t.helpSalary} />
          </div>
          <CheckField label={t.alreadyPaid} checked={alreadyPaid} onChange={setAlreadyPaid} />
          {/* The scale on screen, not just applied. It is four rows and it is
              the whole of article 198: a reader who can see it can check the
              step they were given without taking this page's word for it. */}
          <div className="section-title second"><span>02</span><div><h2>{t.scaleTitle}</h2><p>Código de Trabajo art. 198</p></div></div>
          <div className="law-table-wrap"><table className="law-table"><thead><tr><th>{t.scaleFrom}</th><th>{t.scaleDays}</th></tr></thead><tbody>
            <tr className={bonus.completedYears < 1 ? "current" : ""}><td>{t.scaleUnder}</td><td>{t.scaleUnderText}</td></tr>
            {scale.slice().reverse().map((step) => {
              const label = step.fromCompletedYears === 0 ? t.scaleOne
                : step.fromCompletedYears === 3 ? t.scaleThree : t.scaleTen;
              const current = bonus.completedYears >= 1 && bonus.scaleDays === step.days;
              return <tr key={step.days} className={current ? "current" : ""}>
                <td>{label}</td><td>{step.days} {t.daysLabel} {t.ofSalary}</td>
              </tr>;
            })}
          </tbody></table></div>
        </div>
        <div className="results-panel">
          <div className="results-kicker">{t.result}</div>
          {bonus.invalid ? <div className="warning">! {t.invalid}</div> : <>
            <div className="result-headline">
              <span>{t.total}</span><strong>{money.format(bonus.amount)}</strong>
              <small>{bonus.days.toFixed(2)} {t.daysLabel} · {t.measuredAt} {date(bonus.measuredTo)}</small>
            </div>
            <div className="result-tiles">
              <div className="highlight"><span>{t.days}</span><b>{bonus.days.toFixed(2)}</b><i>{t.scale}: {bonus.scaleDays} {t.daysLabel}</i></div>
              <div><span>{bonus.reachedCutoff ? t.seniority : t.seniorityAtEnd}</span><b>{bonus.completedYears} {bonus.completedYears === 1 ? t.year : t.yearPlural}</b></div>
              <div><span>{t.dailySalary}</span><b>{money.format(bonus.dailySalary)}</b></div>
              <div><span>{t.proportion}</span><b>{(bonus.fraction * 100).toFixed(1)}%</b><i>{t.cycleFrom} {date(bonus.cycleStartDate)}</i></div>
            </div>
            {tax && <div className="tax-base-flow">
              <span>{t.taxGross}<b>{money.format(tax.gross)}</b></span><i>−</i>
              <span>{t.taxExempt}<b>{money.format(tax.exempt)}</b></span><i>=</i>
              <span>{t.taxBase}<b>{money.format(tax.taxable)}</b></span><i>→</i>
              <span>{t.taxNet}<b>{money.format(tax.net)}</b><small>{t.taxWithheld}: {money.format(tax.withheld)}</small></span>
            </div>}
            {alreadyPaid && <div className="callout"><span>i</span><p>{t.paidNote}</p></div>}
            {bonus.notYet && <div className="callout warn"><span>!</span><p>{t.notYet}</p></div>}
            {bonus.scaleAmbiguous && <div className="callout"><span>?</span><p>{t.ambiguousLead} ({bonus.scaleDays} {t.daysLabel}): <b>{money.format(bonus.amount)}</b> {t.ambiguousMid} ({bonus.alternativeScaleDays} {t.daysLabel}): <b>{money.format(bonus.alternativeAmount)}</b> {t.ambiguousTail}</p></div>}
            {proportional && <><div className="callout"><span>§</span><p>{t.proportionalNote}</p></div>
              <div className="callout"><span>?</span><p>{t.cycleNote}</p></div></>}
          </>}
          <p className="legal-disclaimer">{t.grossNote}</p>
        </div>
      </div>
      {/* The deadline is the one figure on this page a reader can act on, so it
          gets a band of its own rather than a line in a results tile. */}
      <section className="recalc-band">
        <div className="section-title"><span>03</span><div><h2>{t.windowTitle}</h2><p>{t.windowSubtitle}</p></div></div>
        <div className="recalc-outcome">
          <div><span>{t.cutoffLabel}</span><b>{date(bonus.cutoffDate)}</b></div>
          <i aria-hidden="true">→</i>
          <div><span>{t.windowOpens}</span><b>{date(payment.opens)}</b></div>
          <i aria-hidden="true">→</i>
          <div className="recalc-result"><span>{t.windowCloses}</span><strong>{date(payment.closes)}</strong></div>
        </div>
        <div className="recalc-notes"><div className="callout"><span>§</span><p>{t.windowNote}</p></div></div>
      </section>
      {/* Built from the rules the page applies, not hand-written: an article
          listed here cannot fall behind the figure it is a citation for. */}
      <div className="source-panel"><h2>{t.sources}</h2><div className="source-links">
        {citations.map((citation, index) => <a key={citation.norm} href={OFFICIAL[citation.source]} target="_blank" rel="noreferrer">
          <b>{String(index + 1).padStart(2, "0")}</b>{citation.norm}<span>↗</span>
        </a>)}
      </div></div>
      <div className="source-panel related-panel"><h2>{t.related}</h2><div className="source-links">
        <a href={ROUTES[lang].settlement}><b>→</b>{t.relatedSettlement}: {t.relatedSettlementText}<span /></a>
        <a href={ROUTES[lang].withholding}><b>→</b>{t.relatedWithholding}: {t.relatedWithholdingText}<span /></a>
      </div></div>
    </section>
    <section className="guide legal-guide">
      <div className="guide-head"><p>{t.guideEyebrow}</p><h2>{t.guideTitle}</h2><span>{t.guideLead}</span></div>
      <div className="guide-grid">{t.guide.map(([title, text, icon], index) => <article key={title}>
        <span>0{index + 1}</span><i>{icon}</i><h3>{title}</h3><p>{text}</p>
      </article>)}</div>
    </section>
    <SiteFooter lang={lang} />
  </main>;
}
