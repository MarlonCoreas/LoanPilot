import { useMemo, useState } from "react";
import { isoAfterMonths, todayIso } from "./loan";
import type { Lang } from "./routes";
import { OFFICIAL } from "./sources";
import {
  calculatePayrollWithholding, calculateSettlement, DAILY_MINIMUM_WAGE,
  DECEMBER_RECALC_TABLE, EARLIEST_EMPLOYMENT_DATE, JUNE_RECALC_TABLE, WITHHOLDING_TABLES,
  type EmploymentEnd, type PayFrequency, type WageSector, type WithholdingBand,
} from "./statutory";

type Tool = "settlement" | "withholding";


const copy = {
  es: {
    data: "Datos del empleo", result: "Estimación bruta", start: "Fecha de ingreso", end: "Último día de trabajo",
    salary: "Salario mensual ordinario", salaryHint: "Incluye comisiones habituales promediadas, si aplican.",
    cause: "Forma de terminación", dismissal: "Despido injustificado", resignation: "Renuncia voluntaria",
    sector: "Sector económico del empleador", pendingDays: "Días de salario pendientes",
    unusedVacation: "Períodos completos de vacaciones pendientes", aguinaldoPaid: "El aguinaldo de este año ya fue pagado",
    service: "Antigüedad estimada", year: "año", yearPlural: "años", month: "mes", monthPlural: "meses",
    total: "Total bruto estimado", indemnity: "Indemnización / prestación",
    vacation: "Vacaciones + 30%", aguinaldo: "Aguinaldo", pendingSalary: "Salario pendiente",
    quincena25: "Quincena 25", quincena25Note: "D.L. 499 art. 3: procede en despido o terminación con responsabilidad patronal, proporcional al tiempo del ciclo. Obligatoria para el sector privado desde 2027.",
    wageOutOfRange: "La salida es anterior a la tabla de salarios mínimos más antigua que hemos verificado. El tope se calcula con esa tabla y puede no ser la que estaba vigente ese día.",
    dailyBase: "Salario diario usado para la prestación", vacationDays: "Días de vacaciones incluidos",
    resignationOk: "La antigüedad cumple el mínimo de dos años. El derecho exige además preaviso y renuncia con las formalidades legales.",
    resignationNo: "No se alcanza el mínimo de dos años para la prestación por renuncia voluntaria.",
    resignationRule: "La prestación se estima sobre años completos: a diferencia del artículo 58, el artículo 8 no reconoce fracciones de año.",
    dismissalNote: "El artículo 58 reconoce 30 días por año y fracciones, con mínimo de 15 días y tope de cuatro salarios mínimos diarios.",
    grossNote: "Es una estimación bruta. Salario y vacaciones pueden llevar descuentos de planilla; la indemnización legal y la prestación por renuncia están exentas de renta. Convenios o contratos pueden mejorar estos mínimos.",
    sources: "Fuentes y reglas aplicadas", code: "Código de Trabajo: arts. 58, 140, 177, 187 y 196-202",
    officialCalc: "Servicio oficial de cálculo del MTPS", resignationLaw: "Ley de Renuncia Voluntaria: arts. 2, 5, 7-9",
    wageDecree: "D.E. 12/2025: tabla de salarios mínimos vigente desde junio 2025",
    aguinaldoReform: "Reforma 2025: aguinaldo y art. 202 al 20 de octubre",
    payrollData: "Datos del pago", gross: "Remuneración bruta del período", frequency: "Frecuencia de pago",
    monthly: "Mensual", fortnightly: "Quincenal", weekly: "Semanal", includeAfp: "Descontar AFP (7.25%)",
    includeIsss: "Descontar ISSS (3%, techo mensual $1,000)", fixedDeduction: "Aplicar deducción fija de renta cuando corresponda",
    isssApprox: "El ISSS se liquida en planilla mensual. Para pagos quincenales y semanales el techo se prorratea, así que el resultado puede diferir en centavos del descuento real.",
    annualGross: "Renta anual gravada estimada", annualGrossHint: "Opcional. Suma solo lo gravado con renta: aguinaldo y bonificaciones sí, la Quincena 25 no. Vacío, se anualiza el período.",
    annualUsed: "Renta anual usada para el límite de $9,100", annualEstimated: "estimada del período", annualDeclared: "indicada por ti",
    takeHome: "Pago neto estimado", isr: "Retención de renta", afp: "Aporte AFP", isss: "Aporte ISSS",
    taxableBefore: "Remuneración gravada antes de deducción fija", taxable: "Base usada en la tabla", band: "Tramo aplicado",
    fiscalDeduction: "Deducción fiscal prorrateada", notCash: "Reduce la base de renta; no se descuenta del pago.",
    noFixed: "La deducción fija de $1,600 corresponde a asalariados con monto anual igual o inferior a $9,100.",
    tableTitle: "Tabla oficial para pagos", from: "Desde", to: "Hasta", rate: "%", excess: "Sobre exceso de", fixed: "Cuota fija",
    noRetention: "Sin retención", onwards: "En adelante", recalc: "Tablas de recálculo de junio y diciembre",
    officialPdf: "PDF oficial",
    june: "Junio · acumulado enero-junio", december: "Diciembre · acumulado anual",
    recalcNote: "En junio y diciembre el patrono debe recalcular con las remuneraciones gravadas acumuladas y restar lo ya retenido. Esta calculadora muestra el período ordinario; las tablas acumuladas quedan visibles para auditoría.",
    taxDecree: "Decreto Ejecutivo 10/2025: tablas de retención", taxLaw: "Ley de Impuesto sobre la Renta: arts. 29, 37 y 65",
    isssSource: "ISSS: tasa laboral y techo de cotización", pensionSource: "SSF: Ley Integral del Sistema de Pensiones",
    invalidDates: "Revisa las fechas: el último día de trabajo debe ser posterior al ingreso y ambas deben caer entre 1950 y 2100.",
  },
  en: {
    data: "Employment details", result: "Gross estimate", start: "Employment start date", end: "Last day worked",
    salary: "Ordinary monthly salary", salaryHint: "Include averaged recurring commissions, when applicable.",
    cause: "How employment ends", dismissal: "Unjustified dismissal", resignation: "Voluntary resignation",
    sector: "Employer's economic sector", pendingDays: "Unpaid salary days",
    unusedVacation: "Complete unused vacation periods", aguinaldoPaid: "This year's year-end bonus was already paid",
    service: "Estimated service", year: "year", yearPlural: "years", month: "month", monthPlural: "months",
    total: "Estimated gross total", indemnity: "Severance / benefit",
    vacation: "Vacation + 30%", aguinaldo: "Year-end bonus", pendingSalary: "Unpaid salary",
    quincena25: "Quincena 25", quincena25Note: "Decree 499 art. 3: due on dismissal or termination with employer responsibility, prorated over the cycle. Mandatory for private employers from 2027.",
    wageOutOfRange: "The end date precedes the oldest minimum wage table we have verified. The cap uses that table, which may not be the one in force that day.",
    dailyBase: "Daily salary used for the benefit", vacationDays: "Vacation days included",
    resignationOk: "Service meets the two-year minimum. Entitlement also requires statutory notice and resignation formalities.",
    resignationNo: "Service does not meet the two-year minimum for the voluntary resignation benefit.",
    resignationRule: "The benefit is estimated on complete years: unlike article 58, article 8 does not recognise fractions of a year.",
    dismissalNote: "Article 58 grants 30 days per year and fractions, with a 15-day minimum and a cap of four daily minimum wages.",
    grossNote: "This is a gross estimate. Salary and vacation may have payroll deductions; statutory dismissal and resignation benefits are income-tax exempt. Agreements may improve these minimums.",
    sources: "Sources and rules applied", code: "Labor Code: articles 58, 140, 177, 187 and 196-202",
    officialCalc: "MTPS official calculation service", resignationLaw: "Voluntary Resignation Law: articles 2, 5 and 7-9",
    wageDecree: "Executive Decree 12/2025: minimum wage table in force since June 2025",
    aguinaldoReform: "2025 reform: year-end bonus and article 202 moved to 20 October",
    payrollData: "Pay details", gross: "Gross remuneration for the period", frequency: "Pay frequency",
    monthly: "Monthly", fortnightly: "Twice monthly", weekly: "Weekly", includeAfp: "Deduct pension contribution (7.25%)",
    includeIsss: "Deduct ISSS (3%, $1,000 monthly ceiling)", fixedDeduction: "Apply fixed income-tax deduction when eligible",
    isssApprox: "ISSS is settled on a monthly planilla. For twice-monthly and weekly pay the ceiling is prorated, so the result can differ by a few cents from the actual deduction.",
    annualGross: "Estimated annual taxable income", annualGrossHint: "Optional. Add up taxable pay only: the year-end bonus and bonuses count, the Quincena 25 does not. Left empty, the period is annualised.",
    annualUsed: "Annual income used for the $9,100 limit", annualEstimated: "annualised from the period", annualDeclared: "entered by you",
    takeHome: "Estimated take-home pay", isr: "Income-tax withholding", afp: "Pension contribution", isss: "ISSS contribution",
    taxableBefore: "Taxable remuneration before fixed deduction", taxable: "Table tax base", band: "Applied band",
    fiscalDeduction: "Prorated tax deduction", notCash: "Reduces the income-tax base; it is not taken from pay.",
    noFixed: "The $1,600 fixed deduction applies to employees with annual amounts of $9,100 or less.",
    tableTitle: "Official table for", from: "From", to: "To", rate: "%", excess: "Excess over", fixed: "Fixed amount",
    noRetention: "No withholding", onwards: "And above", recalc: "June and December recalculation tables",
    officialPdf: "Official PDF",
    june: "June · January-June cumulative", december: "December · annual cumulative",
    recalcNote: "In June and December, employers recalculate using cumulative taxable remuneration and subtract prior withholding. This calculator covers an ordinary pay period; the cumulative tables remain visible for audit.",
    taxDecree: "Executive Decree 10/2025: withholding tables", taxLaw: "Income Tax Law: articles 29, 37 and 65",
    isssSource: "ISSS: employee rate and contribution ceiling", pensionSource: "SSF: Integral Pension System Law",
    invalidDates: "Check the dates: the last day worked must be after the start date and both must fall between 1950 and 2100.",
  },
} as const;

const sectorLabels = {
  es: { commerce: "Comercio, servicios e industria", maquila: "Maquila textil", coffee: "Beneficios de café / caña", agriculture: "Agro, pesca / cosecha de café" },
  en: { commerce: "Commerce, services and industry", maquila: "Textile maquila", coffee: "Coffee processing / sugar cane", agriculture: "Agriculture / fishing / coffee" },
} as const;

function number(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
// A last day of work can legitimately be scheduled ahead of today, but only by
// so much; the rest of the range comes from the calculation module.
const LATEST_END_DATE = `${Number(todayIso().slice(0, 4)) + 1}-12-31`;

function serviceLabel(settlement: { completedYears: number; serviceMonths: number }, t: typeof copy.es | typeof copy.en) {
  const years = `${settlement.completedYears} ${settlement.completedYears === 1 ? t.year : t.yearPlural}`;
  if (settlement.serviceMonths === 0) return years;
  return `${years} · ${settlement.serviceMonths} ${settlement.serviceMonths === 1 ? t.month : t.monthPlural}`;
}

function MoneyInput({ label, value, onChange, note }: { label: string; value: string; onChange: (value: string) => void; note?: string }) {
  return <label className="field"><span>{label}</span><div className="input-wrap"><b className="prefix">$</b><input type="number" min="0" step="0.01" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} /></div>{note && <small className="field-note">{note}</small>}</label>;
}

function Table({ bands, t, money }: { bands: WithholdingBand[]; t: typeof copy.es | typeof copy.en; money: Intl.NumberFormat }) {
  return <div className="law-table-wrap"><table className="law-table"><thead><tr><th>{t.from}</th><th>{t.to}</th><th>{t.rate}</th><th>{t.excess}</th><th>{t.fixed}</th></tr></thead><tbody>{bands.map((band) => <tr key={band.from}><td>{money.format(band.from)}</td><td>{band.to === null ? t.onwards : money.format(band.to)}</td><td>{band.rate === 0 ? t.noRetention : `${band.rate * 100}%`}</td><td>{band.rate === 0 ? "—" : money.format(band.excess)}</td><td>{band.rate === 0 ? "—" : money.format(band.fixed)}</td></tr>)}</tbody></table></div>;
}

export default function StatutoryTools({ lang, tool }: { lang: Lang; tool: Tool }) {
  const t = copy[lang];
  const money = useMemo(() => new Intl.NumberFormat(lang === "es" ? "es-SV" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }), [lang]);
  const [termination, setTermination] = useState<EmploymentEnd>("dismissal");
  const [startDate, setStartDate] = useState(() => isoAfterMonths(-60));
  const [endDate, setEndDate] = useState(todayIso);
  const [monthlySalary, setMonthlySalary] = useState("900");
  const [sector, setSector] = useState<WageSector>("commerce");
  const [pendingDays, setPendingDays] = useState("10");
  const [unusedVacation, setUnusedVacation] = useState("0");
  const [aguinaldoPaid, setAguinaldoPaid] = useState(false);
  const [gross, setGross] = useState("900");
  const [frequency, setFrequency] = useState<PayFrequency>("monthly");
  const [includeAfp, setIncludeAfp] = useState(true);
  const [includeIsss, setIncludeIsss] = useState(true);
  const [applyFixedDeduction, setApplyFixedDeduction] = useState(true);
  const [annualGross, setAnnualGross] = useState("");

  const settlement = useMemo(() => calculateSettlement({
    startDate, endDate, monthlySalary: number(monthlySalary), sector, termination,
    pendingSalaryDays: number(pendingDays), unusedVacationPeriods: number(unusedVacation), aguinaldoPaid,
  }), [aguinaldoPaid, endDate, monthlySalary, pendingDays, sector, startDate, termination, unusedVacation]);
  const payroll = useMemo(() => calculatePayrollWithholding({ gross: number(gross), frequency, includeAfp, includeIsss, applyFixedDeduction, annualGross: number(annualGross) }), [annualGross, applyFixedDeduction, frequency, gross, includeAfp, includeIsss]);

  const frequencyLabel = frequency === "monthly" ? t.monthly : frequency === "fortnightly" ? t.fortnightly : t.weekly;
  const dateField = (label: string, value: string, setValue: (value: string) => void, min: string, max: string) => <label className="field"><span>{label}</span><div className="input-wrap date-wrap"><input type="date" min={min} max={max} value={value} onChange={(event) => setValue(event.target.value)} /></div></label>;
  const countField = (label: string, value: string, setValue: (value: string) => void, max: string) => <label className="field"><span>{label}</span><div className="input-wrap"><input type="number" min="0" max={max} step="1" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} /></div></label>;

  return <section className="statutory-tools standalone-tools" id="tools">
    {tool === "settlement" ? <>
      <div className="legal-calculator-grid">
        <div className="form-panel legal-form">
          <div className="section-title"><span>01</span><div><h2>{t.data}</h2><p>{lang === "es" ? "Sector privado regido por el Código de Trabajo" : "Private sector governed by the Labor Code"}</p></div></div>
          <fieldset className="field full"><legend>{t.cause}</legend><div className="segmented two"><button type="button" aria-pressed={termination === "dismissal"} className={termination === "dismissal" ? "active" : ""} onClick={() => setTermination("dismissal")}>{t.dismissal}</button><button type="button" aria-pressed={termination === "resignation"} className={termination === "resignation" ? "active" : ""} onClick={() => setTermination("resignation")}>{t.resignation}</button></div></fieldset>
          <div className="field-grid">{dateField(t.start, startDate, setStartDate, EARLIEST_EMPLOYMENT_DATE, endDate)}{dateField(t.end, endDate, setEndDate, startDate, LATEST_END_DATE)}<MoneyInput label={t.salary} value={monthlySalary} onChange={setMonthlySalary} note={t.salaryHint} />
            <label className="field"><span>{t.sector}</span><select value={sector} onChange={(event) => setSector(event.target.value as WageSector)}>{(Object.keys(DAILY_MINIMUM_WAGE) as WageSector[]).map((item) => <option key={item} value={item}>{sectorLabels[lang][item]}</option>)}</select></label>
            {countField(t.pendingDays, pendingDays, setPendingDays, "31")}{countField(t.unusedVacation, unusedVacation, setUnusedVacation, "50")}
          </div>
          <label className="check-field"><input type="checkbox" checked={aguinaldoPaid} onChange={(event) => setAguinaldoPaid(event.target.checked)} /><span>{t.aguinaldoPaid}</span></label>
        </div>
        <div className="results-panel legal-results">
          <div className="results-kicker">{t.result}</div>
          {settlement.invalid ? <div className="warning">! {t.invalidDates}</div> : <>
            <div className="legal-total"><span>{t.total}</span><strong>{money.format(settlement.total)}</strong><small>{t.service}: {serviceLabel(settlement, t)}</small></div>
            <div className="legal-breakdown"><div className="primary"><span>{t.indemnity}</span><b>{money.format(settlement.indemnity)}</b></div><div><span>{t.vacation}</span><b>{money.format(settlement.vacation)}</b></div><div><span>{t.aguinaldo}</span><b>{money.format(settlement.aguinaldo)}</b></div><div><span>{t.pendingSalary}</span><b>{money.format(settlement.pendingSalary)}</b></div>{settlement.quincena25Applies && <div><span>{t.quincena25}</span><b>{money.format(settlement.quincena25)}</b></div>}</div>
            <div className="legal-facts"><div><span>{t.dailyBase}</span><b>{money.format(settlement.indemnityBaseDaily)}</b></div><div><span>{t.vacationDays}</span><b>{settlement.vacationDays.toFixed(2)}</b></div></div>
            {settlement.minimumWagePredatesTables && <div className="legal-callout warn"><span>!</span><p>{t.wageOutOfRange}</p></div>}
            {settlement.quincena25Applies && <div className="legal-callout"><span>§</span><p>{t.quincena25Note}</p></div>}
            <div className={`legal-callout ${termination === "resignation" && !settlement.eligibleForResignationBenefit ? "warn" : ""}`}><span>{termination === "dismissal" ? "§" : "i"}</span><p>{termination === "dismissal" ? t.dismissalNote : settlement.eligibleForResignationBenefit ? `${t.resignationOk} ${t.resignationRule}` : t.resignationNo}</p></div>
          </>}
          <p className="legal-disclaimer">{t.grossNote}</p>
        </div>
      </div>
      <div className="source-panel"><h2>{t.sources}</h2><div className="source-links"><a href={OFFICIAL.laborCode} target="_blank" rel="noreferrer"><b>01</b>{t.code}<span>↗</span></a><a href={OFFICIAL.laborService} target="_blank" rel="noreferrer"><b>02</b>{t.officialCalc}<span>↗</span></a><a href={OFFICIAL.resignation} target="_blank" rel="noreferrer"><b>03</b>{t.resignationLaw}<span>↗</span></a><a href={OFFICIAL.minimumWage} target="_blank" rel="noreferrer"><b>04</b>{t.wageDecree}<span>↗</span></a><a href={OFFICIAL.aguinaldoReform} target="_blank" rel="noreferrer"><b>05</b>{t.aguinaldoReform}<span>↗</span></a></div></div>
    </> : <>
      <div className="legal-calculator-grid">
        <div className="form-panel legal-form">
          <div className="section-title"><span>01</span><div><h2>{t.payrollData}</h2><p>{lang === "es" ? "Servicios permanentes y persona domiciliada" : "Permanent services and a domiciled individual"}</p></div></div>
          <div className="field-grid"><MoneyInput label={t.gross} value={gross} onChange={setGross} /><label className="field"><span>{t.frequency}</span><select value={frequency} onChange={(event) => setFrequency(event.target.value as PayFrequency)}><option value="monthly">{t.monthly}</option><option value="fortnightly">{t.fortnightly}</option><option value="weekly">{t.weekly}</option></select></label><MoneyInput label={t.annualGross} value={annualGross} onChange={setAnnualGross} note={t.annualGrossHint} /></div>
          <div className="payroll-checks"><label className="check-field"><input type="checkbox" checked={includeAfp} onChange={(event) => setIncludeAfp(event.target.checked)} /><span>{t.includeAfp}</span></label><label className="check-field"><input type="checkbox" checked={includeIsss} onChange={(event) => setIncludeIsss(event.target.checked)} /><span>{t.includeIsss}</span></label><label className="check-field"><input type="checkbox" checked={applyFixedDeduction} onChange={(event) => setApplyFixedDeduction(event.target.checked)} /><span>{t.fixedDeduction}</span></label></div>
          {includeIsss && frequency !== "monthly" && <p className="field-note payroll-note">{t.isssApprox}</p>}
        </div>
        <div className="results-panel legal-results payroll-results">
          <div className="results-kicker">{frequencyLabel}</div><div className="legal-total"><span>{t.takeHome}</span><strong>{money.format(payroll.net)}</strong><small>{t.band}: {payroll.band} · {(payroll.marginalRate * 100).toFixed(0)}%</small></div>
          <div className="legal-breakdown"><div className="primary"><span>{t.isr}</span><b>{money.format(payroll.isr)}</b></div><div><span>{t.afp}</span><b>{money.format(payroll.afp)}</b></div><div><span>{t.isss}</span><b>{money.format(payroll.isss)}</b></div><div><span>{t.taxable}</span><b>{money.format(payroll.taxable)}</b></div></div>
          <div className="tax-base-flow"><span>{t.taxableBefore}<b>{money.format(payroll.taxableBeforeFixedDeduction)}</b></span><i>−</i><span>{t.fiscalDeduction}<b>{money.format(payroll.fixedDeduction)}</b><small>{t.notCash}</small></span><i>=</i><span>{t.taxable}<b>{money.format(payroll.taxable)}</b></span></div>
          <div className="legal-facts"><div><span>{t.annualUsed}</span><b>{money.format(payroll.annualIncome)}</b><small>{payroll.annualIncomeDeclared ? t.annualDeclared : t.annualEstimated}</small></div></div>
          {!payroll.qualifiesForFixedDeduction && applyFixedDeduction && <div className="legal-callout warn"><span>i</span><p>{t.noFixed}</p></div>}
        </div>
      </div>
      <div className="tax-tables"><div className="table-heading"><div><span>DECRETO EJECUTIVO 10/2025</span><h2>{t.tableTitle} {frequencyLabel.toLowerCase()}</h2></div><a href={OFFICIAL.withholding} target="_blank" rel="noreferrer">{t.officialPdf} ↗</a></div><Table bands={WITHHOLDING_TABLES[frequency]} t={t} money={money} />
        <details><summary>{t.recalc}</summary><p>{t.recalcNote}</p><div className="recalc-grid"><div><h3>{t.june}</h3><Table bands={JUNE_RECALC_TABLE} t={t} money={money} /></div><div><h3>{t.december}</h3><Table bands={DECEMBER_RECALC_TABLE} t={t} money={money} /></div></div></details>
      </div>
      <div className="source-panel"><h2>{t.sources}</h2><div className="source-links"><a href={OFFICIAL.withholding} target="_blank" rel="noreferrer"><b>01</b>{t.taxDecree}<span>↗</span></a><a href={OFFICIAL.incomeTax} target="_blank" rel="noreferrer"><b>02</b>{t.taxLaw}<span>↗</span></a><a href={OFFICIAL.isss} target="_blank" rel="noreferrer"><b>03</b>{t.isssSource}<span>↗</span></a><a href={OFFICIAL.pensions} target="_blank" rel="noreferrer"><b>04</b>{t.pensionSource}<span>↗</span></a></div></div>
    </>}
  </section>;
}
