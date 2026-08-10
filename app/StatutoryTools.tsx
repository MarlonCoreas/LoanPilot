import { useMemo, useState } from "react";
import {
  calculatePayrollWithholding, calculateSettlement, DAILY_MINIMUM_WAGE,
  DECEMBER_RECALC_TABLE, JUNE_RECALC_TABLE, WITHHOLDING_TABLES,
  type EmploymentEnd, type PayFrequency, type WageSector, type WithholdingBand,
} from "./statutory";

type Lang = "es" | "en";
type Tool = "settlement" | "withholding";

const OFFICIAL = {
  laborCode: "https://www.asamblea.gob.sv/sites/default/files/documents/decretos/AD778A29-F1B3-495E-AE19-E2B05D93685D.pdf",
  laborService: "https://www.mtps.gob.sv/servicios/calculo-de-indemnizacion-en-linea/",
  resignation: "https://www.mtps.gob.sv/download/decreto-no-592-ley-reguladora-de-la-prestacion-economica-por-renuncia-voluntaria/",
  minimumWage: "https://www.jurisprudencia.gob.sv/DocumentosBoveda/D/2/2020-2029/2025/05/10A4DA.PDF",
  withholding: "https://www.transparenciafiscal.gob.sv/downloads/pdf/700-DGII-DC-2025-01.pdf",
  incomeTax: "https://transparencia.mh.gob.sv/downloads/pdf/DC5811.pdf",
  isss: "https://ovisss.isss.gob.sv/documentos_ofivi/Lineamiento_Mod_Salario_Maximo.pdf",
  pensions: "https://ssf.gob.sv/estadisticas/marco-legal-y-normativo/leyes-2/",
};

const copy = {
  es: {
    eyebrow: "NORMATIVA DE EL SALVADOR · ACTUALIZADA A 2026",
    title: "Más claridad para tu trabajo y tu salario.",
    lead: "Calcula una liquidación laboral o estima las retenciones de tu pago con reglas verificables y fuentes oficiales.",
    settlement: "Finiquito e indemnización", settlementSub: "Despido o renuncia voluntaria",
    withholding: "Retenciones salariales", withholdingSub: "AFP, ISSS y renta",
    data: "Datos del empleo", result: "Estimación bruta", start: "Fecha de ingreso", end: "Último día de trabajo",
    salary: "Salario mensual ordinario", salaryHint: "Incluye comisiones habituales promediadas, si aplican.",
    cause: "Forma de terminación", dismissal: "Despido injustificado", resignation: "Renuncia voluntaria",
    sector: "Sector económico del empleador", pendingDays: "Días de salario pendientes",
    unusedVacation: "Períodos completos de vacaciones pendientes", aguinaldoPaid: "El aguinaldo de este año ya fue pagado",
    service: "Antigüedad estimada", years: "años", total: "Total bruto estimado", indemnity: "Indemnización / prestación",
    vacation: "Vacaciones + 30%", aguinaldo: "Aguinaldo", pendingSalary: "Salario pendiente",
    dailyBase: "Salario diario usado para la prestación", vacationDays: "Días de vacaciones incluidos",
    resignationOk: "La antigüedad cumple el mínimo de dos años. El derecho exige además preaviso y renuncia con las formalidades legales.",
    resignationNo: "No se alcanza el mínimo de dos años para la prestación por renuncia voluntaria.",
    dismissalNote: "El artículo 58 reconoce 30 días por año y fracciones, con mínimo de 15 días y tope de cuatro salarios mínimos diarios.",
    grossNote: "Es una estimación bruta. Salario y vacaciones pueden llevar descuentos de planilla; la indemnización legal y la prestación por renuncia están exentas de renta. Convenios o contratos pueden mejorar estos mínimos.",
    sources: "Fuentes y reglas aplicadas", code: "Código de Trabajo: arts. 58, 140, 177, 187 y 196-202",
    officialCalc: "Servicio oficial de cálculo del MTPS", resignationLaw: "Ley de Renuncia Voluntaria: arts. 2, 5, 7-9",
    wageDecree: "D.E. 11/2025 y reforma: salarios mínimos vigentes",
    payrollData: "Datos del pago", gross: "Remuneración bruta del período", frequency: "Frecuencia de pago",
    monthly: "Mensual", fortnightly: "Quincenal", weekly: "Semanal", includeAfp: "Descontar AFP (7.25%)",
    includeIsss: "Descontar ISSS (3%, techo mensual $1,000)", fixedDeduction: "Aplicar deducción fija de renta cuando corresponda",
    takeHome: "Pago neto estimado", isr: "Retención de renta", afp: "Aporte AFP", isss: "Aporte ISSS",
    taxableBefore: "Remuneración gravada antes de deducción fija", taxable: "Base usada en la tabla", band: "Tramo aplicado",
    fiscalDeduction: "Deducción fiscal prorrateada", notCash: "Reduce la base de renta; no se descuenta del pago.",
    noFixed: "La deducción fija de $1,600 corresponde a asalariados con monto anual igual o inferior a $9,100.",
    tableTitle: "Tabla oficial para pagos", from: "Desde", to: "Hasta", rate: "%", excess: "Sobre exceso de", fixed: "Cuota fija",
    noRetention: "Sin retención", onwards: "En adelante", recalc: "Tablas de recálculo de junio y diciembre",
    june: "Junio · acumulado enero-junio", december: "Diciembre · acumulado anual",
    recalcNote: "En junio y diciembre el patrono debe recalcular con las remuneraciones gravadas acumuladas y restar lo ya retenido. Esta calculadora muestra el período ordinario; las tablas acumuladas quedan visibles para auditoría.",
    taxDecree: "Decreto Ejecutivo 10/2025: tablas de retención", taxLaw: "Ley de Impuesto sobre la Renta: arts. 29, 37 y 65",
    isssSource: "ISSS: tasa laboral y techo de cotización", pensionSource: "SSF: Ley Integral del Sistema de Pensiones",
    invalidDates: "La fecha de terminación debe ser posterior a la fecha de ingreso.",
  },
  en: {
    eyebrow: "EL SALVADOR RULES · UPDATED THROUGH 2026",
    title: "More clarity for your job and your pay.",
    lead: "Estimate an employment settlement or payroll withholding with auditable rules and official sources.",
    settlement: "Settlement and severance", settlementSub: "Dismissal or voluntary resignation",
    withholding: "Payroll withholding", withholdingSub: "Pension, health and income tax",
    data: "Employment details", result: "Gross estimate", start: "Employment start date", end: "Last day worked",
    salary: "Ordinary monthly salary", salaryHint: "Include averaged recurring commissions, when applicable.",
    cause: "How employment ends", dismissal: "Unjustified dismissal", resignation: "Voluntary resignation",
    sector: "Employer's economic sector", pendingDays: "Unpaid salary days",
    unusedVacation: "Complete unused vacation periods", aguinaldoPaid: "This year's year-end bonus was already paid",
    service: "Estimated service", years: "years", total: "Estimated gross total", indemnity: "Severance / benefit",
    vacation: "Vacation + 30%", aguinaldo: "Year-end bonus", pendingSalary: "Unpaid salary",
    dailyBase: "Daily salary used for the benefit", vacationDays: "Vacation days included",
    resignationOk: "Service meets the two-year minimum. Entitlement also requires statutory notice and resignation formalities.",
    resignationNo: "Service does not meet the two-year minimum for the voluntary resignation benefit.",
    dismissalNote: "Article 58 grants 30 days per year and fractions, with a 15-day minimum and a cap of four daily minimum wages.",
    grossNote: "This is a gross estimate. Salary and vacation may have payroll deductions; statutory dismissal and resignation benefits are income-tax exempt. Agreements may improve these minimums.",
    sources: "Sources and rules applied", code: "Labor Code: articles 58, 140, 177, 187 and 196-202",
    officialCalc: "MTPS official calculation service", resignationLaw: "Voluntary Resignation Law: articles 2, 5 and 7-9",
    wageDecree: "Executive Decree 11/2025 and amendment: current minimum wages",
    payrollData: "Pay details", gross: "Gross remuneration for the period", frequency: "Pay frequency",
    monthly: "Monthly", fortnightly: "Twice monthly", weekly: "Weekly", includeAfp: "Deduct pension contribution (7.25%)",
    includeIsss: "Deduct ISSS (3%, $1,000 monthly ceiling)", fixedDeduction: "Apply fixed income-tax deduction when eligible",
    takeHome: "Estimated take-home pay", isr: "Income-tax withholding", afp: "Pension contribution", isss: "ISSS contribution",
    taxableBefore: "Taxable remuneration before fixed deduction", taxable: "Table tax base", band: "Applied band",
    fiscalDeduction: "Prorated tax deduction", notCash: "Reduces the income-tax base; it is not taken from pay.",
    noFixed: "The $1,600 fixed deduction applies to employees with annual amounts of $9,100 or less.",
    tableTitle: "Official table for", from: "From", to: "To", rate: "%", excess: "Excess over", fixed: "Fixed amount",
    noRetention: "No withholding", onwards: "And above", recalc: "June and December recalculation tables",
    june: "June · January-June cumulative", december: "December · annual cumulative",
    recalcNote: "In June and December, employers recalculate using cumulative taxable remuneration and subtract prior withholding. This calculator covers an ordinary pay period; the cumulative tables remain visible for audit.",
    taxDecree: "Executive Decree 10/2025: withholding tables", taxLaw: "Income Tax Law: articles 29, 37 and 65",
    isssSource: "ISSS: employee rate and contribution ceiling", pensionSource: "SSF: Integral Pension System Law",
    invalidDates: "The employment end date must be after the start date.",
  },
} as const;

const sectorLabels = {
  es: { commerce: "Comercio, servicios e industria", maquila: "Maquila textil", coffee: "Beneficios de café / caña", agriculture: "Agro, pesca / cosecha de café" },
  en: { commerce: "Commerce, services and industry", maquila: "Textile maquila", coffee: "Coffee processing / sugar cane", agriculture: "Agriculture / fishing / coffee" },
} as const;

function number(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function todayIso() { return new Date().toISOString().slice(0, 10); }
function yearsAgoIso(years: number) { const date = new Date(); date.setUTCFullYear(date.getUTCFullYear() - years); return date.toISOString().slice(0, 10); }

function MoneyInput({ label, value, onChange, note }: { label: string; value: string; onChange: (value: string) => void; note?: string }) {
  return <label className="field"><span>{label}</span><div className="input-wrap"><b className="prefix">$</b><input type="number" min="0" step="0.01" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} /></div>{note && <small className="field-note">{note}</small>}</label>;
}

function Table({ bands, t, money }: { bands: WithholdingBand[]; t: typeof copy.es | typeof copy.en; money: Intl.NumberFormat }) {
  return <div className="law-table-wrap"><table className="law-table"><thead><tr><th>{t.from}</th><th>{t.to}</th><th>{t.rate}</th><th>{t.excess}</th><th>{t.fixed}</th></tr></thead><tbody>{bands.map((band) => <tr key={band.from}><td>{money.format(band.from)}</td><td>{band.to === null ? t.onwards : money.format(band.to)}</td><td>{band.rate === 0 ? t.noRetention : `${band.rate * 100}%`}</td><td>{band.rate === 0 ? "—" : money.format(band.excess)}</td><td>{band.rate === 0 ? "—" : money.format(band.fixed)}</td></tr>)}</tbody></table></div>;
}

export default function StatutoryTools({ lang, fixedTool }: { lang: Lang; fixedTool?: Tool }) {
  const t = copy[lang];
  const money = useMemo(() => new Intl.NumberFormat(lang === "es" ? "es-SV" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }), [lang]);
  const [tool, setTool] = useState<Tool>("settlement");
  const activeTool = fixedTool ?? tool;
  const [termination, setTermination] = useState<EmploymentEnd>("dismissal");
  const [startDate, setStartDate] = useState(yearsAgoIso(5));
  const [endDate, setEndDate] = useState(todayIso());
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

  const settlement = useMemo(() => calculateSettlement({
    startDate, endDate, monthlySalary: number(monthlySalary), sector, termination,
    pendingSalaryDays: number(pendingDays), unusedVacationPeriods: number(unusedVacation), aguinaldoPaid,
  }), [aguinaldoPaid, endDate, monthlySalary, pendingDays, sector, startDate, termination, unusedVacation]);
  const payroll = useMemo(() => calculatePayrollWithholding({ gross: number(gross), frequency, includeAfp, includeIsss, applyFixedDeduction }), [applyFixedDeduction, frequency, gross, includeAfp, includeIsss]);

  const frequencyLabel = frequency === "monthly" ? t.monthly : frequency === "fortnightly" ? t.fortnightly : t.weekly;
  const dateField = (label: string, value: string, setValue: (value: string) => void) => <label className="field"><span>{label}</span><div className="input-wrap date-wrap"><input type="date" value={value} onChange={(event) => setValue(event.target.value)} /></div></label>;
  const countField = (label: string, value: string, setValue: (value: string) => void) => <label className="field"><span>{label}</span><div className="input-wrap"><input type="number" min="0" step="1" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} /></div></label>;

  return <section className={`statutory-tools ${fixedTool ? "standalone-tools" : ""}`} id="tools">
    {!fixedTool && <div className="statutory-head"><p>{t.eyebrow}</p><h2>{t.title}</h2><span>{t.lead}</span></div>}
    {!fixedTool && <div className="statutory-tabs" role="tablist">
        <button className={activeTool === "settlement" ? "active" : ""} onClick={() => setTool("settlement")} role="tab" aria-selected={activeTool === "settlement"}><i>§</i><span><b>{t.settlement}</b><small>{t.settlementSub}</small></span></button>
        <button className={activeTool === "withholding" ? "active" : ""} onClick={() => setTool("withholding")} role="tab" aria-selected={activeTool === "withholding"}><i>%</i><span><b>{t.withholding}</b><small>{t.withholdingSub}</small></span></button>
    </div>}

    {activeTool === "settlement" ? <>
      <div className="legal-calculator-grid">
        <div className="form-panel legal-form">
          <div className="section-title"><span>01</span><div><h3>{t.data}</h3><p>{lang === "es" ? "Sector privado regido por el Código de Trabajo" : "Private sector governed by the Labor Code"}</p></div></div>
          <label className="field full"><span>{t.cause}</span><div className="segmented two"><button className={termination === "dismissal" ? "active" : ""} onClick={() => setTermination("dismissal")}>{t.dismissal}</button><button className={termination === "resignation" ? "active" : ""} onClick={() => setTermination("resignation")}>{t.resignation}</button></div></label>
          <div className="field-grid">{dateField(t.start, startDate, setStartDate)}{dateField(t.end, endDate, setEndDate)}<MoneyInput label={t.salary} value={monthlySalary} onChange={setMonthlySalary} note={t.salaryHint} />
            <label className="field"><span>{t.sector}</span><select value={sector} onChange={(event) => setSector(event.target.value as WageSector)}>{(Object.keys(DAILY_MINIMUM_WAGE) as WageSector[]).map((item) => <option key={item} value={item}>{sectorLabels[lang][item]}</option>)}</select></label>
            {countField(t.pendingDays, pendingDays, setPendingDays)}{countField(t.unusedVacation, unusedVacation, setUnusedVacation)}
          </div>
          <label className="check-field"><input type="checkbox" checked={aguinaldoPaid} onChange={(event) => setAguinaldoPaid(event.target.checked)} /><span>{t.aguinaldoPaid}</span></label>
        </div>
        <div className="results-panel legal-results">
          <div className="results-kicker">{t.result}</div>
          {settlement.invalid ? <div className="warning">! {t.invalidDates}</div> : <>
            <div className="legal-total"><span>{t.total}</span><strong>{money.format(settlement.total)}</strong><small>{t.service}: {settlement.serviceYears.toFixed(2)} {t.years}</small></div>
            <div className="legal-breakdown"><div className="primary"><span>{t.indemnity}</span><b>{money.format(settlement.indemnity)}</b></div><div><span>{t.vacation}</span><b>{money.format(settlement.vacation)}</b></div><div><span>{t.aguinaldo}</span><b>{money.format(settlement.aguinaldo)}</b></div><div><span>{t.pendingSalary}</span><b>{money.format(settlement.pendingSalary)}</b></div></div>
            <div className="legal-facts"><div><span>{t.dailyBase}</span><b>{money.format(settlement.indemnityBaseDaily)}</b></div><div><span>{t.vacationDays}</span><b>{settlement.vacationDays.toFixed(2)}</b></div></div>
            <div className={`legal-callout ${termination === "resignation" && !settlement.eligibleForResignationBenefit ? "warn" : ""}`}><span>{termination === "dismissal" ? "§" : "i"}</span><p>{termination === "dismissal" ? t.dismissalNote : settlement.eligibleForResignationBenefit ? t.resignationOk : t.resignationNo}</p></div>
          </>}
          <p className="legal-disclaimer">{t.grossNote}</p>
        </div>
      </div>
      <div className="source-panel"><h3>{t.sources}</h3><div className="source-links"><a href={OFFICIAL.laborCode} target="_blank" rel="noreferrer"><b>01</b>{t.code}<span>↗</span></a><a href={OFFICIAL.laborService} target="_blank" rel="noreferrer"><b>02</b>{t.officialCalc}<span>↗</span></a><a href={OFFICIAL.resignation} target="_blank" rel="noreferrer"><b>03</b>{t.resignationLaw}<span>↗</span></a><a href={OFFICIAL.minimumWage} target="_blank" rel="noreferrer"><b>04</b>{t.wageDecree}<span>↗</span></a></div></div>
    </> : <>
      <div className="legal-calculator-grid">
        <div className="form-panel legal-form">
          <div className="section-title"><span>01</span><div><h3>{t.payrollData}</h3><p>{lang === "es" ? "Servicios permanentes y persona domiciliada" : "Permanent services and a domiciled individual"}</p></div></div>
          <div className="field-grid"><MoneyInput label={t.gross} value={gross} onChange={setGross} /><label className="field"><span>{t.frequency}</span><select value={frequency} onChange={(event) => setFrequency(event.target.value as PayFrequency)}><option value="monthly">{t.monthly}</option><option value="fortnightly">{t.fortnightly}</option><option value="weekly">{t.weekly}</option></select></label></div>
          <div className="payroll-checks"><label className="check-field"><input type="checkbox" checked={includeAfp} onChange={(event) => setIncludeAfp(event.target.checked)} /><span>{t.includeAfp}</span></label><label className="check-field"><input type="checkbox" checked={includeIsss} onChange={(event) => setIncludeIsss(event.target.checked)} /><span>{t.includeIsss}</span></label><label className="check-field"><input type="checkbox" checked={applyFixedDeduction} onChange={(event) => setApplyFixedDeduction(event.target.checked)} /><span>{t.fixedDeduction}</span></label></div>
        </div>
        <div className="results-panel legal-results payroll-results">
          <div className="results-kicker">{frequencyLabel}</div><div className="legal-total"><span>{t.takeHome}</span><strong>{money.format(payroll.net)}</strong><small>{t.band}: {payroll.band} · {(payroll.marginalRate * 100).toFixed(0)}%</small></div>
          <div className="legal-breakdown"><div className="primary"><span>{t.isr}</span><b>{money.format(payroll.isr)}</b></div><div><span>{t.afp}</span><b>{money.format(payroll.afp)}</b></div><div><span>{t.isss}</span><b>{money.format(payroll.isss)}</b></div><div><span>{t.taxable}</span><b>{money.format(payroll.taxable)}</b></div></div>
          <div className="tax-base-flow"><span>{t.taxableBefore}<b>{money.format(payroll.taxableBeforeFixedDeduction)}</b></span><i>−</i><span>{t.fiscalDeduction}<b>{money.format(payroll.fixedDeduction)}</b><small>{t.notCash}</small></span><i>=</i><span>{t.taxable}<b>{money.format(payroll.taxable)}</b></span></div>
          {!payroll.qualifiesForFixedDeduction && applyFixedDeduction && <div className="legal-callout warn"><span>i</span><p>{t.noFixed}</p></div>}
        </div>
      </div>
      <div className="tax-tables"><div className="table-heading"><div><span>DECRETO EJECUTIVO 10/2025</span><h3>{t.tableTitle} {frequencyLabel.toLowerCase()}</h3></div><a href={OFFICIAL.withholding} target="_blank" rel="noreferrer">PDF oficial ↗</a></div><Table bands={WITHHOLDING_TABLES[frequency]} t={t} money={money} />
        <details><summary>{t.recalc}</summary><p>{t.recalcNote}</p><div className="recalc-grid"><div><h4>{t.june}</h4><Table bands={JUNE_RECALC_TABLE} t={t} money={money} /></div><div><h4>{t.december}</h4><Table bands={DECEMBER_RECALC_TABLE} t={t} money={money} /></div></div></details>
      </div>
      <div className="source-panel"><h3>{t.sources}</h3><div className="source-links"><a href={OFFICIAL.withholding} target="_blank" rel="noreferrer"><b>01</b>{t.taxDecree}<span>↗</span></a><a href={OFFICIAL.incomeTax} target="_blank" rel="noreferrer"><b>02</b>{t.taxLaw}<span>↗</span></a><a href={OFFICIAL.isss} target="_blank" rel="noreferrer"><b>03</b>{t.isssSource}<span>↗</span></a><a href={OFFICIAL.pensions} target="_blank" rel="noreferrer"><b>04</b>{t.pensionSource}<span>↗</span></a></div></div>
    </>}
  </section>;
}
