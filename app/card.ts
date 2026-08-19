// Extension written out: the test suite imports this module through Node's type
// stripping, which resolves specifiers literally. See tsconfig.json.
import { buildActiveSchedule, MAX_MONTHS, type Row } from "./loan.ts";

/**
 * A revolving card balance, worked out with the loan engine and nothing else.
 *
 * There is no second amortisation here on purpose. `buildActiveSchedule` already
 * accrues interest on the outstanding balance over actual days / 365, which is
 * the same arithmetic a card issuer runs; what a card adds is a payment that
 * moves with the balance and a fee that joins it, and both are parameters of
 * that function. A card module with its own loop would drift from the loan one
 * within two changes, and the two pages would quietly disagree about what a
 * dollar of interest is.
 *
 * WHAT IS PAID, AND WHAT IS DEBITED. In the loan builders `payment` excludes
 * insurance, and the pages add the two columns to show the real debit. Here the
 * monthly charge is CAPITALISED — it is added to the balance and then paid off
 * like the rest of it — so `payment` is already the whole debit and `insurance`
 * is the fee shown for information. Adding them would count the fee twice.
 */

/** How the account states its minimum: a fixed sum, or a share of the balance. */
export type MinimumMode = "amount" | "percent";

export type CardInput = {
  balance: number;
  annualRate: number;
  minimumMode: MinimumMode;
  /** Used when the mode is "amount": the same dollars every month. */
  minimumAmount: number;
  /** Used when the mode is "percent": a share of that month's balance. */
  minimumPercent: number;
  /** A fixed fee — commission, card insurance — charged to the account monthly. */
  monthlyCharge: number;
  /** What the reader would add on top of the minimum, every month. */
  extraPayment: number;
  firstDate: Date;
};

export type CardScenario = {
  rows: Row[];
  /**
   * There is no payoff date: at some point what is paid stops covering that
   * month's interest and fee, and the balance stops falling. It is not a very
   * long schedule, it is not a schedule, and the page says so instead of
   * printing a number.
   */
  neverClears: boolean;
  /**
   * The balance it stopped at, when it stopped at one.
   *
   * Two different things end up here and the page has to tell them apart. A
   * minimum below the first month's interest never moves the balance at all.
   * A PERCENTAGE minimum beside a fixed fee is the other case: the payment
   * shrinks with the balance and the fee does not, so the card pays down for
   * years and then stalls a few hundred dollars short — and calling that "the
   * balance does not fall" would be false about every one of those years.
   */
  stalledAt?: number;
  /** It does clear, but not inside the century the schedule is built for. */
  beyondHorizon: boolean;
  months: number;
  payoffDate?: Date;
  totalInterest: number;
  totalCharges: number;
  /** Everything that leaves the account, fee included. */
  totalPaid: number;
  /** What the account asks for in the first month, which is what a reader sees. */
  firstPayment: number;
};

export type CardComparison = {
  minimumOnly: CardScenario;
  withExtra: CardScenario;
  /** Both are `undefined` while the baseline has no payoff to compare against. */
  monthsSaved?: number;
  interestSaved?: number;
};

const sum = (rows: Row[], pick: (row: Row) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);

function scenario(input: CardInput, extraPayment: number): CardScenario {
  const { rows, invalid, stalledAt } = buildActiveSchedule({
    balance: input.balance,
    annualRate: input.annualRate,
    // Only one of the two is read: `minimumRate` takes over when it is set.
    payment: input.minimumAmount,
    minimumRate: input.minimumMode === "percent" ? input.minimumPercent : undefined,
    monthlyCharge: input.monthlyCharge,
    nextDate: input.firstDate,
    insurance: 0,
    monthlyExtra: extraPayment,
  });
  const last = rows.at(-1);
  const beyondHorizon = !invalid && rows.length >= MAX_MONTHS && (last?.closing ?? 0) > 0.005;
  const cleared = !invalid && !beyondHorizon && rows.length > 0;
  return {
    rows,
    neverClears: invalid,
    stalledAt: invalid ? stalledAt : undefined,
    beyondHorizon,
    months: rows.length,
    payoffDate: cleared ? last?.date : undefined,
    totalInterest: sum(rows, (row) => row.interest),
    totalCharges: sum(rows, (row) => row.insurance),
    totalPaid: sum(rows, (row) => row.payment),
    firstPayment: rows[0]?.payment ?? 0,
  };
}

/**
 * The two futures side by side: paying what the account asks, and paying that
 * plus a fixed amount every month.
 *
 * The savings are only stated when both futures end. Against a balance that
 * never clears there is no "months saved" to report — the honest comparison is
 * "never" against a date, and a subtraction would turn that into a small number
 * that reads like a minor improvement.
 */
export function compareCard(input: CardInput): CardComparison {
  const minimumOnly = scenario(input, 0);
  const withExtra = scenario(input, Math.max(0, input.extraPayment));
  const comparable = minimumOnly.payoffDate !== undefined && withExtra.payoffDate !== undefined;
  return {
    minimumOnly,
    withExtra,
    monthsSaved: comparable ? Math.max(0, minimumOnly.months - withExtra.months) : undefined,
    interestSaved: comparable
      ? Math.max(0, minimumOnly.totalInterest - withExtra.totalInterest)
      : undefined,
  };
}

/** One column of the balance chart: the same month in both futures. */
export type BalancePoint = { date: Date; baseline: number; scenario: number };

/**
 * The balance in both scenarios, thinned to something a bar chart can carry.
 *
 * Both schedules run on the same monthly grid, so a row index is the same month
 * in both and the scenario simply runs out first — where it has ended, its
 * balance is zero, which is the fact the chart is there to show. The last month
 * of the baseline is always included: a chart of a payoff that stops short of
 * the payoff would be the one misleading frame in it.
 */
export function balanceSeries(baseline: Row[], scenario: Row[], points = 12): BalancePoint[] {
  if (baseline.length === 0) return [];
  const at = (index: number): BalancePoint => ({
    date: baseline[index].date,
    baseline: baseline[index].closing,
    scenario: index < scenario.length ? scenario[index].closing : 0,
  });
  const step = Math.max(1, Math.ceil(baseline.length / points));
  const series: BalancePoint[] = [];
  for (let index = step - 1; index < baseline.length - 1; index += step) series.push(at(index));
  series.push(at(baseline.length - 1));
  return series;
}
