import assert from "node:assert/strict";
import test from "node:test";

import { balanceSeries, compareCard } from "../app/card.ts";
import { addMonths, MAX_MONTHS, today } from "../app/loan.ts";

/**
 * The card calculator, which is the loan engine with two parameters and no
 * arithmetic of its own. What is worth testing here is therefore not the
 * accrual — `loan.test.mjs` holds that — but the three things a card does that
 * a loan does not:
 *
 *   a payment that shrinks with the balance,
 *   a fee that joins the balance instead of riding beside it,
 *   and a debt that never ends, which has no payoff date to print.
 */

const FIRST = addMonths(today(), 1);

const card = (overrides) => compareCard({
  balance: 1000,
  annualRate: 24,
  minimumMode: "amount",
  minimumAmount: 60,
  minimumPercent: 5,
  monthlyCharge: 0,
  extraPayment: 0,
  firstDate: FIRST,
  ...overrides,
});

test("a fixed minimum that clears the balance reports a date and a term", () => {
  const { minimumOnly } = card();
  assert.equal(minimumOnly.neverClears, false);
  assert.equal(minimumOnly.beyondHorizon, false);
  assert.ok(minimumOnly.months > 0);
  assert.ok(minimumOnly.payoffDate instanceof Date);
  // The last row closes the debt, which is what "payoff" means.
  assert.ok(minimumOnly.rows.at(-1).closing <= 0.005);
  assert.equal(minimumOnly.rows.at(-1).date.getTime(), minimumOnly.payoffDate.getTime());
  assert.equal(minimumOnly.firstPayment, minimumOnly.rows[0].payment);
});

test("a minimum that does not cover the interest never clears the debt", () => {
  // THE CASE THE PAGE EXISTS TO NAME. At 60% on a balance of 1,000 the month
  // costs about 50 and the account asks for 20: the balance does not fall, and
  // there is no payoff date — not a distant one, none. Printing a number here,
  // or looping a century looking for one, is the failure this rules out.
  const { minimumOnly } = card({ annualRate: 60, minimumAmount: 20 });

  assert.equal(minimumOnly.neverClears, true);
  assert.equal(minimumOnly.payoffDate, undefined);
  assert.equal(minimumOnly.months, 0);
  assert.deepEqual(minimumOnly.rows, []);
  // And nothing is claimed about savings against a debt that has no end.
  const comparison = compareCard({
    balance: 1000, annualRate: 60, minimumMode: "amount", minimumAmount: 20,
    minimumPercent: 5, monthlyCharge: 0, extraPayment: 10, firstDate: FIRST,
  });
  assert.equal(comparison.monthsSaved, undefined);
  assert.equal(comparison.interestSaved, undefined);
});

test("a percentage minimum that is under the monthly rate never clears either", () => {
  // The same failure in the other input mode, and the reason one test does not
  // cover both: here the payment falls as fast as the balance, so a shortfall
  // in the first month is a shortfall in every month by construction.
  const { minimumOnly } = card({ minimumMode: "percent", minimumPercent: 1, annualRate: 36 });
  assert.equal(minimumOnly.neverClears, true);
  assert.equal(minimumOnly.payoffDate, undefined);
});

test("a fixed monthly charge is debt, and on its own can stop a card from clearing", () => {
  // The fee is charged TO the account: it joins the balance and earns interest
  // next month. That is the difference between a fee and the loan page's
  // insurance, and it is enough to turn a card that clears into one that does
  // not — 12 covers the ~10 of interest, and does not cover 10 plus a 5 fee.
  const without = card({ annualRate: 12, minimumAmount: 12 }).minimumOnly;
  assert.equal(without.neverClears, false);

  const with5 = card({ annualRate: 12, minimumAmount: 12, monthlyCharge: 5 }).minimumOnly;
  assert.equal(with5.neverClears, true);

  // Where it does clear, the fee shows in its own column and in the totals, and
  // it is inside the payment rather than beside it: adding the two would bill
  // the reader twice for the same dollar.
  const paying = card({ minimumAmount: 90, monthlyCharge: 4 }).minimumOnly;
  assert.equal(paying.rows[0].insurance, 4);
  assert.ok(Math.abs(paying.totalCharges - paying.rows.length * 4) < 0.005);
  assert.ok(paying.rows[0].payment <= 90.005, "the fee is paid out of the minimum, not on top of it");
  assert.ok(paying.totalInterest > card({ minimumAmount: 90 }).minimumOnly.totalInterest,
    "a capitalised fee earns interest of its own");
});

test("a percentage minimum beside a fixed fee stalls, and says where", () => {
  // FOUND IN THE BROWSER, NOT HERE. The page opened on a card that pays down
  // for years and then stops: the minimum is a share of the balance and shrinks
  // with it, while the fee does not, so below a certain balance the payment
  // stops covering interest plus fee. The engine flagged it correctly and the
  // page announced "the balance does not fall" over a schedule of sixty months
  // in which it fell by more than a thousand dollars.
  //
  // 5% of the balance against ~2.9% of monthly interest leaves 2.1% for the
  // debt, so a $3.50 fee catches up at roughly $170.
  const { minimumOnly } = card({
    balance: 1500, annualRate: 36, minimumMode: "percent", minimumPercent: 5, monthlyCharge: 3.5,
  });

  assert.equal(minimumOnly.neverClears, true);
  assert.equal(minimumOnly.payoffDate, undefined);
  // It did fall, for years, and the figures that say so have to survive.
  assert.ok(minimumOnly.months > 24, `${minimumOnly.months} months is not the case this describes`);
  assert.ok(minimumOnly.rows.at(-1).closing < 1500);
  // And it stopped somewhere the page can name.
  assert.ok(minimumOnly.stalledAt > 100 && minimumOnly.stalledAt < 250, minimumOnly.stalledAt);
  assert.ok(Math.abs(minimumOnly.stalledAt - minimumOnly.rows.at(-1).closing) < 0.005,
    "the stall balance is where the last row left off");

  // A balance that never moves at all is the other case, and it carries the
  // starting balance rather than a schedule.
  const dead = card({ annualRate: 60, minimumAmount: 20 }).minimumOnly;
  assert.equal(dead.months, 0);
  assert.equal(dead.stalledAt, 1000);

  // A schedule that clears claims no stall at all.
  assert.equal(card().minimumOnly.stalledAt, undefined);
});

test("every row of a schedule accounts for the balance it moved", () => {
  // closing = opening - principal - extra, with the fee and the interest inside
  // `principal` as a negative when the payment does not reach them. It is the
  // invariant the loan page's table and this page's table both render.
  for (const scenario of [
    card({ monthlyCharge: 3, extraPayment: 25 }).withExtra,
    card({ minimumMode: "percent", minimumPercent: 5, monthlyCharge: 2 }).minimumOnly,
  ]) {
    assert.ok(scenario.rows.length > 0);
    for (const row of scenario.rows) {
      assert.ok(Math.abs(row.closing - (row.opening - row.principal - row.extra)) < 0.005,
        `row ${row.number}: ${row.opening} -> ${row.closing}`);
      assert.ok(row.closing >= 0);
      assert.ok(Math.abs(row.principal - (row.payment - row.extra - row.interest - row.insurance)) < 0.005,
        `row ${row.number}: the payment does not split into interest, fee and principal`);
    }
  }
});

test("a percentage minimum falls month by month, which is why the term stretches", () => {
  const percent = card({ minimumMode: "percent", minimumPercent: 5 }).minimumOnly;
  const fixed = card({ minimumAmount: 50 }).minimumOnly;

  for (let i = 1; i < percent.rows.length - 1; i++) {
    assert.ok(percent.rows[i].payment <= percent.rows[i - 1].payment + 0.005,
      `instalment ${i + 1} is larger than the one before it`);
  }
  // Both start at 50 on a balance of 1,000; the one that keeps paying 50 ends
  // first, and the gap is the point of the note the page shows.
  assert.ok(Math.abs(percent.rows[0].payment - fixed.rows[0].payment) < 0.005);
  assert.ok(percent.months > fixed.months);
});

test("an extra every month saves months and interest, and both are reported", () => {
  const comparison = card({ extraPayment: 40 });
  const { minimumOnly, withExtra } = comparison;

  assert.ok(withExtra.months < minimumOnly.months);
  assert.ok(withExtra.totalInterest < minimumOnly.totalInterest);
  assert.equal(comparison.monthsSaved, minimumOnly.months - withExtra.months);
  assert.ok(Math.abs(comparison.interestSaved - (minimumOnly.totalInterest - withExtra.totalInterest)) < 0.005);
  // Paying more per month has to cost less in total, or the comparison the page
  // is built around would be pointing the wrong way.
  assert.ok(withExtra.totalPaid < minimumOnly.totalPaid);
  // An extra of zero is the same schedule, not a second one that drifts.
  const none = card({ extraPayment: 0 });
  assert.equal(none.withExtra.months, none.minimumOnly.months);
  assert.equal(none.monthsSaved, 0);
});

test("a balance that clears only past a century is reported as such, not dated", () => {
  // A minimum a hair above the interest does clear, eventually. "Eventually"
  // past the twelve hundred instalments the engine builds is not a payoff date,
  // and the page says so instead of dating month 1200. A percentage minimum is
  // the natural way to reach it: 3% of the balance against roughly 2.8% of
  // interest leaves the balance decaying by a fraction of a point a month.
  const { minimumOnly } = card({
    balance: 20000, annualRate: 34, minimumMode: "percent", minimumPercent: 3,
  });
  assert.equal(minimumOnly.rows.length, MAX_MONTHS);
  assert.equal(minimumOnly.neverClears, false);
  assert.equal(minimumOnly.beyondHorizon, true);
  assert.equal(minimumOnly.payoffDate, undefined);
});

test("the balance chart samples both futures on one grid and ends at the payoff", () => {
  const { minimumOnly, withExtra } = card({ extraPayment: 40 });
  const series = balanceSeries(minimumOnly.rows, withExtra.rows);

  assert.ok(series.length > 0);
  assert.ok(series.length <= 12, `${series.length} bars is more than a chart can carry`);
  // The last column is the last month of the longer schedule, closing at zero.
  assert.equal(series.at(-1).date.getTime(), minimumOnly.rows.at(-1).date.getTime());
  assert.ok(series.at(-1).baseline <= 0.005);
  // Where the faster schedule has already ended, its balance is zero rather
  // than missing: that gap is the whole message of the chart.
  assert.equal(series.at(-1).scenario, 0);
  for (let i = 1; i < series.length; i++) {
    assert.ok(series[i].baseline <= series[i - 1].baseline + 0.005, "the balance goes back up");
    assert.ok(series[i].scenario <= series[i - 1].scenario + 0.005);
    assert.ok(series[i].scenario <= series[i].baseline + 0.005, "the extra makes the debt larger");
  }
  assert.deepEqual(balanceSeries([], []), []);
});
