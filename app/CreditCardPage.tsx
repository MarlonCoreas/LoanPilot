import { useMemo, useState } from "react";
import { balanceSeries, compareCard, type MinimumMode } from "./card";
import { DateField, MoneyField, NumberField, SegmentedField } from "./fields";
import { isoAfterMonths, n, parseDate, type Row } from "./loan";
import DebtComparator, { DEBT_LABELS as debtCopy, DEBT_SAMPLE, type DebtRow } from "./DebtComparator";
import { downloadPdf } from "./pdf";
import { readShare, type ShareSchema } from "./share";
import { ShareButton, SharedNotice } from "./ShareLink";
import type { Lang } from "./routes";
import { ROUTES } from "./routes";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { OFFICIAL } from "./sources";
import UtilityHero from "./UtilityHero";

/**
 * The card calculator, and the only page here whose arithmetic answers to
 * nobody's statute.
 *
 * It carries no verification badge for that reason, exactly like the loan page:
 * a badge saying sources were checked, above a figure no source governs, is a
 * borrowed credential. The SSF link at the foot is where published rates and
 * commissions live, and it is offered as a place to compare, not as the
 * authority behind a number on this screen.
 *
 * THE POINT OF THE PAGE is the contrast, not the payoff date. Anybody can be
 * told a balance takes eight years to clear; what changes a decision is seeing
 * the same balance clear in three beside it. So the comparison is the headline
 * and the amortisation table is folded away, rather than the other way round.
 *
 * And the tone stays flat on purpose. The figures on this page are alarming
 * without any help, and a calculator that editorialises about somebody's
 * spending has stopped being a calculator.
 */

type ScheduleView = "minimum" | "extra";

const copy = {
  es: {
    title1: "Calculadora de tarjeta",
    title2: "Cuánto te cuesta el pago mínimo.",
    subtitle: "Cuántos meses y cuánto interés lleva pagar tu tarjeta con el mínimo, y cuánto cambian los dos si abonás algo más cada mes.",
    free: "Gratis · Sin registro · Tus datos no salen de tu dispositivo",
    demoLabel: "Estás viendo datos de ejemplo", demoReset: "Empezar de cero",
    exportPdf: "Descargar PDF", exportHint: "Llevate el cálculo",

    data: "Tu tarjeta", dataHint: "Tomá las cifras de tu último estado de cuenta",
    balance: "Saldo actual", rate: "Tasa anual",
    minimumMode: "Cómo te cobran el pago mínimo",
    modeAmount: "Un monto fijo", modePercent: "Un % del saldo",
    minimumAmount: "Pago mínimo mensual", minimumPercent: "Pago mínimo",
    charge: "Cargo fijo mensual",
    chargeHint: "Comisión de manejo, seguro u otro cargo que la tarjeta te suma cada mes.",
    firstDate: "Próxima fecha de pago",
    plan: "Tu abono adicional", planHint: "Probá un monto y mirá el contraste",
    extra: "Abono adicional cada mes",

    result: "Tu estimación",
    minimumOnly: "Solo el mínimo", withExtra: "Con el abono",
    payoff: "Terminarías de pagar", months: "meses", month: "mes",
    firstPayment: "Pago mínimo de este mes",
    interestMinimum: "Interés con el mínimo", interestExtra: "Interés con el abono",
    paidMinimum: "Total pagado con el mínimo", paidExtra: "Total pagado con el abono",
    charges: "Cargos del período",
    interestSaved: "Interés que ahorrás", monthsSaved: "meses menos",
    noExtra: "Sin abono adicional no hay contraste que mostrar: escribí un monto arriba y aparecen los dos escenarios.",

    noPayoff: "No se liquida",
    neverTitle: "Con ese pago mínimo el saldo no baja",
    neverText: "Lo que se paga cada mes no alcanza a cubrir el interés del mes más el cargo fijo, así que el saldo se queda igual o sube. No hay fecha de liquidación que calcular: no es un plazo largo, es que no hay plazo.",
    stalledTitle: "El saldo baja y después se detiene",
    stalledLead: "Con este mínimo el saldo baja durante",
    stalledMid: "y se detiene alrededor de",
    stalledTail: "En ese punto el porcentaje del saldo ya no alcanza a cubrir el interés del mes más el cargo fijo: la cuota se encogió con la deuda y el cargo no. Muchas tarjetas fijan además un mínimo en dólares que cierra ese hueco; si la tuya lo tiene, escribilo arriba como monto fijo.",
    untilStall: "hasta que el saldo se detiene",
    neverWithExtra: "Con el abono adicional que escribiste sí se liquida, y la fecha está arriba.",
    neverBoth: "Con el abono adicional que escribiste tampoco se liquida.",
    beyond: "A este ritmo el saldo se liquida, pero pasadas las mil doscientas cuotas que esta herramienta calcula: más de cien años. La cifra que importa aquí no es la fecha, es el interés.",
    percentNote: "Con un mínimo que es porcentaje del saldo, la cuota baja mes a mes junto con la deuda. Por eso el plazo se alarga: cada mes se abona menos capital que el anterior.",
    chargeNote: "El cargo fijo se suma al saldo antes de aplicar el pago, así que genera intereses el mes siguiente igual que una compra.",

    chartTitle: "Cómo baja el saldo", chartHint: "Saldo al cierre de cada corte",
    schedule: "Ver tabla de amortización", hideSchedule: "Ocultar tabla",
    scheduleOf: "Tabla de", scheduleMinimum: "Solo el mínimo", scheduleExtra: "Con el abono",
    colNumber: "Cuota", colDate: "Fecha", colPayment: "Pago", colInterest: "Interés",
    colCharge: "Cargo", colPrincipal: "Capital", colExtra: "Abono", colBalance: "Saldo",

    accuracy: "Qué hace precisa esta estimación",
    accuracyText: "Usamos interés sobre el saldo y año calendario de 365 días, que es la convención con la que se cotiza el crédito en el país. Tu emisor puede calcular el mínimo sobre el saldo del corte —no sobre el de hoy—, cobrar el interés desde la fecha de cada compra o aplicar un mínimo absoluto en dólares; compará siempre contra tu estado de cuenta. Ninguna cifra de esta página sale de normativa salvadoreña, así que no lleva fecha de verificación de fuentes.",
    official: "Consultar tasas y comisiones publicadas por la SSF",
    related: "Seguí con", relatedLoans: "Calculadora de préstamos",
    relatedLoansText: "Si estás pensando en consolidar el saldo en un préstamo, ahí podés comparar la cuota, el costo efectivo y los abonos a capital.",

    guideEyebrow: "LOANPILOT TARJETAS 101",
    guideTitle: "Por qué el mínimo dura tanto",
    guideLead: "Cuatro cosas explican casi todo lo que pasa en la tabla de arriba. Ninguna es un truco: están en el contrato.",
    guide: [
      ["El pago mínimo", "Está calculado para cubrir el interés del mes y un pedazo pequeño del capital. Pagarlo mantiene la cuenta al día; no es el ritmo al que se termina la deuda.", "◔"],
      ["Interés sobre saldo", "El interés se genera sobre lo que debés cada día, no sobre la compra original. Por eso bajar el saldo temprano quita más interés que bajarlo después.", "%"],
      ["La fecha de corte", "El estado de cuenta se arma en una fecha y el pago vence en otra. El saldo que cierra en el corte es el que genera el interés del período y el que fija el mínimo.", "◷"],
      ["El orden de aplicación", "Los pagos se aplican primero a cargos e intereses y sólo después a capital. Un abono que entra como pago normal puede quedarse en intereses; pedí que se aplique a capital y confirmalo en el siguiente estado de cuenta.", "↓"],
    ],

    helpBalance: "Lo que debés hoy en la tarjeta, según tu último estado de cuenta. Si tenés compras a cuotas ya facturadas, están adentro de ese saldo.",
    helpRate: "La tasa de interés anual del contrato, en porcentaje. Es la que se aplica al saldo del crédito rotativo; las compras a cuotas suelen llevar otra.",
    helpMinimumMode: "Mirá tu estado de cuenta: unas tarjetas fijan el mínimo en un monto y otras en un porcentaje del saldo. El porcentaje es el que hace que la cuota baje sola cada mes.",
    helpMinimumAmount: "El monto que te exigen pagar cada mes para mantener la cuenta al día.",
    helpMinimumPercent: "El porcentaje del saldo que te exigen pagar cada mes. Se recalcula sobre el saldo de cada corte, así que la cuota va bajando.",
    helpCharge: "Cargos fijos que la tarjeta te suma cada mes: manejo, membresía prorrateada, seguro. Si no llevás ninguno, dejá cero.",
    helpFirstDate: "La fecha en que vence tu próximo pago. Desde ahí se proyecta el resto del calendario.",
    helpExtra: "Lo que sumarías al pago mínimo todos los meses. Es el dato que produce el segundo escenario.",

    pdfTitle: "Estimación de tarjeta de crédito",
    pdfSubtitle: "Pago mínimo y abono adicional · Cálculo sobre saldo",
    pdfInput: "Dato usado", pdfValue: "Valor", pdfConcept: "Concepto", pdfAmount: "Monto",
    pdfInterest: "Interés total", pdfPaid: "Total pagado",
    pdfNotAdvice: "Estimación educativa calculada en el navegador de quien la generó; no sustituye tu estado de cuenta ni asesoría financiera.",
    pdfSlug: "tarjeta-credito",
  },
  en: {
    title1: "Credit card calculator",
    title2: "What the minimum payment costs you.",
    subtitle: "How many months and how much interest it takes to clear your card on the minimum, and how far a fixed extra each month moves both.",
    free: "Free · No signup · Your data stays on your device",
    demoLabel: "You are viewing sample data", demoReset: "Start from scratch",
    exportPdf: "Download PDF", exportHint: "Take the calculation with you",

    data: "Your card", dataHint: "Take the figures from your latest statement",
    balance: "Current balance", rate: "Annual rate",
    minimumMode: "How your minimum payment is set",
    modeAmount: "A fixed amount", modePercent: "A % of the balance",
    minimumAmount: "Monthly minimum payment", minimumPercent: "Minimum payment",
    charge: "Fixed monthly charge",
    chargeHint: "Servicing commission, insurance or any other charge the card adds every month.",
    firstDate: "Next payment date",
    plan: "Your extra payment", planHint: "Try an amount and watch the contrast",
    extra: "Extra payment every month",

    result: "Your estimate",
    minimumOnly: "Minimum only", withExtra: "With the extra",
    payoff: "You would finish paying", months: "months", month: "month",
    firstPayment: "This month's minimum",
    interestMinimum: "Interest on the minimum", interestExtra: "Interest with the extra",
    paidMinimum: "Total paid on the minimum", paidExtra: "Total paid with the extra",
    charges: "Charges over the period",
    interestSaved: "Interest you save", monthsSaved: "months earlier",
    noExtra: "With no extra payment there is no contrast to show: enter an amount above and both scenarios appear.",

    noPayoff: "Does not clear",
    neverTitle: "On that minimum the balance does not fall",
    neverText: "What is paid each month does not cover the month's interest plus the fixed charge, so the balance stays where it is or grows. There is no payoff date to work out: it is not a long term, it is the absence of one.",
    stalledTitle: "The balance falls, and then stops",
    stalledLead: "On this minimum the balance falls for",
    stalledMid: "and stops at around",
    stalledTail: "At that point the percentage of the balance no longer covers the month's interest plus the fixed charge: the payment shrank along with the debt and the charge did not. Many cards also set a minimum in dollars that closes this gap; if yours has one, enter it above as a fixed amount.",
    untilStall: "up to where the balance stops",
    neverWithExtra: "With the extra payment you entered it does clear, and that date is above.",
    neverBoth: "The extra payment you entered does not clear it either.",
    beyond: "At this pace the balance does clear, but past the twelve hundred instalments this tool works out: more than a century. The figure that matters here is not the date, it is the interest.",
    percentNote: "Where the minimum is a percentage of the balance, the payment falls month by month along with the debt. That is why the term stretches: each month repays less principal than the one before.",
    chargeNote: "The fixed charge joins the balance before the payment lands, so it earns interest the following month exactly like a purchase.",

    chartTitle: "How the balance falls", chartHint: "Balance at the close of each cycle",
    schedule: "View the amortisation table", hideSchedule: "Hide the table",
    scheduleOf: "Table for", scheduleMinimum: "Minimum only", scheduleExtra: "With the extra",
    colNumber: "No.", colDate: "Date", colPayment: "Payment", colInterest: "Interest",
    colCharge: "Charge", colPrincipal: "Principal", colExtra: "Extra", colBalance: "Balance",

    accuracy: "What makes this estimate accurate",
    accuracyText: "We use declining-balance interest and a 365-day calendar year, the convention credit is quoted with in the country. Your issuer may work the minimum out on the statement balance rather than today's, charge interest from each purchase date, or apply an absolute floor in dollars; always compare against your statement. No figure on this page comes from Salvadoran regulation, so it carries no source verification date.",
    official: "Check the rates and commissions published by the SSF",
    related: "Carry on with", relatedLoans: "Loan calculator",
    relatedLoansText: "If you are thinking of consolidating the balance into a loan, that is where to compare the payment, the effective cost and extra principal payments.",

    guideEyebrow: "LOANPILOT CARDS 101",
    guideTitle: "Why the minimum takes so long",
    guideLead: "Four things explain almost everything in the table above. None of them is a trick: they are all in the contract.",
    guide: [
      ["The minimum payment", "It is set to cover the month's interest and a small slice of principal. Paying it keeps the account current; it is not the pace at which the debt ends.", "◔"],
      ["Interest on the balance", "Interest accrues on what you owe each day, not on the original purchase. That is why lowering the balance early removes more interest than lowering it later.", "%"],
      ["The statement date", "The statement closes on one date and the payment falls due on another. The balance at the close is what earns the period's interest and what sets the minimum.", "◷"],
      ["The order payments are applied in", "Payments go to charges and interest first, and only then to principal. An extra paid as an ordinary payment can stop at the interest; ask for it to be applied to principal and check the next statement.", "↓"],
    ],

    helpBalance: "What you owe on the card today, per your latest statement. Instalment purchases already billed are inside that balance.",
    helpRate: "The contract's annual interest rate, as a percentage. It is the one applied to the revolving balance; instalment purchases usually carry a different one.",
    helpMinimumMode: "Check your statement: some cards set the minimum as an amount and others as a percentage of the balance. The percentage is what makes the payment fall on its own each month.",
    helpMinimumAmount: "The amount you are required to pay each month to keep the account current.",
    helpMinimumPercent: "The share of the balance you are required to pay each month. It is worked out again on each statement balance, so the payment keeps falling.",
    helpCharge: "Fixed charges the card adds every month: servicing, a prorated membership fee, insurance. Leave it at zero if you carry none.",
    helpFirstDate: "The date your next payment falls due. The rest of the schedule is projected from there.",
    helpExtra: "What you would add to the minimum payment every month. It is the figure that produces the second scenario.",

    pdfTitle: "Credit card estimate",
    pdfSubtitle: "Minimum payment and extra payment · Declining-balance calculation",
    pdfInput: "Detail used", pdfValue: "Value", pdfConcept: "Concept", pdfAmount: "Amount",
    pdfInterest: "Total interest", pdfPaid: "Total paid",
    pdfNotAdvice: "An educational estimate, worked out in the browser of whoever generated it; it does not replace your statement or financial advice.",
    pdfSlug: "credit-card",
  },
} as const;

/** How many of the comparator's rows a link carries. The form allows six. */
const MAX_SHARED_DEBTS = 6;

/**
 * The card and the comparator below it, as the reader described them. Nothing
 * either one worked out.
 *
 * The debt rows are numbered keys rather than a packed list: `b2=1500&r2=36`
 * stays readable in the address bar, which is how a reader decides whether to
 * send the link, and each field still validates against its own shape.
 */
const SHARE_SCHEMA: ShareSchema = {
  sa: { kind: "money" },
  ta: { kind: "decimal", max: 200 },
  mm: { kind: "option", values: ["amount", "percent"] },
  mi: { kind: "money" },
  mp: { kind: "decimal", max: 100 },
  ca: { kind: "money" },
  fe: { kind: "date" },
  ab: { kind: "money" },
  dt: { kind: "money" },
  ...Object.fromEntries(Array.from({ length: MAX_SHARED_DEBTS }, (_, index) => [
    [`b${index + 1}`, { kind: "money" as const }],
    [`r${index + 1}`, { kind: "decimal" as const, max: 200 }],
    [`m${index + 1}`, { kind: "money" as const }],
  ]).flat()),
};

/**
 * The comparator's rows from a link, or the sample when there is none.
 *
 * A row survives only if the link carried a balance for it: a stray `r3=36`
 * with no balance beside it would put an empty row on the screen and claim it
 * came from the sender.
 */
function debtsFromShare(shared: Record<string, string>): DebtRow[] {
  const rows: DebtRow[] = [];
  for (let index = 1; index <= MAX_SHARED_DEBTS; index++) {
    const balance = shared[`b${index}`];
    if (balance === undefined) continue;
    rows.push({
      id: index,
      balance,
      rate: shared[`r${index}`] ?? "",
      minimum: shared[`m${index}`] ?? "",
    });
  }
  return rows.length > 0 ? rows : DEBT_SAMPLE.map((row) => ({ ...row }));
}

export default function CreditCardPage({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const money = useMemo(() => new Intl.NumberFormat(lang === "es" ? "es-SV" : "en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
  }), [lang]);
  const monthFmt = useMemo(() => new Intl.DateTimeFormat(lang === "es" ? "es-SV" : "en-US", {
    month: "short", year: "numeric", timeZone: "UTC",
  }), [lang]);
  const longDate = useMemo(() => new Intl.DateTimeFormat(lang === "es" ? "es-SV" : "en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }), [lang]);

  // Sample data, flagged as sample data. The figures have to be plausible enough
  // to show what the page is for and are nobody's real card, so the strip above
  // the form says so and clears them in one click.
  const [shared] = useState(() => readShare(SHARE_SCHEMA));
  const fromLink = Object.keys(shared).length > 0;
  // Figures that came from a link are somebody's real card, so the sample
  // banner has nothing left to disown.
  const [demo, setDemo] = useState(!fromLink);
  const [balance, setBalance] = useState(shared.sa ?? "1500");
  const [rate, setRate] = useState(shared.ta ?? "36");
  const [minimumMode, setMinimumMode] = useState<MinimumMode>((shared.mm as MinimumMode) ?? "amount");
  const [minimumAmount, setMinimumAmount] = useState(shared.mi ?? "75");
  const [minimumPercent, setMinimumPercent] = useState(shared.mp ?? "5");
  const [charge, setCharge] = useState(shared.ca ?? "3.50");
  const [firstDate, setFirstDate] = useState(() => shared.fe ?? isoAfterMonths(1));
  const [extra, setExtra] = useState(shared.ab ?? "50");

  // The comparator's own state lives here so that the sample-clearing button
  // and the shared link can both reach it: the component below is a view, and
  // giving it a private copy would put half this page's inputs out of reach.
  const [debts, setDebts] = useState<DebtRow[]>(() => debtsFromShare(shared));
  const [debtTotal, setDebtTotal] = useState(shared.dt ?? "300");

  /**
   * Field names for the safeguard in `ShareButton`, so a value it refuses is
   * pinned to the box it came from. The comparator's rows are numbered rather
   * than named — its own labels repeat on every row, and "Deuda 2 · Saldo" is
   * what the reader can actually find.
   */
  const shareLabels: Record<string, string> = {
    sa: t.balance, ta: t.rate, mi: t.minimumAmount, mp: t.minimumPercent,
    ca: t.charge, fe: t.firstDate, ab: t.extra, dt: debtCopy[lang].total,
  };
  for (let index = 1; index <= MAX_SHARED_DEBTS; index++) {
    const debt = debtCopy[lang].debtLabel(index);
    shareLabels[`b${index}`] = `${debt} · ${debtCopy[lang].balance}`;
    shareLabels[`r${index}`] = `${debt} · ${debtCopy[lang].rate}`;
    shareLabels[`m${index}`] = `${debt} · ${debtCopy[lang].minimum}`;
  }

  const shareValues: Record<string, string> = {
    sa: balance, ta: rate, mm: minimumMode, mi: minimumAmount, mp: minimumPercent,
    ca: charge, fe: firstDate, ab: extra, dt: debtTotal,
  };
  debts.forEach((row, index) => {
    if (index >= MAX_SHARED_DEBTS) return;
    shareValues[`b${index + 1}`] = row.balance;
    shareValues[`r${index + 1}`] = row.rate;
    shareValues[`m${index + 1}`] = row.minimum;
  });
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleView, setScheduleView] = useState<ScheduleView>("extra");

  const touch = () => setDemo(false);
  const field = (setter: (value: string) => void) => (value: string) => { touch(); setter(value); };
  // Dates keep their default: an empty one is not sample data anybody could
  // mistake for their own, and parsing "" would poison the schedule with NaN.
  const clearSample = () => {
    setDemo(false);
    setBalance(""); setRate(""); setMinimumAmount(""); setMinimumPercent("");
    setCharge(""); setExtra(""); setFirstDate(isoAfterMonths(1));
    // The comparator below is on the same page and its two rows are sample
    // data too. Leaving them behind would have the banner say the figures were
    // cleared while two invented debts stayed on screen.
    setDebts([{ id: 1, balance: "", rate: "", minimum: "" }]);
    setDebtTotal("");
  };

  const card = useMemo(() => compareCard({
    balance: n(balance),
    annualRate: n(rate),
    minimumMode,
    minimumAmount: n(minimumAmount),
    minimumPercent: n(minimumPercent),
    monthlyCharge: n(charge),
    extraPayment: n(extra),
    firstDate: parseDate(firstDate),
  }), [balance, charge, extra, firstDate, minimumAmount, minimumMode, minimumPercent, rate]);

  const { minimumOnly, withExtra } = card;
  const hasExtra = n(extra) > 0;
  const series = useMemo(
    () => balanceSeries(minimumOnly.rows, withExtra.rows),
    [minimumOnly.rows, withExtra.rows]);
  const chartMax = Math.max(...series.map((point) => point.baseline), 1);
  const shown = scheduleView === "extra" && hasExtra ? withExtra : minimumOnly;

  const term = (scenario: typeof minimumOnly) => scenario.payoffDate === undefined
    ? t.noPayoff
    : `${longDate.format(scenario.payoffDate)} · ${scenario.months} ${scenario.months === 1 ? t.month : t.months}`;

  /**
   * The card as a document. The summary carries both futures side by side —
   * that contrast is the whole page — and the schedule that goes with it is the
   * one on screen, so the printed table and the visible one cannot disagree.
   */
  const exportPdf = () => {
    const notes: string[] = [];
    if (minimumOnly.neverClears) {
      notes.push(minimumOnly.months === 0
        ? `${t.neverTitle}. ${t.neverText}`
        : `${t.stalledTitle}. ${t.stalledLead} ${minimumOnly.months} ${t.months} ${t.stalledMid} ${money.format(minimumOnly.stalledAt ?? 0)}. ${t.stalledTail}`);
    }
    if (minimumOnly.beyondHorizon || withExtra.beyondHorizon) notes.push(t.beyond);
    if (minimumMode === "percent") notes.push(t.percentNote);
    if (n(charge) > 0) notes.push(t.chargeNote);
    notes.push(t.accuracyText);

    const schedule = shown.rows.map((row) => [
      String(row.number),
      monthFmt.format(row.date),
      money.format(row.payment),
      money.format(row.interest),
      money.format(row.insurance),
      money.format(row.principal),
      money.format(row.extra),
      money.format(row.closing),
    ]);

    return downloadPdf({
      slug: t.pdfSlug,
      title: t.pdfTitle,
      subtitle: t.pdfSubtitle,
      tables: [
        {
          head: [t.pdfInput, t.pdfValue],
          body: [
            [t.balance, money.format(n(balance))],
            [t.rate, `${n(rate).toFixed(2)}%`],
            [minimumMode === "percent" ? t.minimumPercent : t.minimumAmount,
              minimumMode === "percent" ? `${n(minimumPercent).toFixed(2)}%` : money.format(n(minimumAmount))],
            [t.charge, money.format(n(charge))],
            [t.extra, money.format(n(extra))],
            [t.firstDate, longDate.format(parseDate(firstDate))],
          ],
        },
        {
          head: [t.pdfConcept, t.minimumOnly, t.withExtra],
          body: [
            [t.payoff, term(minimumOnly), term(withExtra)],
            [t.firstPayment, money.format(minimumOnly.firstPayment), money.format(withExtra.firstPayment)],
            [t.pdfInterest, money.format(minimumOnly.totalInterest), money.format(withExtra.totalInterest)],
            [t.charges, money.format(minimumOnly.totalCharges), money.format(withExtra.totalCharges)],
            [t.pdfPaid, money.format(minimumOnly.totalPaid), money.format(withExtra.totalPaid)],
          ],
          numeric: [1, 2],
        },
        ...(schedule.length > 0 ? [{
          head: [t.colNumber, t.colDate, t.colPayment, t.colInterest, t.colCharge, t.colPrincipal, t.colExtra, t.colBalance],
          body: schedule,
          dense: true,
          numeric: [2, 3, 4, 5, 6, 7],
        }] : []),
      ],
      notes,
      disclaimer: t.pdfNotAdvice,
    }, lang);
  };

  const scheduleRow = (row: Row) => <tr key={row.number}>
    <td>{row.number}</td>
    <td>{monthFmt.format(row.date)}</td>
    <td>{money.format(row.payment)}</td>
    <td>{money.format(row.interest)}</td>
    <td>{money.format(row.insurance)}</td>
    <td>{money.format(row.principal)}</td>
    <td>{money.format(row.extra)}</td>
    <td>{money.format(row.closing)}</td>
  </tr>;

  return <main>
    <SiteHeader lang={lang} page="creditCard" />
    <UtilityHero title={t.title1} accent={t.title2} lead={t.subtitle} trust={t.free} />
    <section className="calculator-shell" id="calculator">
      {fromLink && <SharedNotice lang={lang} />}
      <div className="shell-toolbar">
        {demo && <div className="demo-flag"><i />{t.demoLabel}<button onClick={clearSample}>{t.demoReset}</button></div>}
        <div className="export-actions">
          <span>{t.exportHint}</span>
          <button type="button" onClick={exportPdf}><i>PDF</i>{t.exportPdf}</button>
        </div>
        <ShareButton lang={lang} schema={SHARE_SCHEMA} values={shareValues} labels={shareLabels} />
      </div>

      <div className="calculator-grid">
        <div className="form-panel">
          <div className="section-title"><span>01</span><div><h2>{t.data}</h2><p>{t.dataHint}</p></div></div>
          <div className="field-grid">
            <MoneyField label={t.balance} lang={lang} value={balance} onChange={field(setBalance)} help={t.helpBalance} />
            <NumberField label={t.rate} lang={lang} value={rate} onChange={field(setRate)} suffix="%" step="0.01" help={t.helpRate} />
            <SegmentedField full label={t.minimumMode} lang={lang} value={minimumMode}
              onChange={(next) => { touch(); setMinimumMode(next); }}
              options={[{ value: "amount", label: t.modeAmount }, { value: "percent", label: t.modePercent }] as const}
              help={t.helpMinimumMode} />
            {minimumMode === "amount"
              ? <MoneyField label={t.minimumAmount} lang={lang} value={minimumAmount}
                onChange={field(setMinimumAmount)} help={t.helpMinimumAmount} />
              : <NumberField label={t.minimumPercent} lang={lang} value={minimumPercent}
                onChange={field(setMinimumPercent)} suffix="%" step="0.1" help={t.helpMinimumPercent} />}
            <MoneyField label={t.charge} lang={lang} value={charge} onChange={field(setCharge)}
              note={t.chargeHint} help={t.helpCharge} />
            <DateField label={t.firstDate} lang={lang} value={firstDate} onChange={field(setFirstDate)} help={t.helpFirstDate} />
          </div>

          <div className="section-title second"><span>02</span><div><h2>{t.plan}</h2><p>{t.planHint}</p></div></div>
          <div className="field-grid">
            <MoneyField label={t.extra} lang={lang} value={extra} onChange={field(setExtra)} help={t.helpExtra} />
          </div>
        </div>

        <div className="results-panel active-results">
          <div className="results-kicker">{t.result}</div>

          {/* The comparison, and the ways it can fail to be one: a balance that
              never clears on the minimum, and no extra to contrast it with. A
              scenario with no payoff date says so in place of its term rather
              than borrowing the month count it managed before stopping. */}
          <div className="payoff-compare">
            <div>
              <span>{t.minimumOnly}</span>
              <b>{minimumOnly.payoffDate ? monthFmt.format(minimumOnly.payoffDate) : "—"}</b>
              <small>{minimumOnly.payoffDate ? `${minimumOnly.months} ${t.months}` : t.noPayoff}</small>
            </div>
            <span className="arrow">→</span>
            <div className={hasExtra && withExtra.payoffDate ? "better" : ""}>
              <span>{t.withExtra}</span>
              <b>{withExtra.payoffDate ? monthFmt.format(withExtra.payoffDate) : "—"}</b>
              <small>{withExtra.payoffDate ? `${withExtra.months} ${t.months}` : t.noPayoff}</small>
            </div>
          </div>

          {/* "Never falls" and "falls for six years and then stalls" are
              different facts about somebody's debt, and only the second one is
              usually true. Saying the first about the second would be the
              alarming version of a wrong answer. */}
          {minimumOnly.neverClears && <div className="warning">
            ! {minimumOnly.months === 0 ? t.neverTitle : t.stalledTitle}
          </div>}
          {minimumOnly.neverClears && <div className="callout"><span>i</span><p>
            {minimumOnly.months === 0
              ? t.neverText
              : <>{t.stalledLead} <b>{minimumOnly.months} {t.months}</b> {t.stalledMid} <b>{money.format(minimumOnly.stalledAt ?? 0)}</b>. {t.stalledTail}</>}
            {" "}{hasExtra && (withExtra.neverClears ? t.neverBoth : t.neverWithExtra)}
          </p></div>}

          {card.interestSaved !== undefined && hasExtra && <div className="savings-hero">
            <span>{t.interestSaved}</span><strong>{money.format(card.interestSaved)}</strong>
            <p><b>{card.monthsSaved}</b> {t.monthsSaved}</p>
          </div>}
          {!hasExtra && !minimumOnly.neverClears && <div className="callout"><span>i</span><p>{t.noExtra}</p></div>}

          {/* A total from a schedule that stops is a total up to where it
              stopped, and the tile says so. Printing it bare would understate
              the cost of the case with the worst one. */}
          <div className="result-tiles">
            <div><span>{t.firstPayment}</span><b>{money.format(minimumOnly.firstPayment)}</b></div>
            <div><span>{t.interestMinimum}</span><b>{money.format(minimumOnly.totalInterest)}</b>
              {minimumOnly.neverClears && <i>{t.untilStall}</i>}</div>
            {hasExtra && <div className="highlight"><span>{t.interestExtra}</span><b>{money.format(withExtra.totalInterest)}</b>
              {withExtra.neverClears && <i>{t.untilStall}</i>}</div>}
            <div><span>{t.paidMinimum}</span><b>{money.format(minimumOnly.totalPaid)}</b>
              {minimumOnly.neverClears && <i>{t.untilStall}</i>}</div>
            {hasExtra && <div><span>{t.paidExtra}</span><b>{money.format(withExtra.totalPaid)}</b>
              {withExtra.neverClears && <i>{t.untilStall}</i>}</div>}
            {n(charge) > 0 && <div><span>{t.charges}</span><b>{money.format(minimumOnly.totalCharges)}</b></div>}
          </div>

          {(minimumOnly.beyondHorizon || withExtra.beyondHorizon) && <div className="callout warn"><span>!</span><p>{t.beyond}</p></div>}

          {/* Same bar language as the loan page's yearly chart, with the two
              futures stacked in one row so the gap between them is the shape
              the eye reads first. */}
          {series.length > 0 && <div className="year-chart balance-chart">
            <div className="chart-head">
              <b>{t.chartTitle}</b>
              <span><i className="dot minimum" />{t.minimumOnly}{hasExtra && <><i className="dot extra" />{t.withExtra}</>}</span>
            </div>
            {series.map((point) => <div className="bar-row" key={point.date.toISOString()}>
              <span>{monthFmt.format(point.date)}</span>
              <div className="bar-stack">
                <div className="bar-track"><i className="bar-min" style={{ width: `${(point.baseline / chartMax) * 100}%` }} /></div>
                {hasExtra && <div className="bar-track"><i className="bar-extra" style={{ width: `${(point.scenario / chartMax) * 100}%` }} /></div>}
              </div>
              <b>{money.format(point.baseline)}</b>
            </div>)}
            <p className="field-note">{t.chartHint}</p>
          </div>}

          {minimumMode === "percent" && <div className="callout"><span>i</span><p>{t.percentNote}</p></div>}
          {n(charge) > 0 && <div className="callout"><span>§</span><p>{t.chargeNote}</p></div>}

          {shown.rows.length > 0 && <button className="schedule-button" onClick={() => setScheduleOpen(!scheduleOpen)}>
            {scheduleOpen ? t.hideSchedule : t.schedule}<span>→</span>
          </button>}
        </div>
      </div>

      {scheduleOpen && shown.rows.length > 0 && <>
        {hasExtra && <div className="active-view-switch" role="group" aria-label={t.scheduleOf}>
          <button type="button" className={scheduleView === "minimum" ? "active" : ""}
            onClick={() => setScheduleView("minimum")} aria-pressed={scheduleView === "minimum"}>
            {t.scheduleMinimum}
          </button>
          <button type="button" className={scheduleView === "extra" ? "active" : ""}
            onClick={() => setScheduleView("extra")} aria-pressed={scheduleView === "extra"}>
            {t.scheduleExtra}
          </button>
        </div>}
        <div className="table-wrap"><table>
          <thead><tr>
            <th>{t.colNumber}</th><th>{t.colDate}</th><th>{t.colPayment}</th><th>{t.colInterest}</th>
            <th>{t.colCharge}</th><th>{t.colPrincipal}</th><th>{t.colExtra}</th><th>{t.colBalance}</th>
          </tr></thead>
          <tbody>{shown.rows.map(scheduleRow)}</tbody>
        </table></div>
      </>}

      {/* One card answers "how long does this take". The next question, for
          anybody who has more than one balance, is which of them to attack
          first — and that one cannot be answered a card at a time.

          A BAND HERE AND NOT A ROUTE OF ITS OWN, decided rather than defaulted
          to. The arithmetic is the same schedule builder seen from further
          back, it reads no Salvadoran rule, and a route would owe an OG image,
          page metadata and a sources card it has nothing to put in. THE SIGNAL
          TO PROMOTE IT is demand that arrives without passing through the card
          calculator — people looking for the comparator itself. Until that
          shows up, a section of the page about expensive revolving debt is
          where somebody with several balances already is. */}
      <DebtComparator lang={lang} rows={debts} total={debtTotal}
        setRows={(update) => { touch(); setDebts(update); }}
        setTotal={field(setDebtTotal)} />
    </section>

    <section className="accuracy">
      <div className="accuracy-icon">✓</div>
      <div>
        <h2>{t.accuracy}</h2>
        <p>{t.accuracyText}</p>
        <a href={OFFICIAL.ssf} target="_blank" rel="noreferrer">{t.official} ↗</a>
      </div>
    </section>

    <section className="guide" id="guide">
      <div className="guide-head"><p>{t.guideEyebrow}</p><h2>{t.guideTitle}</h2><span>{t.guideLead}</span></div>
      <div className="guide-grid">{t.guide.map(([title, text, icon], index) => <article key={title}>
        <span>0{index + 1}</span><i>{icon}</i><h3>{title}</h3><p>{text}</p>
      </article>)}</div>
    </section>

    <section className="calculator-shell">
      <div className="source-panel related-panel"><h2>{t.related}</h2><div className="source-links">
        <a href={ROUTES[lang].loans}><b>→</b>{t.relatedLoans}: {t.relatedLoansText}<span /></a>
      </div></div>
    </section>

    <SiteFooter lang={lang} />
  </main>;
}
