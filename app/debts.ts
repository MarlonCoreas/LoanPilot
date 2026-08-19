// Extensions written out: the test suite imports this module through Node's
// type stripping, which resolves specifiers literally. See tsconfig.json.
import { addMonths, buildActiveSchedule, MAX_MONTHS, today } from "./loan.ts";

/**
 * Several debts and one monthly budget: which one to attack first.
 *
 * THIS IS NOT A NEW ENGINE, AND MUST NOT BECOME ONE. Every dollar of interest
 * below comes out of `buildActiveSchedule` — the same accrual the loan and the
 * card pages use, on the outstanding balance over actual days / 365. What this
 * module adds is the only thing the schedule builder cannot know: which debt
 * gets the surplus this month, and what happens to the surplus when a debt
 * disappears. It decides that, hands each debt to the builder for as long as
 * the decision holds, and hands it over again when the decision changes.
 *
 * THE TWO ORDERS, AND WHY NEITHER IS "THE RIGHT ONE".
 *
 *   Highest rate first pays the least interest. That is arithmetic and it is
 *   not in dispute: money aimed at the most expensive balance buys down the
 *   most expensive interest.
 *
 *   Smallest balance first clears an account sooner, and the difference in
 *   interest is usually small — often a few dozen dollars over a couple of
 *   years. It is the order most people actually finish, and a plan finished
 *   beats a cheaper plan abandoned.
 *
 * So this module reports both, with the gap between them stated in dollars and
 * months, and it takes no side. The page is allowed to say the first is
 * cheaper, because it is; it is not allowed to call the second a mistake.
 *
 * WHAT IT DOES NOT MODEL: new spending on any of these accounts, a minimum
 * payment that changes with the balance (the card page's `minimumRate` is not
 * used here — a comparator asks for the minimum in dollars because that is what
 * a statement shows), late fees, and any promotional rate that expires. All
 * four make the real answer worse than this one, in both orders.
 */

export type DebtInput = {
  balance: number;
  annualRate: number;
  /** The minimum due each month, in dollars, as the statement states it. */
  minimum: number;
};

export type Strategy = "avalanche" | "snowball";

export type Payoff = {
  /** Index into the debts as the reader entered them, so the UI can name it. */
  debt: number;
  month: number;
  date: Date;
};

export type DebtPlan = {
  strategy: Strategy;
  /** The debts in the order this strategy attacks them, as entered-indexes. */
  order: number[];
  months: number;
  totalInterest: number;
  totalPaid: number;
  payoffs: Payoff[];
  /** True when a debt stalls: the plan has no end and no total to report. */
  stalled: boolean;
};

/** Every reason a comparison cannot be made, told apart because the fixes differ. */
export type DebtProblem =
  /** Fewer than two debts: there is no order to choose. */
  | { kind: "tooFew" }
  /** The budget does not cover the minimums. Nothing can be compared. */
  | { kind: "belowMinimums"; minimums: number; missing: number }
  /** A minimum that never clears its own interest, so that debt never ends. */
  | { kind: "stalls"; debt: number };

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Highest rate first; a tie goes to the smaller balance, which clears sooner. */
function avalancheOrder(debts: DebtInput[]) {
  return debts.map((_, index) => index).sort((a, b) =>
    debts[b].annualRate - debts[a].annualRate || debts[a].balance - debts[b].balance);
}

/** Smallest balance first; a tie goes to the dearer one, which costs more to keep. */
function snowballOrder(debts: DebtInput[]) {
  return debts.map((_, index) => index).sort((a, b) =>
    debts[a].balance - debts[b].balance || debts[b].annualRate - debts[a].annualRate);
}

/**
 * One order, run to the end.
 *
 * The loop is over PHASES, not months. A phase lasts as long as the surplus
 * keeps going to the same debt — which ends when the target is paid off, or
 * when some other debt clears on its minimum alone and hands its minimum to the
 * surplus. Inside a phase nothing changes, so every debt is handed to
 * `buildActiveSchedule` once and the phase reads as many of its rows as the
 * phase lasted.
 *
 * `from` and `nextDate` advance together across phases so the accrual is one
 * continuous timeline rather than a series of restarts: month 14 of the second
 * phase charges interest for the days from month 13, not from today.
 */
function runPlan(debts: DebtInput[], order: number[], monthlyTotal: number, strategy: Strategy): DebtPlan | DebtProblem {
  const start = today();
  const balances = debts.map((debt) => debt.balance);
  const live = debts.map(() => true);
  const payoffs: Payoff[] = [];
  let elapsed = 0;
  let totalInterest = 0;
  let totalPaid = 0;

  while (live.some(Boolean) && elapsed < MAX_MONTHS) {
    const active = order.filter((index) => live[index]);
    const target = active[0];
    const minimums = active.reduce((sum, index) => sum + debts[index].minimum, 0);
    // Everything the budget has over the minimums goes to the target. A budget
    // that only covers the minimums is a valid plan, just a slow one.
    const surplus = Math.max(0, monthlyTotal - minimums);

    // Each debt for this phase: the target with the surplus, the rest on their
    // minimum. Built once and read for as long as the phase lasts.
    const schedules = new Map<number, ReturnType<typeof buildActiveSchedule>>();
    for (const index of active) {
      const payment = debts[index].minimum + (index === target ? surplus : 0);
      const schedule = buildActiveSchedule({
        balance: balances[index],
        annualRate: debts[index].annualRate,
        payment,
        nextDate: addMonths(start, elapsed),
        from: elapsed === 0 ? start : addMonths(start, elapsed - 1),
        insurance: 0,
      });
      // A minimum that cannot cover its own interest never ends, and no
      // ordering fixes that: the reader needs a bigger payment on that debt,
      // which is a different conversation from which one to attack first.
      if (schedule.invalid) return { kind: "stalls", debt: index };
      schedules.set(index, schedule);
    }

    // The phase ends at the first payoff, whoever it belongs to.
    const phase = Math.min(...active.map((index) => schedules.get(index)!.rows.length));
    if (!Number.isFinite(phase) || phase <= 0) break;

    for (const index of active) {
      const rows = schedules.get(index)!.rows.slice(0, phase);
      for (const row of rows) {
        totalInterest += row.interest;
        totalPaid += row.payment;
      }
      balances[index] = rows[rows.length - 1]?.closing ?? balances[index];
      if (balances[index] <= 0.005) {
        live[index] = false;
        payoffs.push({ debt: index, month: elapsed + phase, date: addMonths(start, elapsed + phase - 1) });
      }
    }
    elapsed += phase;
  }

  return {
    strategy,
    order,
    months: elapsed,
    totalInterest: round2(totalInterest),
    totalPaid: round2(totalPaid),
    payoffs: payoffs.sort((a, b) => a.month - b.month),
    stalled: live.some(Boolean),
  };
}

export type DebtComparison = {
  avalanche: DebtPlan;
  snowball: DebtPlan;
  /** What the cheaper order saves. Never negative: see the note below. */
  interestSaved: number;
  /** Months of difference. Can be zero, and often is. */
  monthsSaved: number;
  /** How soon each order clears its first account, which is snowball's point. */
  firstPayoff: { avalanche: number; snowball: number };
  /** The two orders came out identical — one debt dominates on both counts. */
  identical: boolean;
  minimums: number;
  surplus: number;
};

/**
 * Both orders, and the gap between them.
 *
 * `interestSaved` is stated as what the cheaper order saves rather than as a
 * signed difference, because the sign is not news: paying the dearest balance
 * first is always at least as cheap. What the reader does not know, and what
 * this is for, is whether the gap is $12 or $900 — and how many months earlier
 * the other order clears its first account.
 */
export function compareDebts(debts: DebtInput[], monthlyTotal: number): DebtComparison | DebtProblem {
  const usable = debts.filter((debt) => debt.balance > 0 && debt.minimum > 0);
  if (usable.length < 2) return { kind: "tooFew" };

  const minimums = round2(usable.reduce((sum, debt) => sum + debt.minimum, 0));
  if (monthlyTotal < minimums) {
    return { kind: "belowMinimums", minimums, missing: round2(minimums - monthlyTotal) };
  }

  const avalanche = runPlan(usable, avalancheOrder(usable), monthlyTotal, "avalanche");
  if ("kind" in avalanche) return avalanche;
  const snowball = runPlan(usable, snowballOrder(usable), monthlyTotal, "snowball");
  if ("kind" in snowball) return snowball;

  return {
    avalanche,
    snowball,
    interestSaved: round2(Math.max(0, snowball.totalInterest - avalanche.totalInterest)),
    monthsSaved: Math.max(0, snowball.months - avalanche.months),
    firstPayoff: {
      avalanche: avalanche.payoffs[0]?.month ?? 0,
      snowball: snowball.payoffs[0]?.month ?? 0,
    },
    identical: avalanche.order.join() === snowball.order.join(),
    minimums,
    surplus: round2(Math.max(0, monthlyTotal - minimums)),
  };
}

/** Narrowing helper, so a page can branch without repeating the shape. */
export function isDebtProblem(value: DebtComparison | DebtProblem): value is DebtProblem {
  return "kind" in value;
}
