import { useMemo, useState } from "react";
import DisputePanel from "./DisputePanel";
import { CheckField, DateField, FieldGroup, MoneyField, NumberField, SegmentedField, SelectField } from "./fields";
import { isoAfterMonths, todayIso } from "./loan";
import { downloadPdf } from "./pdf";
import { citationsFor, reviewedFor, type RuleId } from "./rules";
import { ROUTES, type Lang } from "./routes";
import { OFFICIAL } from "./sources";
import {
  calculatePayrollWithholding, calculateRecalculation, calculateSettlement, DAILY_MINIMUM_WAGE,
  DECEMBER_RECALC_TABLE, EARLIEST_EMPLOYMENT_DATE, estimateAccumulated, JUNE_RECALC_TABLE,
  verifyPayslip, WITHHOLDING_TABLES, withholdingForTaxable,
  type EmploymentEnd, type PayFrequency, type PayslipCause, type PayslipCauseId,
  type PayslipConcept, type PayslipStatus, type RecalcPeriod, type WageSector,
  type WithholdingBand,
} from "./statutory";

type Tool = "settlement" | "withholding";
/**
 * The three questions the withholding page answers. They share every input
 * about the pay itself — the gross, the frequency, which contributions apply —
 * so switching modes carries that state across instead of asking for it twice.
 *
 * The recalculation was a band under the calculate mode, which put a panel
 * about the whole year's accumulated pay directly beneath one about a single
 * pay period, sharing a column of numbers with it. They answer different
 * questions on different spans, and a reader who came for June had to scroll
 * past a calculation they had not asked for.
 */
type PayrollMode = "calculate" | "verify" | "recalc";

/** Whether the accumulated figures are typed in or worked out from a salary. */
type AccumulatedSource = "entered" | "estimated";


const copy = {
  es: {
    data: "Datos del empleo", result: "Estimación bruta", start: "Fecha de ingreso", end: "Último día de trabajo",
    salary: "Salario mensual ordinario", salaryHint: "Incluye comisiones habituales promediadas, si aplican.",
    cause: "Forma de terminación", dismissal: "Despido injustificado", resignation: "Renuncia voluntaria",
    sector: "Sector económico del empleador", pendingDays: "Días de salario pendientes",
    unusedVacation: "Períodos completos de vacaciones pendientes", aguinaldoPaid: "El aguinaldo de este año ya fue pagado",
    service: "Antigüedad estimada", year: "año", yearPlural: "años", month: "mes", monthPlural: "meses",
    period: "período cumplido", periodPlural: "períodos cumplidos", daysLabel: "días",
    completedPeriodsLead: "Llevás", completedPeriodsTail: "; ingresá solo los que no te hayan pagado.",
    total: "Total bruto estimado", indemnity: "Indemnización / prestación",
    vacation: "Vacaciones + 30%", aguinaldo: "Aguinaldo", pendingSalary: "Salario pendiente",
    vacationComplete: "Vacaciones de períodos completos + 30%", vacationFraction: "Vacación proporcional + 30%",
    quincena25: "Quincena 25",
    quincena25Note: "Ley Especial Quincena Veinticinco (D.L. 499): el art. 2 la fija en el 50% del salario mensual y solo para quien gana $1,500 o menos, y el art. 1 manda pagarla íntegra, sin retención ni descuento de ninguna clase. Es obligatoria para el patrono privado desde 2027. Se incluye en este cálculo porque la terminación cae dentro de la ventana del art. 3: «antes del veinticinco de enero o en esa misma fecha».",
    quincena25OutsideLead: "Cumplís todo lo demás para la Quincena 25 —despido, salario dentro del tope y fecha dentro del régimen— pero la terminación queda fuera de la ventana del art. 3, que nombra a quien sale «antes del veinticinco de enero o en esa misma fecha». Aquí se aplica esa lectura estricta y la línea es cero. La lectura amplia, la que remite a las reglas del aguinaldo, habría pagado",
    quincena25OutsideTail: "por la parte proporcional del ciclo.",
    wageOutOfRange: "La salida es anterior a la tabla de salarios mínimos más antigua que hemos verificado. El tope se calcula con esa tabla y puede no ser la que estaba vigente ese día.",
    aguinaldoAmbiguousLead: "La salida cae antes del 20 de octubre y la antigüedad cambia de escalón entre esas dos fechas. Aquí se usa la escala del último día trabajado",
    aguinaldoAmbiguousMid: "días, que es la lectura que no presupone tiempo no trabajado. Con la escala del 20 de octubre serían",
    aguinaldoAmbiguousTail: "días. La reforma no dice expresamente qué escala rige para quien terminó antes del corte; si la diferencia te importa, consultalo con el MTPS.",
    dailyBase: "Salario diario usado para la prestación", vacationDays: "Días de vacaciones incluidos",
    resignationOk: "La antigüedad cumple el mínimo de dos años. El derecho exige además preaviso y renuncia con las formalidades legales.",
    resignationNo: "No se alcanza el mínimo de dos años para la prestación por renuncia voluntaria.",
    resignationRule: "La prestación se estima sobre años completos: a diferencia del artículo 58, el artículo 8 no reconoce fracciones de año.",
    dismissalNote: "El artículo 58 reconoce 30 días por año y fracciones, con mínimo de 15 días y tope de cuatro salarios mínimos diarios.",
    grossNote: "Es una estimación bruta. Salario y vacaciones pueden llevar descuentos de planilla; la indemnización legal y la prestación por renuncia están exentas de renta. Convenios o contratos pueden mejorar estos mínimos.",
    disputeLink: "Ver las dos lecturas de esta regla",
    sources: "Fuentes y reglas aplicadas", code: "Código de Trabajo: arts. 58, 140, 177, 187 y 196-202",
    officialCalc: "Servicio oficial de cálculo del MTPS", resignationLaw: "Ley de Renuncia Voluntaria: arts. 2, 5, 7-9",
    wageDecree: "D.E. 12/2025: tabla de salarios mínimos vigente desde junio 2025",
    aguinaldoReform: "Reforma 2025: aguinaldo y art. 202 al 20 de octubre",
    vacationSource: "Vacación anual remunerada: arts. 177-185 (CSJ)",
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
    fixedOnlyBandTwo: "El literal e) del decreto deja los $1,600 fuera únicamente del Tramo II. Los Tramos III y IV ya los traen incorporados en sus límites, así que aquí no se restan de nuevo.",
    tableTitle: "Tabla oficial para pagos", from: "Desde", to: "Hasta", rate: "%", excess: "Sobre exceso de", fixed: "Cuota fija",
    noRetention: "Sin retención", onwards: "En adelante", recalc: "Tablas de recálculo de junio y diciembre",
    officialPdf: "PDF oficial",
    june: "Junio · acumulado enero-junio", december: "Diciembre · acumulado anual",
    recalcNote: "En junio y diciembre el patrono debe recalcular con las remuneraciones gravadas acumuladas y restar lo ya retenido. Estas son las dos tablas que usa ese recálculo.",
    recalcTitle: "Recálculo acumulado", recalcSubtitle: "Art. 1 literal f) del Decreto Ejecutivo 10/2025",
    recalcPeriodLabel: "Período del recálculo", juneOption: "Junio (primero)", decemberOption: "Diciembre (segundo)",
    accTaxable: "Remuneración gravada acumulada",
    accTaxableJune: "Enero a junio, haya sido objeto de retención o no.",
    accTaxableDecember: "Todo el ejercicio, haya sido objeto de retención o no.",
    accWithheld: "Retenciones ya efectuadas", accWithheldJune: "Suma de enero a mayo.", accWithheldDecember: "Suma de enero a noviembre.",
    recalcExclusions: "Deja fuera las remuneraciones con retención definitiva y las sujetas al 10% de un segundo patrono (literal h).",
    settledTaxLabel: "Impuesto del acumulado", alreadyWithheld: "Ya retenido", toWithhold: "A retener en el mes", excessLabel: "Retenido de más",
    excessNote: "La diferencia negativa no se retiene, pero tampoco se devuelve por planilla: el literal i) deja al trabajador la declaración anual o la solicitud de devolución.",
    recalcDeductionNote: "El decreto extiende la deducción de $1,600 al Tramo II de estas tablas. Aquí se prorratea a los meses que cubre cada recálculo — $800 en junio y $1,600 en diciembre — porque es lo que mantiene la continuidad con las retenciones mensuales.",
    recalcEmployerNote: "Si hubo cambio de patrono, el recálculo lo hace el último del período y los acumulados deben incluir lo del anterior, según su constancia de retención.",
    modeRecalc: "Estimar junio o diciembre", modeRecalcSub: "El ajuste acumulado del año",
    recalcWhyTitle: "Por qué existe este recálculo", recalcWhySubtitle: "Y por qué dos personas con el mismo salario pueden terminar distinto",
    recalcWhyText: "La retención mensual es un anticipo: cada período se calcula por separado, como si el año entero fuera igual a ese mes. En junio y en diciembre el patrono deja de mirar el mes y mira el acumulado —lo gravado de todo el período contra la tabla del período— y le resta lo que ya te retuvo. La diferencia es la retención de ese mes. Es el mecanismo que corrige, de una sola vez, todo lo que los meses sueltos no pudieron ver.",
    recalcWhyDiffText: "Por eso dos personas con el mismo salario mensual pueden terminar con retenciones distintas: una recibió aguinaldo o una bonificación gravada y la otra no; una tuvo aumento a mitad de año; una empezó en marzo y acumuló menos meses; una cambió de patrono y el último del período tiene que sumar lo del anterior; una cruzó del Tramo II al III y dejó de llevar la deducción de $1,600 en el mes. El acumulado ve todo eso; el mes suelto, no.",
    recalcSourceLabel: "De dónde salen los acumulados",
    recalcEnter: "Los tengo", recalcEstimate: "Estimarlos",
    recalcEnterHint: "Tomados de tus boletas o de la constancia de retención.",
    recalcEstimateHint: "Calculados de un salario mensual que no cambió en el período.",
    recalcSalary: "Salario mensual bruto", recalcSalaryHint: "El mismo todos los meses del período, antes de descuentos.",
    recalcEstimateNote: (months: string, withheldMonths: string, taxable: string, withheld: string) =>
      `Estimado con ${months} meses iguales de ${taxable} de base gravada, y ${withheldMonths} meses de ${withheld} de retención: el mes que se recalcula todavía no ha retenido, porque su retención es justamente la diferencia de abajo. Si tu año no fue plano —aguinaldo, bonos, aumento, un mes sin trabajar, cambio de patrono— el acumulado real es otro y conviene leerlo de las boletas.`,
    recalcEstimateFrom: "Estimado del salario",
    recalcExplainNegative: "Sale negativo cuando lo que ya te retuvieron supera el impuesto del acumulado. No es un error del cálculo: es lo que pasa cuando los meses sueltos retuvieron de más, y el decreto no lo devuelve por planilla.",
    taxDecree: "Decreto Ejecutivo 10/2025: tablas de retención", taxLaw: "Ley de Impuesto sobre la Renta: arts. 29, 37 y 65",
    isssSource: "ISSS: tasa laboral y techo de cotización", pensionSource: "SSF: Ley Integral del Sistema de Pensiones",
    payrollModeLabel: "Qué querés hacer",
    modeCalc: "Calcular mis descuentos", modeCalcSub: "Cuánto debería descontarte la planilla",
    modeCheck: "Revisar mi boleta de pago", modeCheckSub: "Comparar lo que sí te descontaron",
    payslipTitle: "Lo que dice tu boleta", payslipSubtitle: "Copiá las cifras tal como aparecen impresas",
    payslipHint: "Todos los campos son opcionales. El que dejés vacío no se compara.",
    slipAfp: "AFP según la boleta", slipIsss: "ISSS según la boleta",
    slipIsr: "Renta retenida según la boleta", slipNet: "Pago neto según la boleta",
    helpSlipAfp: "El aporte de AFP que aparece descontado en el período. Si tu boleta lo separa en cotización y comisión, sumá las dos líneas.",
    helpSlipIsss: "El aporte de ISSS descontado en el período, solo la parte laboral. Lo que paga el patrono no va aquí.",
    helpSlipIsr: "La retención de impuesto sobre la renta del período. No la sumes con AFP ni ISSS aunque vengan en el mismo bloque.",
    helpSlipNet: "El líquido que efectivamente te depositaron o te pagaron en este período, después de todos los descuentos.",
    checkResult: "Renglón por renglón",
    checkEmpty: "Sin nada que comparar", checkEmptySub: "Ingresá al menos una cifra de tu boleta.",
    checkAllMatch: "Todo coincide", checkAllMatchSub: "Las cifras que ingresaste caen dentro de un centavo de las tablas oficiales.",
    checkDifference: "diferencia por revisar", checkDifferences: "diferencias por revisar",
    checkDiffSub: "Cada una lleva abajo la causa probable y la regla que la explica.",
    colExpected: "Según las tablas", colReported: "Tu boleta", colDifference: "Diferencia",
    stMatch: "Coincide", stHigher: "La boleta es mayor", stLower: "La boleta es menor", stUnchecked: "Sin comparar",
    causeLead: "Causa probable", causeLeadPlural: "Causas probables",
    checkIntro: "Se compara con un centavo de tolerancia, porque tu planilla y esta calculadora redondean por separado.",
    checkTone: "Esto describe diferencias entre tu boleta y las tablas oficiales; no afirma que tu patrono haya incumplido. Hay conceptos legítimos que esta calculadora no conoce y que pueden explicar una diferencia: préstamos de planilla, embargos, órdenes de descuento, anticipos, viáticos o pagos que no forman parte del salario cotizable.",
    invalidDates: "Revisa las fechas: el último día de trabajo debe ser posterior al ingreso y ambas deben caer entre 1950 y 2100.",
    exportPdf: "Descargar PDF", exportHint: "Llevate el cálculo",
    pdfCheckTitle: "Revisión de boleta de pago", pdfCheckSubtitle: "AFP, ISSS y renta · El Salvador",
    pdfCheckSlug: "boleta", pdfCheckStatus: "Estado", pdfCheckCauses: "Causas probables",
    pdfCheckNotAdvice: "Comparación educativa calculada en el navegador de quien la generó. Describe diferencias frente a las tablas oficiales; no constituye un dictamen ni afirma incumplimiento de nadie.",
    pdfTitle: "Estimación de finiquito", pdfSubtitle: "Sector privado · Código de Trabajo de El Salvador",
    pdfInput: "Dato usado", pdfValue: "Valor",
    pdfConcept: "Concepto", pdfDetail: "Cómo sale", pdfAmount: "Monto",
    pdfTotal: "TOTAL BRUTO ESTIMADO",
    pdfBasis: "Base del cálculo", pdfBasisValue: "Monto",
    pdfDailySalary: "Salario diario ordinario (salario mensual ÷ 30)",
    pdfCapLimit: "Tope legal del salario base",
    pdfCapMultiple: (multiple: number) => `${multiple} ${multiple === 1 ? "salario mínimo diario" : "salarios mínimos diarios"} del sector`,
    pdfBaseUsed: "Salario diario usado para la prestación",
    pdfCapApplied: "Sí: el salario diario supera el tope, así que la prestación se calcula sobre el tope.",
    pdfCapFree: "No: el salario diario está por debajo del tope, así que se usa completo.",
    pdfCapRow: "¿Se aplicó el tope legal?",
    pdfYes: "Sí", pdfNo: "No",
    pdfServiceDays: "días de servicio", pdfDaysPerYear: "días por año", pdfPerDay: "diarios", pdfSurcharge: "30%",
    pdfNotAdvice: "Estimación educativa calculada en el navegador de quien la generó; no sustituye asesoría legal o contable ni un finiquito firmado.",
    pdfDisputedVacation: "Vacación proporcional en renuncia: el artículo 187 reconoce la parte proporcional cuando la terminación es con responsabilidad patronal o hay despido de hecho, y para quien renuncia menciona solo la vacación del año continuo ya cumplido. El servicio oficial del MTPS sí paga la fracción en renuncia, y esa es la lectura aplicada aquí. La diferencia está descrita, no resuelta.",
    pdfSlug: "finiquito",
    helpStart: "El primer día que trabajaste para este patrono, tal como aparece en el contrato. De aquí sale la antigüedad, que define los días de indemnización y de aguinaldo.",
    helpEnd: "El último día que trabajaste, no el día que te avisaron ni el día que te pagaron. Se cuenta como día trabajado y con él se elige la tabla de salario mínimo vigente.",
    helpSalary: "El salario mensual ordinario, antes de descuentos. Si tenés comisiones habituales, promedialas y sumalas; no incluyas viáticos ni pagos que no sean salario.",
    helpSector: "La actividad económica del patrono, no tu puesto. Solo se usa para el tope de la indemnización: el artículo 58 la limita a cuatro salarios mínimos diarios del sector.",
    helpPendingDays: "Días ya trabajados que todavía no te han pagado al momento de salir. Si estás al día, dejá cero.",
    helpUnusedVacation: "Períodos completos de vacaciones que cumpliste y nunca te dieron. Es el año completo de servicio que genera los 15 días, no días sueltos: la fracción del año en curso se calcula aparte.",
    helpGross: "Todo lo que te pagan en el período antes de descuentos, contando lo gravado con renta. La Quincena 25 no va aquí porque el D.L. 499 la declara renta no gravable.",
    helpFrequency: "Cada cuánto te pagan. Cambia la tabla que se aplica y cómo se prorratean el techo del ISSS y la deducción fija.",
    helpAnnualGross: "Lo que sumás en el año de renta gravada. Solo decide si tenés derecho a la deducción de $1,600, que corresponde hasta $9,100 anuales. Si lo dejás vacío se estima multiplicando este período.",
    helpAccTaxable: "La suma de las remuneraciones gravadas del período, ya descontados AFP e ISSS. Entra todo lo gravado aunque en su mes no se le haya retenido nada.",
    helpAccWithheld: "La suma de lo que ya se te retuvo de renta en los meses anteriores del período. Si cambiaste de patrono, incluí también lo del anterior según su constancia.",
    differsLead: "Otras calculadoras muestran", differsTail: "en esta casilla, porque aplican la tabla sin restar la deducción de $1,600. Hasta abril de 2025 eso era lo correcto.",
    differsSummary: "¿Por qué otra calculadora me da un resultado distinto?",
    differsBody: "Hasta abril de 2025, el literal e) del D.E. 95/2015 decía que las tablas «contienen» la deducción de $1,600, así que no había que restarla aparte y la retención empezaba en un bruto de $612.82. El D.E. 10/2025 lo invirtió: su literal e) se titula «Deducciones no incorporadas» y establece que los valores del Tramo II no la contienen «por lo tanto, para efectos de aplicar la respectiva retención deben ser consideradas en el cálculo correspondiente». Con esa deducción, quien gana hasta $758.33 al mes no retiene nada, y es lo que corresponde: sus $9,100 anuales, menos cotizaciones y menos los $1,600, quedan bajo los $6,600 exentos del artículo 37, así que su declaración anual liquida cero. Una calculadora que no la reste le retiene alrededor de $306 al año que después tendría que solicitar en devolución. Muchas planillas del país siguen con la regla anterior, así que puede que el descuento real que veas sea el otro.",
  },
  en: {
    data: "Employment details", result: "Gross estimate", start: "Employment start date", end: "Last day worked",
    salary: "Ordinary monthly salary", salaryHint: "Include averaged recurring commissions, when applicable.",
    cause: "How employment ends", dismissal: "Unjustified dismissal", resignation: "Voluntary resignation",
    sector: "Employer's economic sector", pendingDays: "Unpaid salary days",
    unusedVacation: "Complete unused vacation periods", aguinaldoPaid: "This year's year-end bonus was already paid",
    service: "Estimated service", year: "year", yearPlural: "years", month: "month", monthPlural: "months",
    period: "completed period", periodPlural: "completed periods", daysLabel: "days",
    completedPeriodsLead: "You have", completedPeriodsTail: "; enter only the ones you were never paid.",
    total: "Estimated gross total", indemnity: "Severance / benefit",
    vacation: "Vacation + 30%", aguinaldo: "Year-end bonus", pendingSalary: "Unpaid salary",
    vacationComplete: "Complete-period vacation + 30%", vacationFraction: "Proportional vacation + 30%",
    quincena25: "Quincena 25",
    quincena25Note: "Ley Especial Quincena Veinticinco (Decree 499): article 2 sets it at 50% of the monthly salary and only for those earning $1,500 or less, and article 1 requires it to be paid in full, with no withholding or deduction of any kind. It is mandatory for private employers from 2027. It is included in this calculation because the termination falls inside the window of article 3: \"antes del veinticinco de enero o en esa misma fecha\".",
    quincena25OutsideLead: "You meet everything else for the Quincena 25 — dismissal, salary within the ceiling, a date inside the regime — but the termination falls outside the window of article 3, which names whoever leaves \"antes del veinticinco de enero o en esa misma fecha\". That strict reading is the one applied here, and the line is zero. The broad reading, the one referring to the year-end bonus rules, would have paid",
    quincena25OutsideTail: "for the proportional share of the cycle.",
    wageOutOfRange: "The end date precedes the oldest minimum wage table we have verified. The cap uses that table, which may not be the one in force that day.",
    aguinaldoAmbiguousLead: "The last day worked falls before 20 October, and length of service crosses a step between those two dates. The scale used here is the one at the last day worked",
    aguinaldoAmbiguousMid: "days, the reading that does not assume time that was not worked. On the 20 October scale it would be",
    aguinaldoAmbiguousTail: "days. The reform does not expressly say which scale governs someone whose contract ended before the cutoff; if the difference matters to you, check it with the MTPS.",
    dailyBase: "Daily salary used for the benefit", vacationDays: "Vacation days included",
    resignationOk: "Service meets the two-year minimum. Entitlement also requires statutory notice and resignation formalities.",
    resignationNo: "Service does not meet the two-year minimum for the voluntary resignation benefit.",
    resignationRule: "The benefit is estimated on complete years: unlike article 58, article 8 does not recognise fractions of a year.",
    dismissalNote: "Article 58 grants 30 days per year and fractions, with a 15-day minimum and a cap of four daily minimum wages.",
    grossNote: "This is a gross estimate. Salary and vacation may have payroll deductions; statutory dismissal and resignation benefits are income-tax exempt. Agreements may improve these minimums.",
    disputeLink: "See both readings of this rule",
    sources: "Sources and rules applied", code: "Labor Code: articles 58, 140, 177, 187 and 196-202",
    officialCalc: "MTPS official calculation service", resignationLaw: "Voluntary Resignation Law: articles 2, 5 and 7-9",
    wageDecree: "Executive Decree 12/2025: minimum wage table in force since June 2025",
    aguinaldoReform: "2025 reform: year-end bonus and article 202 moved to 20 October",
    vacationSource: "Annual paid vacation: articles 177-185 (CSJ)",
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
    fixedOnlyBandTwo: "Literal e) of the decree leaves the $1,600 out of band II alone. Bands III and IV already build it into their limits, so it is not subtracted again here.",
    tableTitle: "Official table for", from: "From", to: "To", rate: "%", excess: "Excess over", fixed: "Fixed amount",
    noRetention: "No withholding", onwards: "And above", recalc: "June and December recalculation tables",
    officialPdf: "Official PDF",
    june: "June · January-June cumulative", december: "December · annual cumulative",
    recalcNote: "In June and December, employers recalculate using cumulative taxable remuneration and subtract prior withholding. These are the two tables that recalculation uses.",
    recalcTitle: "Cumulative recalculation", recalcSubtitle: "Article 1 literal f) of Executive Decree 10/2025",
    recalcPeriodLabel: "Recalculation period", juneOption: "June (first)", decemberOption: "December (second)",
    accTaxable: "Cumulative taxable remuneration",
    accTaxableJune: "January to June, whether it was withheld on or not.",
    accTaxableDecember: "The whole tax year, whether it was withheld on or not.",
    accWithheld: "Withholding already made", accWithheldJune: "January to May total.", accWithheldDecember: "January to November total.",
    recalcExclusions: "Leave out remuneration under final withholding and pay subject to a second employer's 10% (literal h).",
    settledTaxLabel: "Tax on the cumulative base", alreadyWithheld: "Already withheld", toWithhold: "To withhold this month", excessLabel: "Over-withheld",
    excessNote: "A negative difference withholds nothing, but payroll does not refund it either: literal i) leaves the worker the annual return or a refund request.",
    recalcDeductionNote: "The decree extends the $1,600 deduction to band II of these tables. It is prorated here to the months each recalculation covers — $800 in June and $1,600 in December — because that is what keeps it continuous with the monthly withholding.",
    recalcEmployerNote: "After a change of employer the last one in the period runs the recalculation, and the cumulative figures must include the previous employer's, per its withholding certificate.",
    modeRecalc: "Estimate June or December", modeRecalcSub: "The year's cumulative adjustment",
    recalcWhyTitle: "Why this recalculation exists", recalcWhySubtitle: "And why two people on the same salary can end up different",
    recalcWhyText: "Monthly withholding is an advance payment: each period is worked out on its own, as though the whole year looked like that one month. In June and in December the employer stops looking at the month and looks at the cumulative figure — everything taxable in the period against the period's table — and subtracts what has already been withheld from you. The difference is that month's withholding. It is the mechanism that corrects, in one go, everything the separate months could not see.",
    recalcWhyDiffText: "That is why two people on the same monthly salary can end up with different withholding: one received a year-end bonus or a taxable bonus and the other did not; one got a mid-year raise; one started in March and accumulated fewer months; one changed employers, and the last one in the period has to add in the earlier one's figures; one crossed from band II to band III and stopped carrying the $1,600 deduction in the month. The cumulative figure sees all of that. A single month does not.",
    recalcSourceLabel: "Where the cumulative figures come from",
    recalcEnter: "I have them", recalcEstimate: "Estimate them",
    recalcEnterHint: "Taken from your payslips or from the withholding certificate.",
    recalcEstimateHint: "Worked out from a monthly salary that did not change in the period.",
    recalcSalary: "Gross monthly salary", recalcSalaryHint: "The same every month of the period, before deductions.",
    recalcEstimateNote: (months: string, withheldMonths: string, taxable: string, withheld: string) =>
      `Estimated from ${months} identical months of ${taxable} of taxable base, and ${withheldMonths} months of ${withheld} of withholding: the month being recalculated has not withheld yet, because its withholding is precisely the difference below. If your year was not flat — a year-end bonus, bonuses, a raise, a month not worked, a change of employer — the real cumulative figure is a different one, and it is worth reading off the payslips.`,
    recalcEstimateFrom: "Estimated from salary",
    recalcExplainNegative: "It comes out negative when what has already been withheld from you exceeds the tax on the cumulative base. That is not a fault in the calculation: it is what happens when the separate months withheld too much, and the decree does not refund it through payroll.",
    taxDecree: "Executive Decree 10/2025: withholding tables", taxLaw: "Income Tax Law: articles 29, 37 and 65",
    isssSource: "ISSS: employee rate and contribution ceiling", pensionSource: "SSF: Integral Pension System Law",
    payrollModeLabel: "What you want to do",
    modeCalc: "Work out my deductions", modeCalcSub: "What payroll should be taking off",
    modeCheck: "Check my payslip", modeCheckSub: "Compare what was actually deducted",
    payslipTitle: "What your payslip says", payslipSubtitle: "Copy the figures exactly as they are printed",
    payslipHint: "Every field is optional. Anything left empty is simply not compared.",
    slipAfp: "Pension contribution on the payslip", slipIsss: "ISSS contribution on the payslip",
    slipIsr: "Income tax withheld on the payslip", slipNet: "Take-home pay on the payslip",
    helpSlipAfp: "The pension contribution deducted in the period. If your payslip splits it into contribution and fee, add the two lines together.",
    helpSlipIsss: "The ISSS contribution deducted in the period, the employee share only. What the employer pays does not belong here.",
    helpSlipIsr: "The income tax withheld in the period. Do not add pension or ISSS to it, even where they are printed in the same block.",
    helpSlipNet: "What was actually deposited or paid to you for this period, after every deduction.",
    checkResult: "Line by line",
    checkEmpty: "Nothing to compare yet", checkEmptySub: "Enter at least one figure from your payslip.",
    checkAllMatch: "Everything matches", checkAllMatchSub: "The figures you entered are within a cent of the official tables.",
    checkDifference: "difference to look at", checkDifferences: "differences to look at",
    checkDiffSub: "Each one carries its probable cause and the rule behind it below.",
    colExpected: "Per the tables", colReported: "Your payslip", colDifference: "Difference",
    stMatch: "Matches", stHigher: "Payslip is higher", stLower: "Payslip is lower", stUnchecked: "Not compared",
    causeLead: "Probable cause", causeLeadPlural: "Probable causes",
    checkIntro: "Compared with a one-cent tolerance, because your payroll and this calculator round separately.",
    checkTone: "This describes differences between your payslip and the official tables; it does not assert that your employer failed to comply. There are lawful items this calculator knows nothing about that can explain a difference: payroll loans, garnishments, deduction orders, advances, travel allowances or pay that is not contributory salary.",
    invalidDates: "Check the dates: the last day worked must be after the start date and both must fall between 1950 and 2100.",
    exportPdf: "Download PDF", exportHint: "Take the calculation with you",
    pdfCheckTitle: "Payslip check", pdfCheckSubtitle: "Pension, ISSS and income tax · El Salvador",
    pdfCheckSlug: "payslip", pdfCheckStatus: "Status", pdfCheckCauses: "Probable causes",
    pdfCheckNotAdvice: "An educational comparison, worked out in the browser of whoever generated it. It describes differences against the official tables; it is not a ruling and asserts no failure to comply by anyone.",
    pdfTitle: "Employment settlement estimate", pdfSubtitle: "Private sector · Labour Code of El Salvador",
    pdfInput: "Detail used", pdfValue: "Value",
    pdfConcept: "Concept", pdfDetail: "How it is worked out", pdfAmount: "Amount",
    pdfTotal: "ESTIMATED GROSS TOTAL",
    pdfBasis: "Basis of the calculation", pdfBasisValue: "Amount",
    pdfDailySalary: "Ordinary daily salary (monthly salary ÷ 30)",
    pdfCapLimit: "Statutory cap on the base salary",
    pdfCapMultiple: (multiple: number) => `${multiple} daily minimum ${multiple === 1 ? "wage" : "wages"} for the sector`,
    pdfBaseUsed: "Daily salary used for the benefit",
    pdfCapApplied: "Yes: the daily salary is above the cap, so the benefit is calculated on the cap.",
    pdfCapFree: "No: the daily salary is below the cap, so it is used in full.",
    pdfCapRow: "Was the statutory cap applied?",
    pdfYes: "Yes", pdfNo: "No",
    pdfServiceDays: "days of service", pdfDaysPerYear: "days per year", pdfPerDay: "a day", pdfSurcharge: "30%",
    pdfNotAdvice: "An educational estimate, worked out in the browser of whoever generated it; it is not legal or accounting advice, nor a signed settlement.",
    pdfDisputedVacation: "Proportional vacation on resignation: article 187 grants the proportional part where termination carries employer responsibility or the worker is dismissed de facto, and for someone who resigns it mentions only the vacation of the continuous year already completed. The MTPS official service does pay the fraction on a resignation, and that is the reading applied here. The difference is described, not resolved.",
    pdfSlug: "settlement",
    helpStart: "The first day you worked for this employer, as the contract states it. Length of service comes from here, and it sets the severance and year-end bonus days.",
    helpEnd: "The last day you actually worked — not the day you were told, nor the day you were paid. It counts as a worked day and it picks the minimum wage table in force.",
    helpSalary: "The ordinary monthly salary before deductions. Average any recurring commissions and add them; leave out travel allowances and anything that is not salary.",
    helpSector: "The employer's line of business, not your job title. It is only used for the severance cap: article 58 limits it to four daily minimum wages for that sector.",
    helpPendingDays: "Days already worked that had not been paid when you left. Leave it at zero if you were paid up to date.",
    helpUnusedVacation: "Complete vacation periods you earned and never took. It means a full year of service, which is what grants the 15 days — the current year's fraction is worked out separately.",
    helpGross: "Everything paid to you in the period before deductions, counting what is taxable. The Quincena 25 does not belong here: Decree 499 declares it non-taxable income.",
    helpFrequency: "How often you are paid. It changes which table applies and how the ISSS ceiling and the fixed deduction are prorated.",
    helpAnnualGross: "What you add up in taxable income for the year. It only decides whether you qualify for the $1,600 deduction, which applies up to $9,100 a year. Left empty, it is estimated from this period.",
    helpAccTaxable: "The sum of taxable remuneration for the period, already net of pension and ISSS. Everything taxable counts, even months where nothing was withheld.",
    helpAccWithheld: "The sum of income tax already withheld from you in the earlier months of the period. After a change of employer, include the previous one's per its certificate.",
    differsLead: "Other calculators show", differsTail: "in this box, because they apply the table without subtracting the $1,600 deduction. Until April 2025 that was the correct reading.",
    differsSummary: "Why does another calculator give me a different result?",
    differsBody: "Until April 2025, literal e) of Decree 95/2015 said the tables already \"contain\" the $1,600 deduction, so there was nothing to subtract separately and withholding began at a gross of $612.82. Decree 10/2025 reversed it: its literal e) is headed \"Deductions not incorporated\" and states that the band II figures do not contain it, \"therefore, for the purposes of applying the respective withholding they must be considered in the corresponding calculation\". With that deduction, someone earning up to $758.33 a month withholds nothing — which is the right answer, because their $9,100 a year, less contributions and less the $1,600, falls under the $6,600 exempt under article 37, so their annual return settles at zero. A calculator that skips it withholds roughly $306 a year they would then have to claim back. Many payrolls in the country still follow the older rule, so the deduction you actually see may well be the other one.",
  },
} as const;

const sectorLabels = {
  es: { commerce: "Comercio, servicios e industria", maquila: "Maquila textil", coffee: "Beneficios de café / caña", agriculture: "Agro, pesca / cosecha de café" },
  en: { commerce: "Commerce, services and industry", maquila: "Textile maquila", coffee: "Coffee processing / sugar cane", agriculture: "Agriculture / fishing / coffee" },
} as const;

/**
 * Why a line of a payslip came out different, in the reader's language.
 *
 * The identifiers come from `verifyPayslip`, which only attaches one after its
 * arithmetic has actually landed on the reported figure. So every sentence here
 * is allowed to be specific — it is describing a reading that reproduces the
 * number, not a list of things that sometimes go wrong.
 *
 * All of them describe and none of them accuse. The subject of these sentences
 * is the figure, never the employer: "la retención de la boleta es la que da la
 * tabla aplicada sobre el bruto" says exactly what was found, where "tu patrono
 * calculó mal" would be a conclusion this calculator is in no position to reach.
 * Several of these causes are, in fact, lawful readings that this project
 * disagrees with rather than errors — the pre-2025 fixed deduction rule is still
 * what much of the country's payroll software does.
 */
type CauseText = (amount: number, money: Intl.NumberFormat) => string;

const causeCopy: Record<Lang, Record<PayslipCauseId, CauseText>> = {
  es: {
    afpNotApplied: () => "La boleta no muestra aporte de AFP en este período. Para quien cotiza, corresponde el 7.25% del salario cotizable.",
    afpApplied: () => "Marcaste que no se descuenta AFP, pero la boleta sí trae un aporte. Si sí cotizás, activá la casilla y volvé a comparar.",
    afpOtherBase: (amount, money) => `El aporte de la boleta equivale al 7.25% de ${money.format(amount)}, no de la remuneración que ingresaste. Puede haber pagos que no son salario cotizable —viáticos, por ejemplo— o una base tope que la ley vigente ya no reconoce.`,
    isssNotApplied: () => "La boleta no muestra aporte de ISSS en este período. La cotización laboral es del 3%.",
    isssApplied: () => "Marcaste que no se descuenta ISSS, pero la boleta sí trae un aporte. Si sí cotizás, activá la casilla y volvé a comparar.",
    isssNoCeiling: (amount, money) => `El ISSS de la boleta es el 3% de toda la remuneración, sin aplicar el techo de cotización del período (${money.format(amount)}). Por encima de ese techo el descuento ya no sube.`,
    isssOtherBase: (amount, money) => `El aporte de la boleta equivale al 3% de ${money.format(amount)}, que no es ni la remuneración que ingresaste ni el techo del período.`,
    isssProration: () => "El ISSS se liquida en planilla mensual. Para pagos quincenales y semanales repartir el techo entre los períodos es una aproximación nuestra, así que una diferencia de centavos puede venir de ahí y no de la planilla.",
    isrNotApplied: () => "La boleta no muestra retención de renta, y con esta base la tabla del período sí retiene.",
    isrOnGross: () => "La retención de la boleta es exactamente la que da la tabla aplicada sobre el bruto, sin restarle antes AFP e ISSS. La base gravada se obtiene después de esos dos aportes.",
    isrWithoutFixedDeduction: () => "La retención de la boleta es la que da la tabla sin restar la deducción fija de $1,600. Hasta abril de 2025 esa era la lectura correcta; el D.E. 10/2025 la invirtió para el Tramo II, y muchas planillas del país siguen con la anterior.",
    isrWithFixedDeduction: (amount, money) => `La retención de la boleta es la que resulta de restar ${money.format(amount)} de deducción fija a la base. En este caso no corresponde restarla: o el tramo ya la trae incorporada en sus límites, o la renta anual pasa del límite de $9,100.`,
    isrQuincena25: (amount, money) => `La retención de la boleta coincide con la que saldría si a la base gravada se le hubieran sumado ${money.format(amount)} de Quincena 25. La ley que la crea la declara renta no gravable y prohíbe toda retención y todo descuento sobre ella, así que no debería entrar en esa base.`,
    isrRecalc: (amount, money) => `Son ${money.format(amount)} por encima de la tabla del período, y ninguna de las lecturas anteriores lo reproduce. En junio y diciembre el patrono recalcula con lo acumulado del año y resta lo ya retenido, así que un solo pago puede llevar todo el ajuste. Podés estimarlo en el otro modo, en el recálculo acumulado.`,
    netDeductionsDiffer: () => "El neto sigue a los descuentos: si alguno de los de arriba difiere, este también lo hará por la misma cantidad.",
    netUndisclosed: (amount, money) => amount > 0
      ? `Restando AFP, ISSS y renta a la remuneración quedan ${money.format(amount)} que estas líneas no recogen. Ahí caben conceptos legítimos que esta calculadora no conoce: préstamos, embargos, órdenes de descuento o anticipos.`
      : `El neto de la boleta es ${money.format(Math.abs(amount))} mayor de lo que dejan la remuneración y esos tres descuentos. Puede haber en el mismo período un pago que no incluiste en la remuneración bruta.`,
    unexplained: () => "Ninguna de las lecturas que esta calculadora conoce reproduce esta cifra. Puede venir de un concepto que no le declaramos o de una base distinta a la que ingresaste.",
  },
  en: {
    afpNotApplied: () => "The payslip shows no pension contribution for this period. For anyone contributing, it is 7.25% of contributory salary.",
    afpApplied: () => "You unticked the pension contribution, but the payslip does show one. If you do contribute, tick the box and compare again.",
    afpOtherBase: (amount, money) => `The payslip contribution is 7.25% of ${money.format(amount)}, not of the pay you entered. There may be items that are not contributory salary — travel allowances, for instance — or a maximum base the law in force no longer recognises.`,
    isssNotApplied: () => "The payslip shows no ISSS contribution for this period. The employee rate is 3%.",
    isssApplied: () => "You unticked the ISSS contribution, but the payslip does show one. If you do contribute, tick the box and compare again.",
    isssNoCeiling: (amount, money) => `The payslip's ISSS is 3% of the whole remuneration, without applying the period's contribution ceiling (${money.format(amount)}). Above that ceiling the deduction stops rising.`,
    isssOtherBase: (amount, money) => `The payslip contribution is 3% of ${money.format(amount)}, which is neither the pay you entered nor the period's ceiling.`,
    isssProration: () => "ISSS is settled on a monthly planilla. For twice-monthly and weekly pay, spreading the ceiling across periods is our own approximation, so a difference of cents may come from that rather than from payroll.",
    isrNotApplied: () => "The payslip shows no income tax withholding, and at this base the period's table does withhold.",
    isrOnGross: () => "The payslip's withholding is exactly what the table gives applied to the gross, without first deducting pension and ISSS. The taxable base is what remains after those two contributions.",
    isrWithoutFixedDeduction: () => "The payslip's withholding is what the table gives without subtracting the $1,600 fixed deduction. Until April 2025 that was the correct reading; Decree 10/2025 reversed it for band II, and much of the country's payroll still follows the older one.",
    isrWithFixedDeduction: (amount, money) => `The payslip's withholding is what results from subtracting ${money.format(amount)} of fixed deduction from the base. It does not belong here: either the band already builds it into its limits, or annual income is above the $9,100 limit.`,
    isrQuincena25: (amount, money) => `The payslip's withholding matches what would result if ${money.format(amount)} of Quincena 25 had been added to the taxable base. The law creating that benefit declares it non-taxable income and bars every withholding and deduction on it, so it should not enter that base.`,
    isrRecalc: (amount, money) => `That is ${money.format(amount)} above the period's table, and none of the readings above reproduces it. In June and December the employer recalculates on the year's cumulative pay and subtracts what was already withheld, so a single payment can carry the whole adjustment. You can estimate it in the other mode, under the cumulative recalculation.`,
    netDeductionsDiffer: () => "Take-home pay follows the deductions: if any of the lines above differs, this one differs with it by the same amount.",
    netUndisclosed: (amount, money) => amount > 0
      ? `After pension, ISSS and income tax, ${money.format(amount)} of the remuneration is not accounted for by these lines. Lawful items this calculator knows nothing about fit there: loans, garnishments, deduction orders or advances.`
      : `The payslip's take-home is ${money.format(Math.abs(amount))} higher than the remuneration and those three deductions leave. There may be a payment in the same period that you did not include in the gross.`,
    unexplained: () => "None of the readings this calculator knows reproduces this figure. It may come from an item we were not told about, or from a base other than the one you entered.",
  },
};

/** Text and a mark, never colour alone: the status has to survive a print-out. */
const statusMark: Record<PayslipStatus, string> = {
  match: "=", higher: "▲", lower: "▼", unchecked: "·",
};

function number(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
/**
 * An empty payslip box, kept apart from a zero.
 *
 * They are opposite claims and `number` would flatten them into the same one:
 * "I do not have this figure" is a line that must not be compared, while "the
 * payslip deducted nothing" is itself one of the differences worth finding.
 */
function reportedFigure(value: string) { return value.trim() === "" ? null : number(value); }
// A last day of work can legitimately be scheduled ahead of today, but only by
// so much; the rest of the range comes from the calculation module.
const LATEST_END_DATE = `${Number(todayIso().slice(0, 4)) + 1}-12-31`;

/**
 * How many complete vacation periods the dates already grant, said out loud
 * beside the field. The number is deliberately not written into the input: only
 * the worker knows which of those periods were actually paid, and defaulting to
 * "all of them" would inflate the estimate by 15 days of salary a year. Naming
 * it turns a zero into a decision instead of an oversight — leaving it at zero
 * with years of service is what makes the vacation line look impossibly small.
 */
function completedPeriodsNote(completedYears: number, t: typeof copy.es | typeof copy.en) {
  const label = completedYears === 1 ? t.period : t.periodPlural;
  return `${t.completedPeriodsLead} ${completedYears} ${label}${t.completedPeriodsTail}`;
}

function serviceLabel(settlement: { completedYears: number; serviceMonths: number }, t: typeof copy.es | typeof copy.en) {
  const years = `${settlement.completedYears} ${settlement.completedYears === 1 ? t.year : t.yearPlural}`;
  if (settlement.serviceMonths === 0) return years;
  return `${years} · ${settlement.serviceMonths} ${settlement.serviceMonths === 1 ? t.month : t.monthPlural}`;
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
  const [recalcPeriod, setRecalcPeriod] = useState<RecalcPeriod>("june");
  const [accSource, setAccSource] = useState<AccumulatedSource>("estimated");
  const [accSalary, setAccSalary] = useState("900");
  const [accTaxable, setAccTaxable] = useState("5400");
  const [accWithheld, setAccWithheld] = useState("400");
  const [payrollMode, setPayrollMode] = useState<PayrollMode>("calculate");
  // Empty on purpose, all four of them. A prefilled payslip would be someone
  // else's figures compared against the reader's pay, and the first thing they
  // would see is a difference that is not theirs.
  const [slipAfp, setSlipAfp] = useState("");
  const [slipIsss, setSlipIsss] = useState("");
  const [slipIsr, setSlipIsr] = useState("");
  const [slipNet, setSlipNet] = useState("");

  const settlement = useMemo(() => calculateSettlement({
    startDate, endDate, monthlySalary: number(monthlySalary), sector, termination,
    pendingSalaryDays: number(pendingDays), unusedVacationPeriods: number(unusedVacation), aguinaldoPaid,
  }), [aguinaldoPaid, endDate, monthlySalary, pendingDays, sector, startDate, termination, unusedVacation]);
  const payroll = useMemo(() => calculatePayrollWithholding({ gross: number(gross), frequency, includeAfp, includeIsss, applyFixedDeduction, annualGross: number(annualGross) }), [annualGross, applyFixedDeduction, frequency, gross, includeAfp, includeIsss]);
  // What the same pay would withhold under the pre-2025 reading, where the
  // tables were said to already contain the $1,600. Shown only when it differs,
  // because that gap is what makes this calculator disagree with the ones that
  // never caught up with the reform.
  const withoutFixedDeduction = useMemo(
    () => withholdingForTaxable(payroll.taxableBeforeFixedDeduction, frequency).amount,
    [frequency, payroll.taxableBeforeFixedDeduction]);
  // Six or twelve identical months of a salary, for the reader who does not
  // have the accumulated figures to hand — which is most of them. Computed
  // whichever source is selected, because it is what the estimate mode shows
  // in the fields themselves.
  const estimate = useMemo(() => estimateAccumulated({
    period: recalcPeriod, monthlySalary: number(accSalary),
    includeAfp, includeIsss, applyFixedDeduction,
  }), [accSalary, applyFixedDeduction, includeAfp, includeIsss, recalcPeriod]);
  const estimating = accSource === "estimated";
  // The annual figure feeds the same $9,100 test in both panels. Typed in, the
  // payroll form's field is reused rather than duplicated; estimated, the
  // salary already implies it, and asking again would invite the two to
  // disagree about the same year.
  const recalc = useMemo(() => calculateRecalculation({
    period: recalcPeriod,
    accumulatedTaxable: estimating ? estimate.accumulatedTaxable : number(accTaxable),
    accumulatedWithheld: estimating ? estimate.accumulatedWithheld : number(accWithheld),
    applyFixedDeduction,
    annualGross: estimating ? estimate.annualGross : number(annualGross),
  }), [accTaxable, accWithheld, annualGross, applyFixedDeduction, estimate, estimating, recalcPeriod]);
  // The same pay run the panel above already priced, read against what the
  // payslip says. It reuses every input of the calculate mode, so a reader who
  // set up their pay there and then switches has nothing to type again.
  const verify = useMemo(() => verifyPayslip({
    gross: number(gross), frequency, includeAfp, includeIsss, applyFixedDeduction,
    annualGross: number(annualGross),
    reported: {
      afp: reportedFigure(slipAfp), isss: reportedFigure(slipIsss),
      isr: reportedFigure(slipIsr), net: reportedFigure(slipNet),
    },
  }), [annualGross, applyFixedDeduction, frequency, gross, includeAfp, includeIsss,
    slipAfp, slipIsr, slipIsss, slipNet]);

  const conceptLabels: Record<PayslipConcept, string> = {
    afp: t.afp, isss: t.isss, isr: t.isr, net: t.takeHome,
  };
  const statusLabels: Record<PayslipStatus, string> = {
    match: t.stMatch, higher: t.stHigher, lower: t.stLower, unchecked: t.stUnchecked,
  };
  /**
   * A difference is only readable with its sign: +$4.00 and −$4.00 are opposite
   * findings, and a bare $4.00 makes the reader work out which one from the two
   * figures beside it.
   *
   * The minus is a parameter because the two outputs cannot share one. On screen
   * it is U+2212, the character that is the width of a digit and lines the
   * column up. In the PDF that codepoint is outside the encoding jsPDF's built-in
   * fonts use, and it comes out as a quotation mark — so the exported document
   * asks for the ASCII hyphen instead.
   */
  const signed = (value: number, minus = "−") =>
    `${value > 0 ? "+" : value < 0 ? minus : ""}${money.format(Math.abs(value))}`;
  /**
   * The way out of a callout that says a rule is contested.
   *
   * A note that names two readings and stops there leaves the reader holding a
   * doubt with nowhere to take it. Every one of these anchors into the entry
   * for that exact rule on /reglas-en-disputa/, which is generated from the
   * same registry the callout's figure came from — so the link cannot point at
   * a dispute the page does not carry.
   */
  const DisputeLink = ({ rule }: { rule: RuleId }) =>
    <a className="dispute-link" href={`${ROUTES[lang].disputed}#${rule}`}>{t.disputeLink} →</a>;

  const causeText = (id: PayslipCauseId, amount: number | undefined) =>
    causeCopy[lang][id](amount ?? 0, money);
  /** The article behind a cause, so the reader can open the document it is in. */
  const causeCitation = (cause: PayslipCause) =>
    cause.rule ? citationsFor([cause.rule], todayIso())[0] : undefined;

  const frequencyLabel = frequency === "monthly" ? t.monthly : frequency === "fortnightly" ? t.fortnightly : t.weekly;
  const longDate = useMemo(() => new Intl.DateTimeFormat(lang === "es" ? "es-SV" : "en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }), [lang]);
  const days = (value: number) => `${value.toFixed(2)} ${t.daysLabel}`;

  /**
   * The settlement as a document somebody can hand over.
   *
   * A screenshot of the results panel proves nothing at a human resources desk:
   * it shows a total without the salary it came from, the cap that shaped it,
   * or the articles behind it. This builds all of that — inputs, one row per
   * concept, the daily base with the cap stated in words, and the citations
   * read out of `rules.ts` for the rules this case actually applied.
   *
   * Nothing here re-derives a figure. Every number is one `calculateSettlement`
   * already returned, because a PDF that computed its own totals would be a
   * second implementation nobody tests, and it would disagree with the screen
   * on exactly the cases that matter.
   */
  const exportSettlement = () => {
    const cause = termination === "dismissal" ? t.dismissal : t.resignation;
    // The middle column is what makes the document defensible: each line says
    // the days it counted and the daily figure it multiplied them by, so a
    // reader who disagrees can point at the step they disagree with instead of
    // at the total. The benefit is the one line whose rate is the capped base
    // and not the ordinary daily salary, and it says so.
    const atRate = (rate: number, surcharge = false) =>
      `${money.format(rate)} ${t.pdfPerDay}${surcharge ? ` + ${t.pdfSurcharge}` : ""}`;
    const lines: string[][] = [
      [t.indemnity,
        `${settlement.serviceDays} ${t.pdfServiceDays} · ${settlement.benefitDaysPerYear} ${t.pdfDaysPerYear} · ${atRate(settlement.indemnityBaseDaily)}`,
        money.format(settlement.indemnity)],
      [t.vacationComplete, `${days(settlement.completeVacationDays)} · ${atRate(settlement.dailySalary, true)}`, money.format(settlement.completeVacation)],
      [t.vacationFraction, `${days(settlement.proportionalVacationDays)} · ${atRate(settlement.dailySalary, true)}`, money.format(settlement.proportionalVacation)],
      [t.aguinaldo, `${days(settlement.aguinaldoDays)} · ${atRate(settlement.dailySalary)}`, money.format(settlement.aguinaldo)],
      [t.pendingSalary, `${number(pendingDays)} ${t.daysLabel} · ${atRate(settlement.dailySalary)}`, money.format(settlement.pendingSalary)],
    ];
    if (settlement.quincena25Applies) lines.push([t.quincena25, "", money.format(settlement.quincena25)]);
    lines.push([t.pdfTotal, "", money.format(settlement.total)]);

    // Every note the screen would show for this case, in the same order, so
    // that the document and the page never disagree about what was uncertain.
    const notes = [
      termination === "dismissal"
        ? t.dismissalNote
        : settlement.eligibleForResignationBenefit
          ? `${t.resignationOk} ${t.resignationRule}`
          : t.resignationNo,
    ];
    if (settlement.proportionalVacationDisputed) notes.push(t.pdfDisputedVacation);
    if (settlement.aguinaldoScaleAmbiguous) {
      notes.push(`${t.aguinaldoAmbiguousLead} (${settlement.aguinaldoScaleDays} ${t.daysLabel}): ${money.format(settlement.aguinaldo)} ${t.aguinaldoAmbiguousMid} (${settlement.aguinaldoAlternativeScaleDays} ${t.daysLabel}): ${money.format(settlement.aguinaldoAlternative)} ${t.aguinaldoAmbiguousTail}`);
    }
    if (settlement.quincena25Applies) notes.push(t.quincena25Note);
    // The zero the restrictive reading produced, and what the broad one would
    // have paid. A document that simply omits the line lets the reader believe
    // the benefit was never in play for them.
    if (settlement.quincena25OutsideWindow) {
      notes.push(`${t.quincena25OutsideLead} ${money.format(settlement.quincena25Alternative)} ${t.quincena25OutsideTail}`);
    }
    if (settlement.minimumWagePredatesTables) notes.push(t.wageOutOfRange);

    return downloadPdf({
      slug: t.pdfSlug,
      title: t.pdfTitle,
      subtitle: `${t.pdfSubtitle} · ${cause}`,
      tables: [
        {
          head: [t.pdfInput, t.pdfValue],
          body: [
            [t.cause, cause],
            [t.start, longDate.format(new Date(`${settlement.startDate}T00:00:00Z`))],
            [t.end, longDate.format(new Date(`${settlement.endDate}T00:00:00Z`))],
            [t.salary, money.format(number(monthlySalary))],
            [t.sector, sectorLabels[lang][sector]],
            [t.pendingDays, String(number(pendingDays))],
            [t.unusedVacation, String(settlement.completeVacationPeriods)],
            [t.aguinaldoPaid, aguinaldoPaid ? t.pdfYes : t.pdfNo],
            [t.service, `${serviceLabel(settlement, t)} · ${settlement.serviceDays} ${t.daysLabel}`],
          ],
        },
        {
          head: [t.pdfConcept, t.pdfDetail, t.pdfAmount],
          body: lines,
          totalRow: lines.length - 1,
          numeric: [2],
        },
        {
          head: [t.pdfBasis, t.pdfBasisValue],
          body: [
            [t.pdfDailySalary, money.format(settlement.dailySalary)],
            [`${t.pdfCapLimit} — ${t.pdfCapMultiple(settlement.capMultiplier)}`, money.format(settlement.capDaily)],
            [t.pdfBaseUsed, money.format(settlement.indemnityBaseDaily)],
            // Said in words, not left to a reader comparing the two rows above.
            [t.pdfCapRow, settlement.capApplied ? t.pdfCapApplied : t.pdfCapFree],
          ],
        },
      ],
      notes,
      citations: citationsFor(settlement.appliedRules, settlement.endDate),
      reviewed: reviewedFor("settlement"),
      disclaimer: `${t.grossNote} ${t.pdfNotAdvice}`,
    }, lang);
  };

  /**
   * The payslip check as a document, which is where it is actually used.
   *
   * Whoever finds a difference here is going to take it to a payroll desk, and
   * what makes that conversation possible is not the total but the middle of the
   * page: the four lines side by side, and under each difference the reading
   * that reproduces the payslip's own figure with the article it comes from.
   *
   * The notes carry the causes in the same words the screen used, and the last
   * one is always the caveat — that lawful deductions exist which this does not
   * model. It is printed last on purpose: on paper the closing line is the one
   * a reader takes away, and this document must not be mistaken for a finding.
   */
  const exportCheck = () => {
    const rows = verify.lines.map((line) => [
      conceptLabels[line.concept],
      money.format(line.expected),
      line.reported === null ? "—" : money.format(line.reported),
      line.status === "unchecked" ? "—" : signed(line.difference, "-"),
      statusLabels[line.status],
    ]);
    const notes = [
      ...verify.lines.flatMap((line) => line.causes.map((cause) => {
        const citation = causeCitation(cause);
        return `${conceptLabels[line.concept]} — ${causeText(cause.id, cause.amount)}${citation ? ` (${citation.norm})` : ""}`;
      })),
      t.checkTone,
    ];
    return downloadPdf({
      slug: t.pdfCheckSlug,
      title: t.pdfCheckTitle,
      subtitle: `${t.pdfCheckSubtitle} · ${frequencyLabel}`,
      tables: [
        {
          head: [t.pdfInput, t.pdfValue],
          body: [
            [t.gross, money.format(verify.expected.gross)],
            [t.frequency, frequencyLabel],
            [t.annualUsed, `${money.format(verify.expected.annualIncome)} · ${verify.expected.annualIncomeDeclared ? t.annualDeclared : t.annualEstimated}`],
            [t.includeAfp, includeAfp ? t.pdfYes : t.pdfNo],
            [t.includeIsss, includeIsss ? t.pdfYes : t.pdfNo],
            [t.fixedDeduction, applyFixedDeduction ? t.pdfYes : t.pdfNo],
            [t.taxable, money.format(verify.expected.taxable)],
          ],
        },
        {
          head: [t.pdfConcept, t.colExpected, t.colReported, t.colDifference, t.pdfCheckStatus],
          body: rows,
          numeric: [1, 2, 3],
        },
      ],
      notes,
      // Only the rules the comparison leant on, the way the settlement does it:
      // a check that never applied the fixed deduction has no business printing
      // article 29 underneath itself.
      citations: citationsFor(verify.appliedRules, todayIso()),
      reviewed: reviewedFor("withholding"),
      disclaimer: `${t.checkIntro} ${t.pdfCheckNotAdvice}`,
    }, lang);
  };

  return <section className="statutory-tools standalone-tools" id="tools">
    {tool === "settlement" ? <>
      {/* Exportar un error no le sirve a nadie, así que la acción sólo existe
          cuando hay un resultado que defender — el mismo criterio de la
          calculadora de horas extras. */}
      {!settlement.invalid && settlement.total > 0 && <div className="shell-toolbar export-toolbar">
        <div className="export-actions">
          <span>{t.exportHint}</span>
          <button type="button" onClick={exportSettlement}><i>PDF</i>{t.exportPdf}</button>
        </div>
      </div>}
      <div className="calculator-grid">
        <div className="form-panel">
          <div className="section-title"><span>01</span><div><h2>{t.data}</h2><p>{lang === "es" ? "Sector privado regido por el Código de Trabajo" : "Private sector governed by the Labor Code"}</p></div></div>
          <div className="field-grid">
            <SegmentedField full label={t.cause} lang={lang} value={termination} onChange={setTermination}
              options={[{ value: "dismissal", label: t.dismissal }, { value: "resignation", label: t.resignation }] as const} /><DateField label={t.start} lang={lang} value={startDate} onChange={setStartDate} min={EARLIEST_EMPLOYMENT_DATE} max={endDate} help={t.helpStart} />
            <DateField label={t.end} lang={lang} value={endDate} onChange={setEndDate} min={startDate} max={LATEST_END_DATE} help={t.helpEnd} />
            <MoneyField label={t.salary} lang={lang} value={monthlySalary} onChange={setMonthlySalary} note={t.salaryHint} help={t.helpSalary} />
            <SelectField label={t.sector} lang={lang} value={sector} onChange={setSector} help={t.helpSector}
              options={(Object.keys(DAILY_MINIMUM_WAGE) as WageSector[]).map((item) => ({ value: item, label: sectorLabels[lang][item] }))} />
            <NumberField label={t.pendingDays} lang={lang} value={pendingDays} onChange={setPendingDays} max="31" help={t.helpPendingDays} />
            <NumberField label={t.unusedVacation} lang={lang} value={unusedVacation} onChange={setUnusedVacation} max="50" help={t.helpUnusedVacation}
              note={settlement.invalid ? undefined : completedPeriodsNote(settlement.completedYears, t)} />
          </div>
          <CheckField label={t.aguinaldoPaid} checked={aguinaldoPaid} onChange={setAguinaldoPaid} />
        </div>
        <div className="results-panel">
          <div className="results-kicker">{t.result}</div>
          {settlement.invalid ? <div className="warning">! {t.invalidDates}</div> : <>
            <div className="result-headline"><span>{t.total}</span><strong>{money.format(settlement.total)}</strong><small>{t.service}: {serviceLabel(settlement, t)}</small></div>
            <div className="result-tiles"><div className="highlight"><span>{t.indemnity}</span><b>{money.format(settlement.indemnity)}</b></div><div><span>{t.vacationComplete}</span><b>{money.format(settlement.completeVacation)}</b><i>{settlement.completeVacationDays.toFixed(2)} {t.daysLabel}</i></div><div><span>{t.vacationFraction}</span><b>{money.format(settlement.proportionalVacation)}</b><i>{settlement.proportionalVacationDays.toFixed(2)} {t.daysLabel}</i></div><div><span>{t.aguinaldo}</span><b>{money.format(settlement.aguinaldo)}</b></div><div><span>{t.pendingSalary}</span><b>{money.format(settlement.pendingSalary)}</b></div>{settlement.quincena25Applies && <div><span>{t.quincena25}</span><b>{money.format(settlement.quincena25)}</b></div>}</div>
            <div className="result-facts"><div><span>{t.dailyBase}</span><b>{money.format(settlement.indemnityBaseDaily)}</b></div><div><span>{t.vacationDays}</span><b>{settlement.vacationDays.toFixed(2)}</b><small>{t.vacation}: {money.format(settlement.vacation)}</small></div></div>
            {settlement.minimumWagePredatesTables && <div className="callout warn"><span>!</span><p>{t.wageOutOfRange}</p></div>}
            {/* Only inside the window where the two readings of the article 198
                scale disagree. It describes the discrepancy and names both
                figures without asserting which one governs, because the reform
                does not say — see the aguinaldo entry in faq.ts. */}
            {/* El art. 187 y el servicio oficial no dicen lo mismo sobre la
                vacación proporcional en renuncia. Se describe la diferencia y
                se nombra la lectura aplicada, sin afirmar cuál rige. */}
            {settlement.proportionalVacationDisputed && <div className="callout"><span>?</span><p>{t.pdfDisputedVacation} <DisputeLink rule="vacationProportionalOnExit" /></p></div>}
            {settlement.aguinaldoScaleAmbiguous && <div className="callout"><span>?</span><p>{t.aguinaldoAmbiguousLead} ({settlement.aguinaldoScaleDays} {t.daysLabel}): <b>{money.format(settlement.aguinaldo)}</b> {t.aguinaldoAmbiguousMid} ({settlement.aguinaldoAlternativeScaleDays} {t.daysLabel}): <b>{money.format(settlement.aguinaldoAlternative)}</b> {t.aguinaldoAmbiguousTail} <DisputeLink rule="aguinaldoScaleOnExit" /></p></div>}
            {settlement.quincena25Applies && <div className="callout"><span>§</span><p>{t.quincena25Note} <DisputeLink rule="quincena25Window" /></p></div>}
            {/* Qualified on every count except the date. The rule's own note has
                promised since it was written that the broad reading is named on
                screen; until now `quincena25OutsideWindow` was computed and
                never rendered, so the promise was kept only in the PDF. */}
            {settlement.quincena25OutsideWindow && <div className="callout"><span>?</span><p>{t.quincena25OutsideLead} <b>{money.format(settlement.quincena25Alternative)}</b> {t.quincena25OutsideTail} <DisputeLink rule="quincena25Window" /></p></div>}
            <div className={`callout ${termination === "resignation" && !settlement.eligibleForResignationBenefit ? "warn" : ""}`}><span>{termination === "dismissal" ? "§" : "i"}</span><p>{termination === "dismissal" ? t.dismissalNote : settlement.eligibleForResignationBenefit ? `${t.resignationOk} ${t.resignationRule}` : t.resignationNo}</p></div>
          </>}
          <p className="legal-disclaimer">{t.grossNote}</p>
        </div>
      </div>
      <div className="source-panel"><h2>{t.sources}</h2><div className="source-links"><a href={OFFICIAL.laborCode} target="_blank" rel="noreferrer"><b>01</b>{t.code}<span>↗</span></a><a href={OFFICIAL.laborService} target="_blank" rel="noreferrer"><b>02</b>{t.officialCalc}<span>↗</span></a><a href={OFFICIAL.resignation} target="_blank" rel="noreferrer"><b>03</b>{t.resignationLaw}<span>↗</span></a><a href={OFFICIAL.minimumWage} target="_blank" rel="noreferrer"><b>04</b>{t.wageDecree}<span>↗</span></a><a href={OFFICIAL.aguinaldoReform} target="_blank" rel="noreferrer"><b>05</b>{t.aguinaldoReform}<span>↗</span></a><a href={OFFICIAL.vacation} target="_blank" rel="noreferrer"><b>06</b>{t.vacationSource}<span>↗</span></a></div></div>
      <DisputePanel lang={lang} page="settlement" />
    </> : <>
      {/* El mismo conmutador de /prestamos/: tarjetas con ícono, título y
          subtítulo. La página responde a tres preguntas distintas —cuánto
          debería descontarme, si lo que me descontaron está bien, y qué me
          ajustan en junio o diciembre— y son tres modos, no tres secciones,
          porque comparten los datos del pago. */}
      <div className="mode-switch three" role="group" aria-label={t.payrollModeLabel}>
        <button type="button" className={payrollMode === "calculate" ? "selected" : ""}
          onClick={() => setPayrollMode("calculate")} aria-pressed={payrollMode === "calculate"}>
          <span className="mode-icon">◎</span><span><b>{t.modeCalc}</b><small>{t.modeCalcSub}</small></span>
        </button>
        <button type="button" className={payrollMode === "verify" ? "selected" : ""}
          onClick={() => setPayrollMode("verify")} aria-pressed={payrollMode === "verify"}>
          <span className="mode-icon">⇄</span><span><b>{t.modeCheck}</b><small>{t.modeCheckSub}</small></span>
        </button>
        <button type="button" className={payrollMode === "recalc" ? "selected" : ""}
          onClick={() => setPayrollMode("recalc")} aria-pressed={payrollMode === "recalc"}>
          <span className="mode-icon">Σ</span><span><b>{t.modeRecalc}</b><small>{t.modeRecalcSub}</small></span>
        </button>
      </div>
      {payrollMode === "calculate" ? <>
      <div className="calculator-grid">
        <div className="form-panel">
          <div className="section-title"><span>01</span><div><h2>{t.payrollData}</h2><p>{lang === "es" ? "Servicios permanentes y persona domiciliada" : "Permanent services and a domiciled individual"}</p></div></div>
          <div className="field-grid"><MoneyField label={t.gross} lang={lang} value={gross} onChange={setGross} help={t.helpGross} />
            <SelectField label={t.frequency} lang={lang} value={frequency} onChange={setFrequency} help={t.helpFrequency}
              options={[{ value: "monthly", label: t.monthly }, { value: "fortnightly", label: t.fortnightly }, { value: "weekly", label: t.weekly }] as const} />
            <MoneyField label={t.annualGross} lang={lang} value={annualGross} onChange={setAnnualGross} note={t.annualGrossHint} help={t.helpAnnualGross} /></div>
          <div className="payroll-checks">
            <CheckField label={t.includeAfp} checked={includeAfp} onChange={setIncludeAfp} />
            <CheckField label={t.includeIsss} checked={includeIsss} onChange={setIncludeIsss} />
            <CheckField label={t.fixedDeduction} checked={applyFixedDeduction} onChange={setApplyFixedDeduction} />
          </div>
          {includeIsss && frequency !== "monthly" && <p className="field-note payroll-note">{t.isssApprox}</p>}
          {/* These two explain the deduction checkbox and the annual income
              field, not the result, so they sit beside the controls they talk
              about — which also stops the form column from running empty
              against a much taller results column. */}
          {!payroll.qualifiesForFixedDeduction && applyFixedDeduction && <div className="callout warn"><span>i</span><p>{t.noFixed}</p></div>}
          {payroll.qualifiesForFixedDeduction && applyFixedDeduction && payroll.bandBeforeFixedDeduction > 2 && <div className="callout"><span>§</span><p>{t.fixedOnlyBandTwo}</p></div>}
        </div>
        <div className="results-panel payroll-results">
          <div className="results-kicker">{frequencyLabel}</div><div className="result-headline"><span>{t.takeHome}</span><strong>{money.format(payroll.net)}</strong><small>{t.band}: {payroll.band} · {(payroll.marginalRate * 100).toFixed(0)}%</small></div>
          <div className="result-tiles"><div className="highlight"><span>{t.isr}</span><b>{money.format(payroll.isr)}</b></div><div><span>{t.afp}</span><b>{money.format(payroll.afp)}</b></div><div><span>{t.isss}</span><b>{money.format(payroll.isss)}</b></div><div><span>{t.taxable}</span><b>{money.format(payroll.taxable)}</b></div></div>
          <div className="tax-base-flow"><span>{t.taxableBefore}<b>{money.format(payroll.taxableBeforeFixedDeduction)}</b></span><i>−</i><span>{t.fiscalDeduction}<b>{money.format(payroll.fixedDeduction)}</b><small>{t.notCash}</small></span><i>=</i><span>{t.taxable}<b>{money.format(payroll.taxable)}</b></span></div>
          <div className="result-facts"><div><span>{t.annualUsed}</span><b>{money.format(payroll.annualIncome)}</b><small>{payroll.annualIncomeDeclared ? t.annualDeclared : t.annualEstimated}</small></div></div>
          {withoutFixedDeduction > payroll.isr && <div className="callout"><span>≠</span><p>{t.differsLead} <b>{money.format(withoutFixedDeduction)}</b> {t.differsTail}</p></div>}
        </div>
      </div>
      </> : payrollMode === "recalc" ? <>
      {/* El porqué antes del cálculo, y no debajo. Quien llega a este modo
          suele venir de una retención de junio que no entendió, y la respuesta
          a esa pregunta es un párrafo, no una cifra. */}
      <section className="recalc-why">
        <div className="section-title"><span>01</span><div><h2>{t.recalcWhyTitle}</h2><p>{t.recalcWhySubtitle}</p></div></div>
        <div className="recalc-why-body">
          <p>{t.recalcWhyText}</p>
          <p>{t.recalcWhyDiffText}</p>
        </div>
      </section>
      <section className="recalc-band">
        <div className="section-title"><span>02</span><div><h2>{t.recalcTitle}</h2><p>{t.recalcSubtitle}</p></div></div>
        <div className="recalc-controls">
          {/* A div and a span rather than a fieldset and a legend: a legend is
              laid out in the fieldset's border area instead of taking a grid
              row, so the control rose about 16px above the inputs beside it.
              The grouping is kept for assistive tech with role and label. */}
          <SegmentedField label={t.recalcPeriodLabel} lang={lang} value={recalcPeriod} onChange={setRecalcPeriod}
            options={[{ value: "june", label: t.juneOption }, { value: "december", label: t.decemberOption }] as const} />
          <SegmentedField label={t.recalcSourceLabel} lang={lang} value={accSource} onChange={setAccSource}
            note={estimating ? t.recalcEstimateHint : t.recalcEnterHint}
            options={[{ value: "estimated", label: t.recalcEstimate }, { value: "entered", label: t.recalcEnter }] as const} />
          {estimating
            ? <MoneyField label={t.recalcSalary} lang={lang} value={accSalary} onChange={setAccSalary}
              note={t.recalcSalaryHint} help={t.helpGross} />
            : <>
              <MoneyField label={t.accTaxable} lang={lang} value={accTaxable} onChange={setAccTaxable} note={recalcPeriod === "june" ? t.accTaxableJune : t.accTaxableDecember} help={t.helpAccTaxable} />
              <MoneyField label={t.accWithheld} lang={lang} value={accWithheld} onChange={setAccWithheld} note={recalcPeriod === "june" ? t.accWithheldJune : t.accWithheldDecember} help={t.helpAccWithheld} />
            </>}
        </div>
        {/* Estimating, the two figures the decree actually names are derived
            rather than typed, so they are printed back: a reader has to be able
            to see the numbers the subtraction below is made of, and to check
            them against a payslip. */}
        {estimating && <div className="recalc-derived">
          <div><span>{t.accTaxable}</span><b>{money.format(recalc.accumulatedTaxable)}</b><small>{t.recalcEstimateFrom}</small></div>
          <div><span>{t.alreadyWithheld}</span><b>{money.format(recalc.accumulatedWithheld)}</b><small>{t.recalcEstimateFrom}</small></div>
        </div>}
        {/* The settled tax, what was already withheld, and the difference, read
            as one sentence. The difference is the only place the headline
            figure appears: showing it again above the chain repeated the same
            number twice with opposite signs. */}
        <div className="recalc-outcome">
          <div><span>{t.settledTaxLabel}</span><b>{money.format(recalc.settledTax)}</b><small>{t.taxable}: {money.format(recalc.taxable)} · {t.fiscalDeduction}: {money.format(recalc.fixedDeduction)}</small></div>
          <i aria-hidden="true">−</i>
          <div><span>{t.alreadyWithheld}</span><b>{money.format(recalc.accumulatedWithheld)}</b><small>{recalcPeriod === "june" ? t.accWithheldJune : t.accWithheldDecember}</small></div>
          <i aria-hidden="true">=</i>
          <div className="recalc-result"><span>{recalc.excess > 0 ? t.excessLabel : t.toWithhold}</span><strong>{recalc.excess > 0 ? `−${money.format(recalc.excess)}` : money.format(recalc.withholding)}</strong><small>{recalcPeriod === "june" ? t.june : t.december} · {t.band} {recalc.band}</small></div>
        </div>
        <div className="recalc-notes">
          <p className="field-note">{t.recalcExclusions}</p>
          {estimating && <div className="callout"><span>≈</span><p>{t.recalcEstimateNote(String(estimate.months), String(estimate.withheldMonths), money.format(estimate.monthlyTaxable), money.format(estimate.monthlyWithholding))}</p></div>}
          {recalc.fixedDeduction > 0 && <div className="callout"><span>§</span><p>{t.recalcDeductionNote}</p></div>}
          {/* Negative is a result, not an error state, so it is explained
              whether or not it happened: a reader who never sees a saldo a
              favor should still learn that the arithmetic can produce one. */}
          <div className={recalc.excess > 0 ? "callout warn" : "callout"}><span>{recalc.excess > 0 ? "!" : "−"}</span><p>{recalc.excess > 0 ? t.excessNote : t.recalcExplainNegative}</p></div>
          <div className="callout"><span>i</span><p>{t.recalcEmployerNote}</p></div>
        </div>
      </section>
      </> : <>
        {/* Sin una sola cifra de la boleta no hay comparación que exportar, y
            un PDF que sólo repite las tablas ya lo da el otro modo. */}
        {verify.compared > 0 && <div className="shell-toolbar export-toolbar">
          <div className="export-actions">
            <span>{t.exportHint}</span>
            <button type="button" onClick={exportCheck}><i>PDF</i>{t.exportPdf}</button>
          </div>
        </div>}
        <div className="calculator-grid">
          <div className="form-panel">
            <div className="section-title"><span>01</span><div><h2>{t.payrollData}</h2><p>{lang === "es" ? "Los mismos datos del otro modo" : "The same details as the other mode"}</p></div></div>
            <div className="field-grid">
              <MoneyField label={t.gross} lang={lang} value={gross} onChange={setGross} help={t.helpGross} />
              <SelectField label={t.frequency} lang={lang} value={frequency} onChange={setFrequency} help={t.helpFrequency}
                options={[{ value: "monthly", label: t.monthly }, { value: "fortnightly", label: t.fortnightly }, { value: "weekly", label: t.weekly }] as const} />
              <MoneyField label={t.annualGross} lang={lang} value={annualGross} onChange={setAnnualGross} note={t.annualGrossHint} help={t.helpAnnualGross} />
            </div>
            <div className="payroll-checks">
              <CheckField label={t.includeAfp} checked={includeAfp} onChange={setIncludeAfp} />
              <CheckField label={t.includeIsss} checked={includeIsss} onChange={setIncludeIsss} />
              <CheckField label={t.fixedDeduction} checked={applyFixedDeduction} onChange={setApplyFixedDeduction} />
            </div>
            <div className="section-title second"><span>02</span><div><h2>{t.payslipTitle}</h2><p>{t.payslipSubtitle}</p></div></div>
            <p className="field-note payroll-note">{t.payslipHint}</p>
            <div className="field-grid">
              <MoneyField label={t.slipAfp} lang={lang} value={slipAfp} onChange={setSlipAfp} help={t.helpSlipAfp} />
              <MoneyField label={t.slipIsss} lang={lang} value={slipIsss} onChange={setSlipIsss} help={t.helpSlipIsss} />
              <MoneyField label={t.slipIsr} lang={lang} value={slipIsr} onChange={setSlipIsr} help={t.helpSlipIsr} />
              <MoneyField label={t.slipNet} lang={lang} value={slipNet} onChange={setSlipNet} help={t.helpSlipNet} />
            </div>
          </div>
          <div className="results-panel payroll-results">
            <div className="results-kicker">{t.checkResult}</div>
            {/* El titular dice cuántas diferencias hay, no si algo está mal.
                Cero diferencias no significa que la boleta esté correcta: hay
                conceptos que esta calculadora no conoce, y lo dice al cerrar. */}
            <div className="result-headline">
              <span>{frequencyLabel}</span>
              <strong>{verify.compared === 0 ? t.checkEmpty : verify.differences === 0 ? t.checkAllMatch : `${verify.differences} ${verify.differences === 1 ? t.checkDifference : t.checkDifferences}`}</strong>
              <small>{verify.compared === 0 ? t.checkEmptySub : verify.differences === 0 ? t.checkAllMatchSub : t.checkDiffSub}</small>
            </div>
            <p className="field-note">{t.checkIntro}</p>
            <div className="payslip-check">
              {verify.lines.map((line) => <div key={line.concept} className={`payslip-row ${line.status}`}>
                <div className="payslip-grid">
                  <b className="payslip-concept">{conceptLabels[line.concept]}</b>
                  <div><span>{t.colExpected}</span><b>{money.format(line.expected)}</b></div>
                  <div><span>{t.colReported}</span><b>{line.reported === null ? "—" : money.format(line.reported)}</b></div>
                  <div><span>{t.colDifference}</span><b>{line.status === "unchecked" ? "—" : signed(line.difference)}</b></div>
                  <div className="payslip-status"><i aria-hidden="true">{statusMark[line.status]}</i><span>{statusLabels[line.status]}</span></div>
                </div>
                {line.causes.length > 0 && <div className="payslip-causes">
                  <span>{line.causes.length === 1 ? t.causeLead : t.causeLeadPlural}</span>
                  {line.causes.map((cause) => {
                    const citation = causeCitation(cause);
                    return <p key={cause.id}>{causeText(cause.id, cause.amount)}
                      {citation && <a href={OFFICIAL[citation.source]} target="_blank" rel="noreferrer">{citation.norm} ↗</a>}
                    </p>;
                  })}
                </div>}
              </div>)}
            </div>
            <div className="callout"><span>i</span><p>{t.checkTone}</p></div>
          </div>
        </div>
      </>}
      <div className="tax-tables"><div className="table-heading"><div><span>DECRETO EJECUTIVO 10/2025</span><h2>{t.tableTitle} {frequencyLabel.toLowerCase()}</h2></div><a href={OFFICIAL.withholding} target="_blank" rel="noreferrer">{t.officialPdf} ↗</a></div><Table bands={WITHHOLDING_TABLES[frequency]} t={t} money={money} />
        <details><summary>{t.recalc}</summary><p>{t.recalcNote}</p><div className="recalc-grid"><div><h3>{t.june}</h3><Table bands={JUNE_RECALC_TABLE} t={t} money={money} /></div><div><h3>{t.december}</h3><Table bands={DECEMBER_RECALC_TABLE} t={t} money={money} /></div></div></details>
        <details><summary>{t.differsSummary}</summary><p>{t.differsBody}</p></details>
      </div>
      <div className="source-panel"><h2>{t.sources}</h2><div className="source-links"><a href={OFFICIAL.withholding} target="_blank" rel="noreferrer"><b>01</b>{t.taxDecree}<span>↗</span></a><a href={OFFICIAL.incomeTax} target="_blank" rel="noreferrer"><b>02</b>{t.taxLaw}<span>↗</span></a><a href={OFFICIAL.isss} target="_blank" rel="noreferrer"><b>03</b>{t.isssSource}<span>↗</span></a><a href={OFFICIAL.pensions} target="_blank" rel="noreferrer"><b>04</b>{t.pensionSource}<span>↗</span></a></div></div>
      <DisputePanel lang={lang} page="withholding" />
    </>}
  </section>;
}
