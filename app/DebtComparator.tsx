import { useMemo, useState } from "react";
import { compareDebts, isDebtProblem, type DebtPlan } from "./debts";
import { MoneyField, NumberField } from "./fields";
import { n } from "./loan";
import type { Lang } from "./routes";

/**
 * The order to pay several debts in, and what the choice actually costs.
 *
 * IT TAKES NO SIDE, and the layout is built so it cannot start taking one by
 * accident. The two orders sit in two columns of equal weight; the cheaper one
 * is marked as cheaper because that is a fact, and the other one carries the
 * fact that belongs to it — it clears an account sooner. The sentence under
 * both says the thing the arithmetic cannot: the plan people finish beats the
 * plan that is a few dollars cheaper on paper.
 *
 * All the arithmetic is in `debts.ts`, which is itself a view over the shared
 * schedule builder. Nothing is computed in this file.
 */

const MAX_DEBTS = 6;

export type DebtRow = { id: number; balance: string; rate: string; minimum: string };

/**
 * Two sample debts that DISAGREE, which is the only kind worth opening with.
 *
 * The card is the dearest and the loan is the smallest, so the two orders come
 * out different and the page shows what it is for on the first render. A sample
 * where the dearest debt is also the smallest renders a comparison with nothing
 * to compare, and a reader who does not fill in the form learns nothing.
 */
export const DEBT_SAMPLE: DebtRow[] = [
  { id: 1, balance: "1500", rate: "36", minimum: "75" },
  { id: 2, balance: "800", rate: "14", minimum: "45" },
];

const copy = {
  es: {
    title: "Varias deudas: en qué orden",
    subtitle: "Con un solo presupuesto mensual, el orden cambia lo que pagás de intereses",
    lead: "Poné cada deuda con su saldo, su tasa y el pago mínimo que exige. Abajo van las dos formas de ordenarlas: pagar primero la más cara y pagar primero la más pequeña. Las dos pagan los mínimos de todas; lo que sobra va a una sola.",
    balance: "Saldo", rate: "Tasa anual", minimum: "Pago mínimo",
    debtLabel: (index: number) => `Deuda ${index}`,
    remove: "Quitar esta deuda", add: "+ Agregar deuda",
    total: "Total que podés pagar al mes", totalHint: "Todo lo que destinás a estas deudas juntas, mínimos incluidos",
    helpBalance: "Lo que debés hoy en esa cuenta, según el último estado.",
    helpRate: "La tasa de interés anual de esa deuda. Si el estado de cuenta da una tasa mensual, multiplicala por doce.",
    helpMinimum: "El pago mínimo que exige esa cuenta cada mes, en dólares. Si tu tarjeta lo calcula como porcentaje del saldo, usá el monto que te está exigiendo ahora.",
    helpTotal: "La suma de lo que podés poner cada mes en estas deudas. Tiene que alcanzar al menos para todos los mínimos.",

    avalanche: "Primero la más cara", avalancheHint: "Por tasa, de mayor a menor",
    snowball: "Primero la más pequeña", snowballHint: "Por saldo, de menor a mayor",
    interest: "Intereses en total", freeIn: "Libre en", months: "meses",
    order: "Orden sugerido", firstOut: "Primera cuenta cerrada",
    cheaper: "Paga menos intereses",
    sooner: "Cierra una cuenta antes",
    monthLabel: "mes",

    verdictSame: "Con estas cifras las dos formas dan el mismo orden: la deuda más cara también es la más pequeña, así que no hay nada que elegir.",
    verdictLead: "Pagar primero la más cara te ahorra",
    verdictTail: "en intereses.",
    verdictMonths: (months: number) => months === 0
      ? "Las dos terminan el mismo mes."
      : `Y termina ${months} ${months === 1 ? "mes" : "meses"} antes.`,
    verdictFirst: (months: number) => months === 0
      ? "Las dos cierran su primera cuenta el mismo mes."
      : `Empezar por la más pequeña cierra la primera cuenta ${months} ${months === 1 ? "mes" : "meses"} antes.`,
    balanced: "Ninguna de las dos está mal. La más cara primero es la que menos intereses paga —eso es aritmética—, y la más pequeña primero es la que más gente sostiene hasta el final, porque ver una cuenta cerrada temprano es lo que hace que el plan siga. Un plan que terminás vale más que uno más barato que abandonás.",
    rollNote: "En las dos, cuando una deuda queda en cero su pago mínimo no se libera: pasa a sumarse a la siguiente. Eso es lo que hace que el plan se acelere hacia el final.",
    surplusNote: (surplus: string, minimums: string) => `De tu presupuesto, ${minimums} se van en los mínimos de todas y ${surplus} quedan libres para atacar una sola deuda cada mes.`,
    noSurplus: "Tu presupuesto cubre justo los mínimos y no sobra nada para atacar ninguna deuda. El orden entonces no cambia casi nada: lo que cambia el resultado es conseguir algo por encima de los mínimos.",

    tooFew: "Agregá al menos dos deudas con saldo y pago mínimo. Con una sola no hay orden que elegir.",
    belowLead: "Tu presupuesto no alcanza para los mínimos: faltan",
    belowTail: "al mes. Antes de elegir un orden hay que llegar a los mínimos de todas, porque no pagarlos trae cargos y no es una estrategia.",
    stallsLead: "El pago mínimo de la",
    stallsTail: "no alcanza a cubrir ni sus propios intereses, así que ese saldo no baja nunca y ningún orden lo arregla. Esa cuenta necesita un pago mayor antes de que esta comparación signifique algo.",

    notModelled: "Lo que esto no modela",
    notModelledText: "Compras nuevas en esas cuentas, mínimos que cambian con el saldo, cargos por mora y tasas promocionales que vencen. Los cuatro empeoran el resultado real, en los dos órdenes por igual. Y esto es aritmética, no una regla legal: no hay norma que citar acá.",
  },
  en: {
    title: "Several debts: in which order",
    subtitle: "With one monthly budget, the order changes what you pay in interest",
    lead: "Enter each debt with its balance, its rate and the minimum it demands. Below are the two ways to order them: the dearest first, and the smallest first. Both pay every minimum; whatever is left over goes to one debt at a time.",
    balance: "Balance", rate: "Annual rate", minimum: "Minimum payment",
    debtLabel: (index: number) => `Debt ${index}`,
    remove: "Remove this debt", add: "+ Add a debt",
    total: "What you can pay each month", totalHint: "Everything you put towards these debts together, minimums included",
    helpBalance: "What you owe on that account today, from your latest statement.",
    helpRate: "The annual interest rate on that debt. If the statement gives a monthly rate, multiply it by twelve.",
    helpMinimum: "The minimum that account demands each month, in dollars. If your card works it out as a percentage of the balance, use the amount it is demanding now.",
    helpTotal: "The sum of what you can put towards these debts each month. It has to cover every minimum at least.",

    avalanche: "Dearest first", avalancheHint: "By rate, highest down",
    snowball: "Smallest first", snowballHint: "By balance, lowest up",
    interest: "Interest in total", freeIn: "Free in", months: "months",
    order: "Suggested order", firstOut: "First account cleared",
    cheaper: "Pays less interest",
    sooner: "Clears an account sooner",
    monthLabel: "month",

    verdictSame: "With these figures both ways give the same order: the dearest debt is also the smallest, so there is nothing to choose.",
    verdictLead: "Paying the dearest first saves you",
    verdictTail: "in interest.",
    verdictMonths: (months: number) => months === 0
      ? "Both finish in the same month."
      : `And it finishes ${months} ${months === 1 ? "month" : "months"} sooner.`,
    verdictFirst: (months: number) => months === 0
      ? "Both clear their first account in the same month."
      : `Starting with the smallest clears the first account ${months} ${months === 1 ? "month" : "months"} sooner.`,
    balanced: "Neither one is wrong. Dearest first pays the least interest — that is arithmetic — and smallest first is the one more people keep up, because seeing an account closed early is what keeps the plan going. A plan you finish is worth more than a cheaper one you abandon.",
    rollNote: "In both, a debt that reaches zero does not free up its minimum: that money joins the next one. It is what makes the plan accelerate towards the end.",
    surplusNote: (surplus: string, minimums: string) => `Of your budget, ${minimums} goes on everybody's minimums and ${surplus} is free to attack one debt at a time.`,
    noSurplus: "Your budget covers the minimums exactly and leaves nothing to attack any debt with. The order then changes almost nothing: what changes the result is finding something above the minimums.",

    tooFew: "Add at least two debts with a balance and a minimum. With one there is no order to choose.",
    belowLead: "Your budget does not cover the minimums: it is short by",
    belowTail: "a month. Before choosing an order you have to reach every minimum, because missing them brings charges and is not a strategy.",
    stallsLead: "The minimum on",
    stallsTail: "does not cover even its own interest, so that balance never falls and no ordering fixes it. That account needs a bigger payment before this comparison means anything.",

    notModelled: "What this does not model",
    notModelledText: "New spending on those accounts, minimums that move with the balance, late fees and promotional rates that expire. All four make the real answer worse, in both orders alike. And this is arithmetic, not a legal rule: there is no norm to cite here.",
  },
} as const;

export default function DebtComparator({ lang, rows, setRows, total, setTotal }: {
  lang: Lang;
  rows: DebtRow[];
  setRows: (update: (rows: DebtRow[]) => DebtRow[]) => void;
  total: string;
  setTotal: (value: string) => void;
}) {
  const t = copy[lang];
  const money = useMemo(() => new Intl.NumberFormat(lang === "es" ? "es-SV" : "en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }), [lang]);
  const exact = useMemo(() => new Intl.NumberFormat(lang === "es" ? "es-SV" : "en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
  }), [lang]);
  const [nextId, setNextId] = useState(() => Math.max(0, ...rows.map((row) => row.id)) + 1);

  const result = useMemo(() => compareDebts(
    rows.map((row) => ({ balance: n(row.balance), annualRate: n(row.rate), minimum: n(row.minimum) })),
    n(total)), [rows, total]);

  const update = (id: number, key: keyof Omit<DebtRow, "id">, value: string) =>
    setRows((items) => items.map((row) => (row.id === id ? { ...row, [key]: value } : row)));

  /**
   * The reader's numbering, not the plan's.
   *
   * `debts.ts` works with the rows that have figures in them, so its indexes
   * skip a row left blank. Naming a debt "Deuda 2" when the reader can see
   * three rows on their screen would be a puzzle, so the label is resolved back
   * through the same filter the module applies.
   */
  const usable = rows.filter((row) => n(row.balance) > 0 && n(row.minimum) > 0);
  const label = (planIndex: number) => {
    const row = usable[planIndex];
    const position = rows.findIndex((item) => item.id === row?.id);
    return t.debtLabel(position + 1);
  };

  const planCard = (plan: DebtPlan, title: string, hint: string, badge: string, best: boolean) =>
    <div className={best ? "debt-plan best" : "debt-plan"}>
      <header><b>{title}</b><small>{hint}</small></header>
      <div className="debt-plan-figures">
        <div><span>{t.interest}</span><b>{exact.format(plan.totalInterest)}</b></div>
        <div><span>{t.freeIn}</span><b>{plan.months} {t.months}</b></div>
      </div>
      <ol className="debt-order">
        {plan.order.map((index, position) => <li key={index}>
          <i>{position + 1}</i>{label(index)}
          <small>{exact.format(n(usable[index]?.balance ?? "0"))} · {n(usable[index]?.rate ?? "0").toFixed(2)}%</small>
        </li>)}
      </ol>
      {badge && <p className="debt-badge">{badge}</p>}
    </div>;

  return <section className="recalc-band debt-band" id="deudas">
    <div className="section-title"><span>03</span><div><h2>{t.title}</h2><p>{t.subtitle}</p></div></div>
    <p className="debt-lead">{t.lead}</p>

    <div className="debt-rows">
      {rows.map((row, index) => <div className="debt-row" key={row.id}>
        <span className="debt-number">{String(index + 1).padStart(2, "0")}</span>
        <MoneyField label={t.balance} lang={lang} value={row.balance}
          onChange={(value) => update(row.id, "balance", value)}
          help={index === 0 ? t.helpBalance : undefined} />
        <NumberField label={t.rate} lang={lang} value={row.rate} suffix="%" step="0.01"
          onChange={(value) => update(row.id, "rate", value)}
          help={index === 0 ? t.helpRate : undefined} />
        <MoneyField label={t.minimum} lang={lang} value={row.minimum}
          onChange={(value) => update(row.id, "minimum", value)}
          help={index === 0 ? t.helpMinimum : undefined} />
        <button type="button" className="debt-remove" aria-label={`${t.remove} ${index + 1}`}
          disabled={rows.length <= 1}
          onClick={() => setRows((items) => items.filter((item) => item.id !== row.id))}>×</button>
      </div>)}
    </div>

    <div className="debt-controls">
      <button type="button" className="debt-add" disabled={rows.length >= MAX_DEBTS}
        onClick={() => { setRows((items) => [...items, { id: nextId, balance: "", rate: "", minimum: "" }]); setNextId(nextId + 1); }}>
        {t.add}
      </button>
      <MoneyField label={t.total} lang={lang} value={total} onChange={setTotal}
        note={t.totalHint} help={t.helpTotal} />
    </div>

    {isDebtProblem(result)
      ? <div className="debt-notes">
        {result.kind === "tooFew" && <div className="callout"><span>i</span><p>{t.tooFew}</p></div>}
        {result.kind === "belowMinimums" && <div className="callout warn"><span>!</span>
          <p>{t.belowLead} <b>{exact.format(result.missing)}</b> {t.belowTail}</p></div>}
        {result.kind === "stalls" && <div className="callout warn"><span>!</span>
          <p>{t.stallsLead} <b>{label(result.debt).toLowerCase()}</b> {t.stallsTail}</p></div>}
      </div>
      : <>
        <div className="debt-outcome">
          {/* No badges when the two orders are the same: "pays less interest"
              beside a plan identical to the one next to it is a distinction
              the figures do not support. */}
          {planCard(result.avalanche, t.avalanche, t.avalancheHint,
            result.identical ? "" : t.cheaper, !result.identical)}
          {planCard(result.snowball, t.snowball, t.snowballHint,
            result.identical ? "" : t.sooner, false)}
        </div>
        <div className="debt-notes">
          {result.identical
            ? <div className="callout"><span>=</span><p>{t.verdictSame}</p></div>
            : <div className="callout"><span>Δ</span><p>
              {t.verdictLead} <b>{exact.format(result.interestSaved)}</b> {t.verdictTail}{" "}
              {t.verdictMonths(result.monthsSaved)}{" "}
              {t.verdictFirst(Math.max(0, result.firstPayoff.avalanche - result.firstPayoff.snowball))}
            </p></div>}
          {!result.identical && <div className="callout"><span>◇</span><p>{t.balanced}</p></div>}
          <div className="callout"><span>Σ</span><p>
            {result.surplus > 0
              ? t.surplusNote(money.format(result.surplus), money.format(result.minimums))
              : t.noSurplus} {t.rollNote}
          </p></div>
          <div className="callout warn"><span>?</span><p><b>{t.notModelled}:</b> {t.notModelledText}</p></div>
        </div>
      </>}
  </section>;
}
