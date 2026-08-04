import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  addMonths, buildActiveSchedule, buildHistoricalSchedule, buildNewSchedule, isoAfterMonths,
  monthlyIrr, n, parseDate, solveRate, today,
  type ExtraPayment, type InsuranceMode, type RateChange, type Row,
} from "./loan";

type Lang = "es" | "en";
type Mode = "new" | "active";
type ActiveView = "future" | "history";
type KnownInput = "rate" | "term";

const copy = {
  es: {
    navHow: "Cómo funciona",
    navGuide: "Guía",
    title1: "Entiende tu préstamo.",
    title2: "Decide con claridad.",
    subtitle: "Calcula el costo real antes de firmar o descubre cuánto puedes ahorrar con abonos a capital.",
    free: "Gratis · Sin registro · Tus datos no salen de tu dispositivo",
    exportPdf: "Exportar PDF", exportExcel: "Exportar Excel", exportHint: "Descargar resultados",
    demoLabel: "Estás viendo datos de ejemplo", demoReset: "Empezar de cero",
    newLoan: "Antes de contratar", newLoanSub: "Cotiza cuota y costo real",
    activeLoan: "Ya tengo un préstamo", activeLoanSub: "Proyecta abonos y ahorro",
    futureView: "Proyectar desde hoy", historyView: "Reconstruir mis abonos",
    basics: "Datos básicos", optional: "Más precisión", optionalHint: "Opcional",
    amount: "Monto del préstamo", rate: "Tasa nominal anual", term: "Plazo", years: "años", firstDate: "Primera fecha de pago",
    insurance: "Seguro de deuda", insBalance: "Sobre saldo", insFixed: "Monto fijo", insNone: "No incluir",
    perThousand: "Prima mensual por cada $1,000", fixedMonthly: "Seguro mensual",
    commission: "Comisión de apertura", otherFees: "Otros cargos iniciales", feeMode: "Tratamiento de cargos",
    deducted: "Se descuentan del desembolso", financed: "Se suman al préstamo",
    results: "Tu estimación", bankPayment: "Cuota del préstamo", firstTotal: "Primera cuota con seguro",
    totalInterest: "Intereses totales", totalCost: "Total que pagarías", effective: "Costo efectivo anual estimado",
    cashReceived: "Efectivo que recibes", totalInsurance: "Seguro estimado", totalFees: "Cargos iniciales", yearly: "Costo por año",
    principal: "Capital", interest: "Interés", charges: "Seguro", schedule: "Ver tabla completa", hideSchedule: "Ocultar tabla",
    paymentNo: "Cuota", date: "Fecha", payment: "Pago", balance: "Saldo",
    accuracy: "Qué hace precisa esta estimación",
    accuracyText: "Usamos interés sobre saldo y año calendario de 365 días. Compara siempre con la carta de aprobación: debe detallar tasa efectiva, cuota, plazo, seguros, comisiones y el monto líquido a recibir. Los cálculos pueden usarse en otros países, pero la referencia normativa y contractual debe ajustarse localmente.",
    official: "Consultar tasas y cargos en la SSF",
    activeBasics: "Estado actual", currentBalance: "Saldo de capital hoy", currentPayment: "Cuota mensual (capital + interés)", nextDate: "Próxima fecha de pago",
    originalAmount: "Monto original", paidToDate: "Total pagado hasta hoy", currentInsurance: "Seguro mensual actual",
    extraPlan: "Tu plan de abonos", oneExtra: "Abono extraordinario", extraDate: "Fecha del abono", monthlyExtra: "Extra cada mes",
    projection: "Impacto de tus abonos", payoffBefore: "Terminarías sin abonos", payoffAfter: "Terminarías con abonos",
    monthsSaved: "Meses que ahorras", interestSaved: "Intereses que ahorras", originalInterest: "Interés pendiente sin abonos", newInterest: "Interés pendiente con abonos",
    activeDisclaimer: "El saldo de capital es más importante que restar lo pagado al monto original. Tómalo de tu último estado de cuenta. Esta proyección no incluye mora, recargos ni cambios futuros de tasa.",
    historyBasics: "Reconstruye el préstamo", historyBasicsHint: "Usa las condiciones originales del contrato",
    originalFirstDate: "Primera cuota original", scheduledPayment: "Cuota original (capital + interés)",
    knownInput: "Qué dato conoces del contrato", knownRate: "La tasa", knownTerm: "El plazo", originalTerm: "Plazo original",
    estimatedRate: "Tasa estimada", estimatedRateHint: "Despejada de tu monto, cuota y plazo. Reproduce tu contrato con nuestra convención de días, así que puede diferir por décimas de la tasa nominal impresa. Si la diferencia es grande, revisa la cuota.",
    historyInsurance: "Seguro mensual incluido en la cuota", totalDebit: "Cuota total que te debitan", totalDebitHint: "Debe coincidir con lo que sale de tu cuenta cada mes. Si no cuadra, corrige la cuota o el seguro.",
    insurancePaid: "Seguro pagado en el período", insurancePaidHint: "No amortiza capital ni es interés: los abonos no lo reducen.",
    rateHistory: "Cambios de tasa", rateHistoryHint: "Si tu préstamo es a tasa variable, registra cada ajuste con su fecha de vigencia",
    changeDate: "Vigente desde", newRate: "Tasa nueva", newPayment: "Cuota nueva", newPaymentHint: "opcional",
    addChange: "Registrar cambio", noChanges: "Sin cambios de tasa: se usa la misma durante todo el préstamo.",
    keepsPayment: "misma cuota", termLocked: "Con cambios de tasa registrados no se puede despejar el plazo: hay varias tasas y una sola ecuación. Ingresa la tasa inicial.",
    badTerm: "Con esa cuota el préstamo no se cancela en el plazo indicado. Revisa monto, cuota o plazo.",
    extraHistory: "Historial de abonos", extraHistoryHint: "Registra cada abono que fue aplicado directamente a capital",
    addExtra: "Registrar abono", removeExtra: "Eliminar", noExtras: "Todavía no has registrado abonos.",
    historyResult: "Lo que ya te ahorraron", savedToDate: "Interés ahorrado hasta hoy", projectedSaving: "Ahorro total proyectado",
    balanceWithout: "Saldo hoy sin abonos", balanceWith: "Saldo estimado con abonos", balanceReduction: "Saldo reducido",
    extrasTotal: "Total abonado a capital", historyDisclaimer: "Comparamos el préstamo original contra el mismo préstamo con cada abono aplicado en su fecha. La precisión depende de que la cuota, tasa y fechas coincidan con tu contrato; si la tasa cambió, el banco aplicó el dinero a cuotas futuras o hubo mora, el resultado puede variar.",
    badPayment: "La cuota no alcanza a cubrir los intereses. Revisa los datos.",
    guideTitle: "Los datos que realmente importan", guideLead: "Una tasa baja no siempre significa un préstamo barato. Estas son las piezas que debes pedir y comparar.",
    guide1: "Tasa nominal", guide1Text: "Calcula el interés del préstamo, pero no refleja todos los cargos.",
    guide2: "Tasa efectiva", guide2Text: "Convierte pagos, comisiones y cargos obligatorios en un costo anual comparable.",
    guide3: "Seguro sobre saldo", guide3Text: "Suele bajar a medida que amortizas; una prima fija se mantiene igual.",
    guide4: "Abono a capital", guide4Text: "Reduce el saldo que genera intereses. Confirma que el banco lo aplique a capital y no a cuotas futuras.",
    footer: "Una herramienta independiente de", educational: "Estimaciones educativas, no asesoría financiera ni una oferta de crédito.", months: "meses", remaining: "pendientes",
    report: "¿Algún cálculo no coincide con tu contrato? Cuéntanoslo",
  },
  en: {
    navHow: "How it works", navGuide: "Guide",
    title1: "Understand your loan.", title2: "Decide with clarity.",
    subtitle: "Estimate the real cost before signing or see how much extra principal payments could save.",
    free: "Free · No signup · Your data stays on your device",
    exportPdf: "Export PDF", exportExcel: "Export Excel", exportHint: "Download results",
    demoLabel: "You are viewing sample data", demoReset: "Start from scratch",
    newLoan: "Before you borrow", newLoanSub: "Estimate payment and true cost", activeLoan: "I already have a loan", activeLoanSub: "Project prepayments and savings",
    futureView: "Project from today", historyView: "Rebuild my prepayments",
    basics: "Basic details", optional: "Improve accuracy", optionalHint: "Optional",
    amount: "Loan amount", rate: "Nominal annual rate", term: "Term", years: "years", firstDate: "First payment date",
    insurance: "Credit life insurance", insBalance: "On balance", insFixed: "Fixed amount", insNone: "Do not include",
    perThousand: "Monthly premium per $1,000", fixedMonthly: "Monthly insurance",
    commission: "Origination fee", otherFees: "Other upfront charges", feeMode: "How charges are paid",
    deducted: "Deducted from disbursement", financed: "Added to the loan",
    results: "Your estimate", bankPayment: "Loan payment", firstTotal: "First payment with insurance",
    totalInterest: "Total interest", totalCost: "Total you would pay", effective: "Estimated effective annual cost",
    cashReceived: "Cash you receive", totalInsurance: "Estimated insurance", totalFees: "Upfront charges", yearly: "Cost by year",
    principal: "Principal", interest: "Interest", charges: "Insurance", schedule: "View full schedule", hideSchedule: "Hide schedule",
    paymentNo: "Payment", date: "Date", payment: "Payment", balance: "Balance",
    accuracy: "What makes this estimate accurate",
    accuracyText: "We use declining-balance interest and a 365-day calendar year. Always compare against the approval letter: it should detail the effective rate, payment, term, insurance, fees, and net proceeds. The calculations can be used elsewhere, but local regulations and contract terms should be checked.",
    official: "Check rates and fees at the SSF",
    activeBasics: "Current status", currentBalance: "Principal balance today", currentPayment: "Monthly payment (principal + interest)", nextDate: "Next payment date",
    originalAmount: "Original amount", paidToDate: "Total paid to date", currentInsurance: "Current monthly insurance",
    extraPlan: "Your prepayment plan", oneExtra: "One-time principal payment", extraDate: "Prepayment date", monthlyExtra: "Extra every month",
    projection: "Impact of your prepayments", payoffBefore: "Payoff without extras", payoffAfter: "Payoff with extras",
    monthsSaved: "Months saved", interestSaved: "Interest saved", originalInterest: "Remaining interest without extras", newInterest: "Remaining interest with extras",
    activeDisclaimer: "Your principal balance matters more than subtracting prior payments from the original amount. Find it on your latest statement. This projection excludes late fees, penalties, and future rate changes.",
    historyBasics: "Rebuild the loan", historyBasicsHint: "Use the original contract terms",
    originalFirstDate: "Original first payment", scheduledPayment: "Original payment (principal + interest)",
    knownInput: "Which contract detail do you know", knownRate: "The rate", knownTerm: "The term", originalTerm: "Original term",
    estimatedRate: "Estimated rate", estimatedRateHint: "Solved from your amount, payment and term. It reproduces your contract under our day-count convention, so it can differ by a fraction from the printed nominal rate. If the gap is large, check the payment.",
    historyInsurance: "Monthly insurance included in the payment", totalDebit: "Total payment debited", totalDebitHint: "This should match what leaves your account each month. If it does not, correct the payment or the insurance.",
    insurancePaid: "Insurance paid over the period", insurancePaidHint: "It repays no principal and is not interest: prepayments do not reduce it.",
    rateHistory: "Rate changes", rateHistoryHint: "If your loan carries a variable rate, add every adjustment with the date it took effect",
    changeDate: "Effective from", newRate: "New rate", newPayment: "New payment", newPaymentHint: "optional",
    addChange: "Add change", noChanges: "No rate changes: the same rate applies for the whole loan.",
    keepsPayment: "same payment", termLocked: "The term cannot be solved once rate changes are recorded: several rates, one equation. Enter the starting rate instead.",
    badTerm: "The loan does not clear within that term at that payment. Check the amount, payment or term.",
    extraHistory: "Prepayment history", extraHistoryHint: "Add every payment that was applied directly to principal",
    addExtra: "Add prepayment", removeExtra: "Remove", noExtras: "You have not added any prepayments yet.",
    historyResult: "What they have saved you", savedToDate: "Interest saved to date", projectedSaving: "Projected total savings",
    balanceWithout: "Balance today without extras", balanceWith: "Estimated balance with extras", balanceReduction: "Balance reduction",
    extrasTotal: "Total paid toward principal", historyDisclaimer: "We compare the original loan against the same loan with each prepayment applied on its date. Accuracy depends on the payment, rate, and dates matching your contract; results can differ if the rate changed, the lender applied money to future installments, or the loan was past due.",
    badPayment: "The payment does not cover accrued interest. Check your inputs.",
    guideTitle: "The numbers that actually matter", guideLead: "A low rate does not always mean a cheap loan. Ask for and compare these four pieces.",
    guide1: "Nominal rate", guide1Text: "Calculates loan interest, but does not capture every charge.",
    guide2: "Effective rate", guide2Text: "Turns payments, fees, and required charges into a comparable annual cost.",
    guide3: "Balance-based insurance", guide3Text: "Usually falls as principal is repaid; a fixed premium does not.",
    guide4: "Principal prepayment", guide4Text: "Lowers the balance that earns interest. Confirm the lender applies it to principal, not future installments.",
    footer: "An independent tool by", educational: "Educational estimates, not financial advice or a credit offer.", months: "months", remaining: "remaining",
    report: "Does a calculation not match your contract? Tell us",
  },
} as const;

const ISSUES_URL = "https://github.com/MarlonCoreas/LoanPilot/issues/new/choose";

// Amount fields are stored raw ("10000.5") and only grouped for display, so every
// calculation, export and URL keeps parsing plain numbers.
const SIGNIFICANT = /[\d.]/;
function groupThousands(raw: string) {
  if (!raw) return "";
  const dot = raw.indexOf(".");
  const whole = dot === -1 ? raw : raw.slice(0, dot);
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (dot === -1 ? "" : raw.slice(dot));
}
function sanitizeNumeric(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  return dot === -1 ? cleaned : `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, "")}`;
}
function countSignificant(value: string) { let total = 0; for (const char of value) if (SIGNIFICANT.test(char)) total++; return total; }
// Separators shift the text, so the caret is restored by digit position rather
// than by character index — otherwise it jumps to the end on every keystroke.
function caretAfterSignificant(display: string, count: number) {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < display.length; i++) if (SIGNIFICANT.test(display[i]) && ++seen === count) return i + 1;
  return display.length;
}
const useCaretEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function NumericField({ label, value, suffix, onChange, onTouch }: { label: string; value: string; suffix?: string; onChange: (value: string) => void; onTouch: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  useCaretEffect(() => {
    if (caret.current === null || !ref.current) return;
    ref.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });
  return <label className="field"><span>{label}</span><div className="input-wrap">{suffix === "$" && <b className="prefix">$</b>}
    <input ref={ref} type="text" inputMode="decimal" autoComplete="off" value={groupThousands(value)}
      onFocus={(event) => event.target.select()}
      onChange={(event) => {
        const typed = event.target.value;
        const significant = countSignificant(typed.slice(0, event.target.selectionStart ?? typed.length));
        const raw = sanitizeNumeric(typed);
        caret.current = caretAfterSignificant(groupThousands(raw), significant);
        onTouch();
        onChange(raw);
      }} />
    {suffix && suffix !== "$" && <b className="suffix">{suffix}</b>}</div></label>;
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("es"); const [mode, setMode] = useState<Mode>("new"); const [activeView, setActiveView] = useState<ActiveView>("future"); const [detailsOpen, setDetailsOpen] = useState(true); const [scheduleOpen, setScheduleOpen] = useState(false); const [demo, setDemo] = useState(true);
  const [amount, setAmount] = useState("10000"); const [rate, setRate] = useState("11.5"); const [years, setYears] = useState("5"); const [firstDate, setFirstDate] = useState(isoAfterMonths(1));
  const [insuranceMode, setInsuranceMode] = useState<InsuranceMode>("balance"); const [insuranceValue, setInsuranceValue] = useState("0.65"); const [commission, setCommission] = useState("1.5"); const [otherFees, setOtherFees] = useState("75"); const [feeMode, setFeeMode] = useState<"deducted" | "financed">("deducted");
  const [activeBalance, setActiveBalance] = useState("7450"); const [activeRate, setActiveRate] = useState("11.5"); const [activePayment, setActivePayment] = useState("220"); const [nextDate, setNextDate] = useState(isoAfterMonths(1)); const [activeInsurance, setActiveInsurance] = useState("4.50"); const [originalAmount, setOriginalAmount] = useState("10000"); const [paidToDate, setPaidToDate] = useState("3600"); const [oneExtra, setOneExtra] = useState("1000"); const [extraDate, setExtraDate] = useState(isoAfterMonths(3)); const [monthlyExtra, setMonthlyExtra] = useState("35");
  const [historyFirstDate, setHistoryFirstDate] = useState(isoAfterMonths(-23));
  const [historyKnown, setHistoryKnown] = useState<KnownInput>("term");
  const [historyMonths, setHistoryMonths] = useState("60");
  const [historyExtraDate, setHistoryExtraDate] = useState(isoAfterMonths(-18));
  const [historyExtraAmount, setHistoryExtraAmount] = useState("200");
  const [historyRateChanges, setHistoryRateChanges] = useState<RateChange[]>([]);
  const [changeDate, setChangeDate] = useState(isoAfterMonths(-12));
  const [changeRate, setChangeRate] = useState("");
  const [changePayment, setChangePayment] = useState("");
  // The ledger starts empty on purpose: invented prepayments would show savings
  // that are not yours, and the baseline loan is the honest starting picture.
  const [historyExtras, setHistoryExtras] = useState<ExtraPayment[]>([]);
  const t = copy[lang];
  const money = useMemo(() => new Intl.NumberFormat(lang === "es" ? "es-SV" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }), [lang]);
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(lang === "es" ? "es-SV" : "en-US", { month: "short", year: "numeric", timeZone: "UTC" }), [lang]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const quote = useMemo(() => {
    const fees = n(amount) * (n(commission) / 100) + n(otherFees); const principal = feeMode === "financed" ? n(amount) + fees : n(amount); const net = feeMode === "deducted" ? Math.max(0, n(amount) - fees) : n(amount);
    const result = buildNewSchedule({ principal, annualRate: n(rate), firstDate: parseDate(firstDate), months: Math.max(1, Math.round(n(years) * 12)), insuranceMode, insuranceValue: n(insuranceValue) });
    const totalInterest = result.rows.reduce((s, row) => s + row.interest, 0); const totalInsurance = result.rows.reduce((s, row) => s + row.insurance, 0); const totalPayments = result.rows.reduce((s, row) => s + row.payment + row.insurance, 0); const effective = monthlyIrr(net, result.rows.map((row) => row.payment + row.insurance));
    const yearly = result.rows.reduce<Record<number, { interest: number; principal: number; insurance: number }>>((acc, row) => { const year = row.date.getUTCFullYear(); acc[year] ??= { interest: 0, principal: 0, insurance: 0 }; acc[year].interest += row.interest; acc[year].principal += row.principal; acc[year].insurance += row.insurance; return acc; }, {});
    return { ...result, fees, principal, net, totalInterest, totalInsurance, totalPayments, effective, yearly };
  }, [amount, commission, feeMode, firstDate, insuranceMode, insuranceValue, otherFees, rate, years]);
  const active = useMemo(() => {
    const common = { balance: n(activeBalance), annualRate: n(activeRate), payment: n(activePayment), nextDate: parseDate(nextDate), insurance: n(activeInsurance) };
    const baseline = buildActiveSchedule(common); const scenario = buildActiveSchedule({ ...common, oneTimeExtra: n(oneExtra), extraDate: parseDate(extraDate), monthlyExtra: n(monthlyExtra) }); const interestBefore = baseline.rows.reduce((s, row) => s + row.interest, 0); const interestAfter = scenario.rows.reduce((s, row) => s + row.interest, 0);
    return { baseline, scenario, interestBefore, interestAfter, monthsSaved: Math.max(0, baseline.rows.length - scenario.rows.length), interestSaved: Math.max(0, interestBefore - interestAfter) };
  }, [activeBalance, activeInsurance, activePayment, activeRate, extraDate, monthlyExtra, nextDate, oneExtra]);
  const history = useMemo(() => {
    // The payment is principal + interest only. A fixed insurance premium rides
    // along in the debit but amortises nothing, so folding it in here would be
    // reclassified as interest dollar for dollar and inflate the solved rate.
    const parsedFirst = parseDate(historyFirstDate);
    const term = Math.max(0, Math.round(n(historyMonths)));
    // Solving for the rate needs a single unknown. Once the loan carries rate
    // changes there are several, so the term can no longer be the missing piece.
    const termLocked = historyRateChanges.length > 0;
    const known = termLocked ? "rate" : historyKnown;
    const solved = known === "term" ? solveRate(n(originalAmount), n(activePayment), parsedFirst, term) : n(activeRate);
    const rateUnsolved = Number.isNaN(solved);
    const annualRate = rateUnsolved ? 0 : solved;
    const common = { principal: n(originalAmount), annualRate, payment: n(activePayment), firstDate: parsedFirst, insurance: n(activeInsurance), rateChanges: historyRateChanges };
    const baseline = buildHistoricalSchedule({ ...common, extras: [] });
    const scenario = buildHistoricalSchedule({ ...common, extras: historyExtras });
    const cutoff = today();
    const pastBaseline = baseline.rows.filter((row) => row.date <= cutoff);
    const pastScenario = scenario.rows.filter((row) => row.date <= cutoff);
    const interestToDateWithout = pastBaseline.reduce((sum, row) => sum + row.interest, 0);
    const interestToDateWith = pastScenario.reduce((sum, row) => sum + row.interest, 0);
    const totalInterestWithout = baseline.rows.reduce((sum, row) => sum + row.interest, 0);
    const totalInterestWith = scenario.rows.reduce((sum, row) => sum + row.interest, 0);
    const balanceTodayWithout = pastBaseline.at(-1)?.closing ?? n(originalAmount);
    const balanceTodayWith = pastScenario.at(-1)?.closing ?? n(originalAmount);
    return {
      baseline, scenario, annualRate, rateUnsolved, termLocked, known,
      savedToDate: Math.max(0, interestToDateWithout - interestToDateWith),
      projectedSaving: Math.max(0, totalInterestWithout - totalInterestWith),
      balanceTodayWithout, balanceTodayWith,
      balanceReduction: Math.max(0, balanceTodayWithout - balanceTodayWith),
      monthsSaved: Math.max(0, baseline.rows.length - scenario.rows.length),
      extrasTotal: historyExtras.reduce((sum, item) => sum + n(item.amount), 0),
      insuranceTotal: scenario.rows.reduce((sum, row) => sum + row.insurance, 0),
    };
  }, [activeInsurance, activePayment, activeRate, historyExtras, historyFirstDate, historyKnown, historyMonths, historyRateChanges, originalAmount]);
  const touch = () => setDemo(false);
  // Dates keep their defaults: an empty date is not sample data the user could
  // mistake for their own, and parsing "" would poison every schedule with NaN.
  const clearSample = () => {
    setDemo(false);
    setAmount(""); setRate(""); setYears(""); setFirstDate(isoAfterMonths(1));
    setInsuranceValue(""); setCommission(""); setOtherFees("");
    setActiveBalance(""); setActiveRate(""); setActivePayment(""); setNextDate(isoAfterMonths(1)); setActiveInsurance("");
    setOriginalAmount(""); setPaidToDate(""); setOneExtra(""); setExtraDate(isoAfterMonths(3)); setMonthlyExtra("");
    setHistoryFirstDate(isoAfterMonths(-23)); setHistoryExtraDate(isoAfterMonths(-18)); setHistoryExtraAmount(""); setHistoryMonths("");
    setHistoryExtras([]);
    setHistoryRateChanges([]); setChangeRate(""); setChangePayment(""); setChangeDate(isoAfterMonths(-12));
  };
  const addHistoryExtra = () => {
    if (!historyExtraDate || n(historyExtraAmount) <= 0) return;
    setDemo(false);
    setHistoryExtras((items) => [...items, { id: Date.now(), date: historyExtraDate, amount: historyExtraAmount }].sort((a, b) => a.date.localeCompare(b.date)));
    setHistoryExtraAmount("");
  };
  const addRateChange = () => {
    if (!changeDate || (n(changeRate) <= 0 && n(changePayment) <= 0)) return;
    setDemo(false);
    setHistoryRateChanges((items) => [...items, { id: Date.now(), date: changeDate, rate: changeRate, payment: changePayment }].sort((a, b) => a.date.localeCompare(b.date)));
    setChangeRate(""); setChangePayment("");
  };
  const exportData = () => {
    const scheduleHead = [t.paymentNo, t.date, t.payment, t.interest, t.principal, lang === "es" ? "Abono extra" : "Extra principal", t.charges, t.balance];
    const scheduleRows = (rows: Row[]) => rows.map((row) => [row.number, row.date.toISOString().slice(0, 10), Number((row.payment + row.insurance).toFixed(2)), Number(row.interest.toFixed(2)), Number(row.principal.toFixed(2)), Number(row.extra.toFixed(2)), Number(row.insurance.toFixed(2)), Number(row.closing.toFixed(2))]);
    if (mode === "new") return {
      name: lang === "es" ? "cotizacion" : "quote",
      title: lang === "es" ? "Cotización de préstamo" : "Loan estimate",
      summary: [[t.amount, money.format(n(amount))], [t.rate, `${n(rate).toFixed(2)}%`], [t.term, `${n(years)} ${t.years}`], [t.bankPayment, money.format(quote.payment)], [t.totalInterest, money.format(quote.totalInterest)], [t.totalInsurance, money.format(quote.totalInsurance)], [t.totalCost, money.format(quote.totalPayments)], [t.effective, `${quote.effective.toFixed(2)}%`], [t.cashReceived, money.format(quote.net)]],
      schedule: [scheduleHead, ...scheduleRows(quote.rows)],
      extras: [] as (string | number)[][],
    };
    if (activeView === "history") return {
      name: lang === "es" ? "historial-abonos" : "prepayment-history",
      title: t.historyResult,
      summary: [[t.originalAmount, money.format(n(originalAmount))], [historyKnown === "term" ? t.estimatedRate : t.rate, `${history.annualRate.toFixed(2)}%`], [t.scheduledPayment, money.format(n(activePayment))], [t.historyInsurance, money.format(n(activeInsurance))], [t.totalDebit, money.format(n(activePayment) + n(activeInsurance))], [t.originalTerm, `${history.baseline.rows.length} ${t.months}`], [t.originalFirstDate, historyFirstDate], [t.extrasTotal, money.format(history.extrasTotal)], [t.savedToDate, money.format(history.savedToDate)], [t.projectedSaving, money.format(history.projectedSaving)], [t.monthsSaved, `${history.monthsSaved}`], [t.balanceWithout, money.format(history.balanceTodayWithout)], [t.balanceWith, money.format(history.balanceTodayWith)], [t.insurancePaid, money.format(history.insuranceTotal)]],
      schedule: [scheduleHead, ...scheduleRows(history.scenario.rows)],
      extras: [[t.date, t.oneExtra], ...historyExtras.map((item) => [item.date, Number(n(item.amount).toFixed(2))])],
    };
    return {
      name: lang === "es" ? "proyeccion-abonos" : "prepayment-projection",
      title: t.projection,
      summary: [[t.currentBalance, money.format(n(activeBalance))], [t.rate, `${n(activeRate).toFixed(2)}%`], [t.currentPayment, money.format(n(activePayment))], [t.oneExtra, money.format(n(oneExtra))], [t.monthlyExtra, money.format(n(monthlyExtra))], [t.interestSaved, money.format(active.interestSaved)], [t.monthsSaved, `${active.monthsSaved}`], [t.payoffBefore, active.baseline.rows.length ? dateFmt.format(active.baseline.rows.at(-1)!.date) : "—"], [t.payoffAfter, active.scenario.rows.length ? dateFmt.format(active.scenario.rows.at(-1)!.date) : "—"]],
      schedule: [scheduleHead, ...scheduleRows(active.scenario.rows)],
      extras: [] as (string | number)[][],
    };
  };
  const exportExcel = () => {
    const data = exportData();
    const escapeXml = (value: string | number) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const sheet = (name: string, rows: (string | number)[][]) => `<Worksheet ss:Name="${escapeXml(name.slice(0, 31))}"><Table>${rows.map((row, rowIndex) => `<Row>${row.map((cell) => `<Cell${rowIndex === 0 ? ' ss:StyleID="Header"' : ""}><Data ss:Type="${typeof cell === "number" ? "Number" : "String"}">${escapeXml(cell)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet>`;
    const workbook = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Default"><Alignment ss:Vertical="Center"/></Style><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#102A2A" ss:Pattern="Solid"/></Style></Styles>${sheet(lang === "es" ? "Resumen" : "Summary", [[data.title, "LoanPilot"], ...data.summary])}${sheet(lang === "es" ? "Amortización" : "Schedule", data.schedule)}${data.extras.length ? sheet(lang === "es" ? "Abonos" : "Prepayments", data.extras) : ""}</Workbook>`;
    const url = URL.createObjectURL(new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `loanpilot-${data.name}-${new Date().toISOString().slice(0, 10)}.xls`;
    // Firefox needs the anchor in the document, and revoking the blob URL in the
    // same tick cancels the download before it starts.
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };
  const exportPdf = async () => {
    const data = exportData();
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    doc.setFillColor(16, 42, 42); doc.rect(0, 0, 216, 28, "F"); doc.setTextColor(169, 244, 207); doc.setFontSize(17); doc.text("LoanPilot", 14, 13); doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.text(data.title, 14, 21);
    autoTable(doc, { startY: 35, head: [[lang === "es" ? "Resumen" : "Summary", lang === "es" ? "Resultado" : "Result"]], body: data.summary, theme: "grid", headStyles: { fillColor: [26, 127, 100] }, styles: { fontSize: 8, cellPadding: 2.5 } });
    const scheduleStart = (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80;
    autoTable(doc, { startY: scheduleStart + 8, head: [data.schedule[0].map(String)], body: data.schedule.slice(1).map((row) => row.map(String)), theme: "striped", headStyles: { fillColor: [16, 42, 42] }, styles: { fontSize: 6.4, cellPadding: 1.4 }, margin: { left: 8, right: 8 }, didDrawPage: (hook) => { doc.setTextColor(120); doc.setFontSize(7); doc.text(`${lang === "es" ? "Generado" : "Generated"}: ${new Date().toLocaleDateString(lang === "es" ? "es-SV" : "en-US")} · LoanPilot`, 14, hook.doc.internal.pageSize.height - 7); } });
    doc.save(`loanpilot-${data.name}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };
  const input = (label: string, value: string, setter: (v: string) => void, suffix?: string) => <NumericField label={label} value={value} suffix={suffix} onChange={setter} onTouch={touch} />;
  const dateInput = (label: string, value: string, setter: (v: string) => void) => <label className="field"><span>{label}</span><div className="input-wrap date-wrap"><input type="date" value={value} onChange={(e) => { touch(); setter(e.target.value); }} /></div></label>;

  return <main>
    <header className="topbar"><a className="brand" href="#top" aria-label="LoanPilot home"><span>LP</span> LoanPilot</a><nav><a href="#calculator">{t.navHow}</a><a href="#guide">{t.navGuide}</a></nav><div className="language" aria-label="Language"><button className={lang === "es" ? "active" : ""} onClick={() => setLang("es")}>ES</button><button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button></div></header>
    <section className="hero" id="top"><h1>{t.title1}<br /><em>{t.title2}</em></h1><p>{t.subtitle}</p><div className="trust-line"><span>✓</span>{t.free}</div></section>
    <section className="calculator-shell" id="calculator">
      <div className="mode-switch" role="tablist"><button className={mode === "new" ? "selected" : ""} onClick={() => setMode("new")} role="tab" aria-selected={mode === "new"}><span className="mode-icon">◎</span><span><b>{t.newLoan}</b><small>{t.newLoanSub}</small></span></button><button className={mode === "active" ? "selected" : ""} onClick={() => setMode("active")} role="tab" aria-selected={mode === "active"}><span className="mode-icon">↗</span><span><b>{t.activeLoan}</b><small>{t.activeLoanSub}</small></span></button></div>
      <div className="shell-toolbar">
        {demo && <div className="demo-flag"><i />{t.demoLabel}<button onClick={clearSample}>{t.demoReset}</button></div>}
        <div className="export-actions"><span>{t.exportHint}</span><button onClick={exportPdf}><i>PDF</i>{t.exportPdf}</button><button onClick={exportExcel}><i>XLS</i>{t.exportExcel}</button></div>
      </div>
      {mode === "new" ? <div className="calculator-grid">
        <div className="form-panel"><div className="section-title"><span>01</span><div><h2>{t.basics}</h2><p>{lang === "es" ? "Lo mínimo para una buena estimación" : "The minimum for a useful estimate"}</p></div></div><div className="field-grid">{input(t.amount, amount, setAmount, "$")}{input(t.rate, rate, setRate, "%")}{input(t.term, years, setYears, t.years)}{dateInput(t.firstDate, firstDate, setFirstDate)}</div>
          <button className="details-toggle" onClick={() => setDetailsOpen(!detailsOpen)} aria-expanded={detailsOpen}><span><b>02</b><span><strong>{t.optional}</strong><small>{lang === "es" ? "Seguros, comisiones y cargos" : "Insurance, fees and charges"}</small></span></span><i>{detailsOpen ? "−" : "+"}</i></button>
          {detailsOpen && <div className="details-body"><label className="field full"><span>{t.insurance}</span><div className="segmented">{(["balance", "fixed", "none"] as InsuranceMode[]).map((item) => <button key={item} className={insuranceMode === item ? "active" : ""} onClick={() => setInsuranceMode(item)}>{item === "balance" ? t.insBalance : item === "fixed" ? t.insFixed : t.insNone}</button>)}</div></label><div className="field-grid">{insuranceMode !== "none" && input(insuranceMode === "balance" ? t.perThousand : t.fixedMonthly, insuranceValue, setInsuranceValue, "$")}{input(t.commission, commission, setCommission, "%")}{input(t.otherFees, otherFees, setOtherFees, "$")}<label className="field"><span>{t.feeMode}</span><select value={feeMode} onChange={(e) => setFeeMode(e.target.value as "deducted" | "financed")}><option value="deducted">{t.deducted}</option><option value="financed">{t.financed}</option></select></label></div></div>}
        </div>
        <div className="results-panel"><div className="results-kicker">{t.results}</div><div className="hero-result"><span>{t.firstTotal}</span><strong>{money.format((quote.rows[0]?.payment ?? 0) + (quote.rows[0]?.insurance ?? 0))}</strong><small>{money.format(quote.payment)} {lang === "es" ? "de préstamo + seguro variable" : "loan payment + variable insurance"}</small></div><div className="metric-grid"><div><span>{t.totalInterest}</span><b>{money.format(quote.totalInterest)}</b></div><div><span>{t.totalInsurance}</span><b>{money.format(quote.totalInsurance)}</b></div><div><span>{t.totalCost}</span><b>{money.format(quote.totalPayments)}</b></div><div className="highlight"><span>{t.effective}</span><b>{quote.effective.toFixed(2)}%</b></div><div><span>{t.cashReceived}</span><b>{money.format(quote.net)}</b></div><div><span>{t.totalFees}</span><b>{money.format(quote.fees)}</b></div></div>
          <div className="year-chart"><div className="chart-head"><b>{t.yearly}</b><span><i className="dot interest" />{t.interest}<i className="dot insurance" />{t.charges}</span></div>{Object.entries(quote.yearly).map(([year, item]) => { const max = Math.max(...Object.values(quote.yearly).map((v) => v.interest + v.insurance), 1); return <div className="bar-row" key={year}><span>{year}</span><div className="bar-track"><i className="bar-int" style={{ width: `${(item.interest / max) * 100}%` }} /><i className="bar-ins" style={{ width: `${(item.insurance / max) * 100}%` }} /></div><b>{money.format(item.interest + item.insurance)}</b></div>; })}</div><button className="schedule-button" onClick={() => setScheduleOpen(!scheduleOpen)}>{scheduleOpen ? t.hideSchedule : t.schedule}<span>→</span></button>
        </div>
      </div> : <>
        <div className="active-view-switch" role="tablist">
          <button className={activeView === "future" ? "active" : ""} onClick={() => setActiveView("future")} role="tab" aria-selected={activeView === "future"}>↗ {t.futureView}</button>
          <button className={activeView === "history" ? "active" : ""} onClick={() => setActiveView("history")} role="tab" aria-selected={activeView === "history"}>↶ {t.historyView}</button>
        </div>
        {activeView === "future" ? <div className="calculator-grid active-grid">
          <div className="form-panel">
            <div className="section-title"><span>01</span><div><h2>{t.activeBasics}</h2><p>{lang === "es" ? "Usa tu último estado de cuenta" : "Use your latest statement"}</p></div></div>
            <div className="field-grid">{input(t.currentBalance, activeBalance, setActiveBalance, "$")}{input(t.rate, activeRate, setActiveRate, "%")}{input(t.currentPayment, activePayment, setActivePayment, "$")}{dateInput(t.nextDate, nextDate, setNextDate)}{input(t.currentInsurance, activeInsurance, setActiveInsurance, "$")}</div>
            <div className="optional-strip"><span>{t.optionalHint}</span></div>
            <div className="field-grid muted-fields">{input(t.originalAmount, originalAmount, setOriginalAmount, "$")}{input(t.paidToDate, paidToDate, setPaidToDate, "$")}</div>
            <div className="section-title second"><span>02</span><div><h2>{t.extraPlan}</h2><p>{lang === "es" ? "Prueba una fecha y un monto" : "Try a date and an amount"}</p></div></div>
            <div className="field-grid">{input(t.oneExtra, oneExtra, setOneExtra, "$")}{dateInput(t.extraDate, extraDate, setExtraDate)}{input(t.monthlyExtra, monthlyExtra, setMonthlyExtra, "$")}</div>
          </div>
          <div className="results-panel active-results">
            <div className="results-kicker">{t.projection}</div>
            {(active.baseline.invalid || active.scenario.invalid) ? <div className="warning">! {t.badPayment}</div> : <>
              <div className="payoff-compare"><div><span>{t.payoffBefore}</span><b>{active.baseline.rows.length ? dateFmt.format(active.baseline.rows.at(-1)!.date) : "—"}</b><small>{active.baseline.rows.length} {t.months}</small></div><span className="arrow">→</span><div className="better"><span>{t.payoffAfter}</span><b>{active.scenario.rows.length ? dateFmt.format(active.scenario.rows.at(-1)!.date) : "—"}</b><small>{active.scenario.rows.length} {t.months}</small></div></div>
              <div className="savings-hero"><span>{t.interestSaved}</span><strong>{money.format(active.interestSaved)}</strong><p><b>{active.monthsSaved}</b> {t.monthsSaved.toLowerCase()}</p></div>
              <div className="metric-grid two"><div><span>{t.originalInterest}</span><b>{money.format(active.interestBefore)}</b></div><div className="highlight"><span>{t.newInterest}</span><b>{money.format(active.interestAfter)}</b></div></div>
              {n(originalAmount) > 0 && <div className="progress-block"><div><span>{lang === "es" ? "Capital amortizado" : "Principal repaid"}</span><b>{Math.max(0, Math.min(100, ((n(originalAmount) - n(activeBalance)) / n(originalAmount)) * 100)).toFixed(0)}%</b></div><div className="progress"><i style={{ width: `${Math.max(0, Math.min(100, ((n(originalAmount) - n(activeBalance)) / n(originalAmount)) * 100))}%` }} /></div><small>{money.format(n(paidToDate))} {lang === "es" ? "pagado en total (incluye interés y cargos)" : "paid in total (includes interest and charges)"}</small></div>}
            </>}
            <div className="info-box"><span>i</span><p>{t.activeDisclaimer}</p></div>
          </div>
        </div> : <div className="calculator-grid active-grid history-grid">
          <div className="form-panel">
            <div className="section-title"><span>01</span><div><h2>{t.historyBasics}</h2><p>{t.historyBasicsHint}</p></div></div>
            <div className="field-grid">
              {input(t.originalAmount, originalAmount, setOriginalAmount, "$")}
              {input(t.scheduledPayment, activePayment, setActivePayment, "$")}
              {input(t.historyInsurance, activeInsurance, setActiveInsurance, "$")}
              {dateInput(t.originalFirstDate, historyFirstDate, setHistoryFirstDate)}
              <div className="derived-note"><span>{t.totalDebit}</span><b>{money.format(n(activePayment) + n(activeInsurance))}</b><small>{t.totalDebitHint}</small></div>
              <label className="field full"><span>{t.knownInput}</span><div className="segmented two">{(["rate", "term"] as KnownInput[]).map((item) => <button key={item} className={history.known === item ? "active" : ""} disabled={history.termLocked && item === "term"} onClick={() => { touch(); setHistoryKnown(item); }}>{item === "rate" ? t.knownRate : t.knownTerm}</button>)}</div></label>
              {history.known === "rate" ? input(t.rate, activeRate, setActiveRate, "%") : input(t.originalTerm, historyMonths, setHistoryMonths, t.months)}
              {history.termLocked && <div className="derived-note locked"><span>{t.knownTerm}</span><b>{history.baseline.rows.length} {t.months}</b><small>{t.termLocked}</small></div>}
              {input(t.currentBalance, activeBalance, setActiveBalance, "$")}
              {history.known === "term" && <div className="derived-note"><span>{t.estimatedRate}</span><b>{history.rateUnsolved ? "—" : `${history.annualRate.toFixed(2)}%`}</b><small>{t.estimatedRateHint}</small></div>}
            </div>
            <div className="section-title second"><span>02</span><div><h2>{t.extraHistory}</h2><p>{t.extraHistoryHint}</p></div></div>
            <div className="extra-entry">
              {dateInput(t.extraDate, historyExtraDate, setHistoryExtraDate)}
              {input(t.oneExtra, historyExtraAmount, setHistoryExtraAmount, "$")}
              <button className="add-extra" onClick={addHistoryExtra}>+ {t.addExtra}</button>
            </div>
            <div className="extra-ledger">
              {historyExtras.length === 0 ? <p>{t.noExtras}</p> : historyExtras.map((item, index) => <div className="extra-row" key={item.id}><span className="extra-number">{String(index + 1).padStart(2, "0")}</span><time>{new Intl.DateTimeFormat(lang === "es" ? "es-SV" : "en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parseDate(item.date))}</time><b>{money.format(n(item.amount))}</b><button onClick={() => { touch(); setHistoryExtras((items) => items.filter((extra) => extra.id !== item.id)); }} aria-label={`${t.removeExtra} ${money.format(n(item.amount))}`}>×</button></div>)}
            </div>
            <div className="section-title second"><span>03</span><div><h2>{t.rateHistory}</h2><p>{t.rateHistoryHint}</p></div></div>
            <div className="extra-entry rate-entry">
              {dateInput(t.changeDate, changeDate, setChangeDate)}
              {input(t.newRate, changeRate, setChangeRate, "%")}
              {input(`${t.newPayment} (${t.newPaymentHint})`, changePayment, setChangePayment, "$")}
              <button className="add-extra" onClick={addRateChange}>+ {t.addChange}</button>
            </div>
            <div className="extra-ledger">
              {historyRateChanges.length === 0 ? <p>{t.noChanges}</p> : historyRateChanges.map((item, index) => <div className="extra-row" key={item.id}><span className="extra-number">{String(index + 1).padStart(2, "0")}</span><time>{new Intl.DateTimeFormat(lang === "es" ? "es-SV" : "en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parseDate(item.date))}</time><b>{item.rate.trim() === "" ? "—" : `${n(item.rate).toFixed(2)}%`}<small>{item.payment.trim() === "" ? t.keepsPayment : money.format(n(item.payment))}</small></b><button onClick={() => { touch(); setHistoryRateChanges((items) => items.filter((change) => change.id !== item.id)); }} aria-label={`${t.removeExtra} ${item.date}`}>×</button></div>)}
            </div>
          </div>
          <div className="results-panel active-results history-results">
            <div className="results-kicker">{t.historyResult}</div>
            {history.rateUnsolved ? <div className="warning">! {t.badTerm}</div> : (history.baseline.invalid || history.scenario.invalid) ? <div className="warning">! {t.badPayment}</div> : <>
              <div className="savings-hero history-saving"><span>{t.projectedSaving}</span><strong>{money.format(history.projectedSaving)}</strong><p><b>{history.monthsSaved}</b> {t.monthsSaved.toLowerCase()}</p></div>
              <div className="today-saving"><span>{t.savedToDate}</span><b>{money.format(history.savedToDate)}</b><small>{lang === "es" ? "ya no se generaron gracias a tus abonos anteriores" : "already avoided because of your past prepayments"}</small></div>
              <div className="payoff-compare"><div><span>{t.payoffBefore}</span><b>{history.baseline.rows.length ? dateFmt.format(history.baseline.rows.at(-1)!.date) : "—"}</b><small>{history.baseline.rows.length} {t.months}</small></div><span className="arrow">→</span><div className="better"><span>{t.payoffAfter}</span><b>{history.scenario.rows.length ? dateFmt.format(history.scenario.rows.at(-1)!.date) : "—"}</b><small>{history.scenario.rows.length} {t.months}</small></div></div>
              <div className="balance-compare"><div><span>{t.balanceWithout}</span><b>{money.format(history.balanceTodayWithout)}</b></div><span>− {money.format(history.balanceReduction)}</span><div><span>{t.balanceWith}</span><b>{money.format(history.balanceTodayWith)}</b></div></div>
              <div className="metric-grid two"><div><span>{t.extrasTotal}</span><b>{money.format(history.extrasTotal)}</b></div><div className="highlight"><span>{t.balanceReduction}</span><b>{money.format(history.balanceReduction)}</b></div></div>
              {n(activeInsurance) > 0 && <div className="statement-check"><span>{t.insurancePaid}<small>{t.insurancePaidHint}</small></span><b>{money.format(history.insuranceTotal)}</b></div>}
              {n(activeBalance) > 0 && <div className="statement-check"><span>{lang === "es" ? "Comparado con tu estado de cuenta" : "Compared with your statement"}</span><b>{money.format(Math.abs(history.balanceTodayWith - n(activeBalance)))} {lang === "es" ? "de diferencia" : "difference"}</b></div>}
            </>}
            <div className="info-box"><span>i</span><p>{t.historyDisclaimer}</p></div>
          </div>
        </div>}
      </>}
      {mode === "new" && scheduleOpen && <div className="table-wrap"><table><thead><tr><th>{t.paymentNo}</th><th>{t.date}</th><th>{t.payment}</th><th>{t.interest}</th><th>{t.principal}</th><th>{t.charges}</th><th>{t.balance}</th></tr></thead><tbody>{quote.rows.map((row) => <tr key={row.number}><td>{row.number}</td><td>{dateFmt.format(row.date)}</td><td>{money.format(row.payment + row.insurance)}</td><td>{money.format(row.interest)}</td><td>{money.format(row.principal)}</td><td>{money.format(row.insurance)}</td><td>{money.format(row.closing)}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="accuracy"><div className="accuracy-icon">✓</div><div><h2>{t.accuracy}</h2><p>{t.accuracyText}</p><a href="https://ssf.gob.sv/servicios/tasas-de-interes-comisiones-y-recargos/" target="_blank" rel="noreferrer">{t.official} ↗</a></div></section>
    <section className="guide" id="guide"><div className="guide-head"><p>LOANPILOT 101</p><h2>{t.guideTitle}</h2><span>{t.guideLead}</span></div><div className="guide-grid">{[[t.guide1, t.guide1Text, "%"], [t.guide2, t.guide2Text, "∿"], [t.guide3, t.guide3Text, "◇"], [t.guide4, t.guide4Text, "↓"]].map(([title, text, icon], i) => <article key={title}><span>0{i + 1}</span><i>{icon}</i><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <footer><div className="brand footer-brand"><span>LP</span> LoanPilot</div><p>{t.footer} <a href="https://marloncoreas.com">marloncoreas.com</a><br />{t.educational}<a className="report-link" href={ISSUES_URL} target="_blank" rel="noreferrer">{t.report} ↗</a></p></footer>
  </main>;
}
