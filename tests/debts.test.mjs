import assert from "node:assert/strict";
import test from "node:test";

import { compareDebts, isDebtProblem } from "../app/debts.ts";

/** Three debts of the shape the comparator exists for: a cheap big one and a dear small one. */
const THREE = [
  { balance: 4000, annualRate: 12, minimum: 90 },   // 0: big, cheap
  { balance: 800, annualRate: 36, minimum: 40 },    // 1: small, dear
  { balance: 1500, annualRate: 24, minimum: 60 },   // 2: middling
];

test("the two orders are the two orders, and ties break the way they should", () => {
  const result = compareDebts(THREE, 400);
  assert.equal(isDebtProblem(result), false);
  if (isDebtProblem(result)) return;
  assert.deepEqual(result.avalanche.order, [1, 2, 0], "36%, then 24%, then 12%");
  assert.deepEqual(result.snowball.order, [1, 2, 0], "800, then 1,500, then 4,000");
  assert.equal(result.identical, true, "here the dearest debt is also the smallest");

  // The case that separates them: the dearest debt is the biggest one.
  const crossed = compareDebts([
    { balance: 6000, annualRate: 30, minimum: 150 },
    { balance: 500, annualRate: 10, minimum: 25 },
  ], 400);
  if (isDebtProblem(crossed)) throw new Error("expected a comparison");
  assert.deepEqual(crossed.avalanche.order, [0, 1]);
  assert.deepEqual(crossed.snowball.order, [1, 0]);
  assert.equal(crossed.identical, false);
});

test("paying the dearest first is never more expensive, and the gap is the whole point", () => {
  // THE CLAIM THE PAGE MAKES, checked rather than asserted in prose. It is
  // arithmetic and not an opinion: money aimed at the most expensive balance
  // buys down the most expensive interest.
  const result = compareDebts([
    { balance: 6000, annualRate: 30, minimum: 150 },
    { balance: 500, annualRate: 10, minimum: 25 },
  ], 400);
  if (isDebtProblem(result)) throw new Error("expected a comparison");
  assert.ok(result.avalanche.totalInterest <= result.snowball.totalInterest,
    `${result.avalanche.totalInterest} vs ${result.snowball.totalInterest}`);
  assert.ok(result.interestSaved > 0, "these two orders really do differ");
  assert.equal(result.interestSaved,
    Math.round((result.snowball.totalInterest - result.avalanche.totalInterest) * 100) / 100);

  // And the other half of the trade, which is why the page does not call the
  // second order a mistake: it clears an account sooner.
  assert.ok(result.firstPayoff.snowball <= result.firstPayoff.avalanche,
    `${result.firstPayoff.snowball} vs ${result.firstPayoff.avalanche}`);
});

test("every debt ends, and the payoffs come out in order", () => {
  const result = compareDebts(THREE, 400);
  if (isDebtProblem(result)) throw new Error("expected a comparison");
  for (const plan of [result.avalanche, result.snowball]) {
    assert.equal(plan.stalled, false, plan.strategy);
    assert.equal(plan.payoffs.length, 3, plan.strategy);
    assert.deepEqual(plan.payoffs.map((p) => p.month),
      [...plan.payoffs.map((p) => p.month)].sort((a, b) => a - b), plan.strategy);
    assert.equal(plan.months, plan.payoffs[plan.payoffs.length - 1].month, plan.strategy);
    assert.ok(plan.totalPaid > 6300, `${plan.strategy} pays back more than it borrowed`);
    assert.ok(plan.totalInterest > 0, plan.strategy);
  }
});

test("a bigger budget clears the debts sooner and costs less interest", () => {
  // The sanity check that catches a phase loop losing or double-counting a
  // month: more money each month cannot make the plan longer or dearer.
  const lean = compareDebts(THREE, 250);
  const rich = compareDebts(THREE, 600);
  if (isDebtProblem(lean) || isDebtProblem(rich)) throw new Error("expected comparisons");
  assert.ok(rich.avalanche.months < lean.avalanche.months);
  assert.ok(rich.avalanche.totalInterest < lean.avalanche.totalInterest);
  assert.equal(lean.surplus, 60, "250 less 190 of minimums");
  assert.equal(rich.surplus, 410);
});

test("the surplus rolls forward when a debt is cleared", () => {
  // THE THING A PER-DEBT CALCULATOR CANNOT DO, and the reason this module
  // exists. Once the first debt is gone its minimum joins the surplus, so the
  // rest accelerate. Without the roll-forward the plan would take as long as
  // paying each debt separately with its own share.
  const rolled = compareDebts([
    { balance: 1000, annualRate: 20, minimum: 50 },
    { balance: 1000, annualRate: 20, minimum: 50 },
  ], 300);
  if (isDebtProblem(rolled)) throw new Error("expected a comparison");
  // Two identical debts of $1,000 at $300 a month together: about seven months.
  // Paid one at a time with no roll-forward it would be visibly longer.
  assert.ok(rolled.avalanche.months <= 8, `${rolled.avalanche.months}`);
  assert.equal(rolled.avalanche.payoffs.length, 2);
  assert.ok(rolled.avalanche.payoffs[1].month > rolled.avalanche.payoffs[0].month);
});

test("a budget under the minimums is refused, with the shortfall named", () => {
  const result = compareDebts(THREE, 150);
  assert.equal(isDebtProblem(result), true);
  if (!isDebtProblem(result)) return;
  assert.equal(result.kind, "belowMinimums");
  assert.equal(result.minimums, 190);
  assert.equal(result.missing, 40, "the reader is told how much is missing, not just that it is");
});

test("a minimum that cannot cover its own interest is named as that debt's problem", () => {
  // No ordering fixes this one, so reporting a comparison would answer the
  // wrong question: the fix is a bigger payment on that account.
  const result = compareDebts([
    { balance: 5000, annualRate: 60, minimum: 30 },
    { balance: 500, annualRate: 10, minimum: 25 },
  ], 100);
  assert.equal(isDebtProblem(result), true);
  if (!isDebtProblem(result)) return;
  assert.equal(result.kind, "stalls");
  assert.equal(result.debt, 0);
});

test("one debt is not a comparison, and neither is a blank row", () => {
  assert.deepEqual(compareDebts([{ balance: 1000, annualRate: 20, minimum: 50 }], 200), { kind: "tooFew" });
  assert.deepEqual(compareDebts([], 200), { kind: "tooFew" });
  // Rows the reader started and left empty are dropped, not counted.
  assert.deepEqual(compareDebts([
    { balance: 1000, annualRate: 20, minimum: 50 },
    { balance: 0, annualRate: 0, minimum: 0 },
  ], 200), { kind: "tooFew" });
});

test("only the minimums, with nothing over, is a slow plan and not an error", () => {
  const result = compareDebts(THREE, 190);
  if (isDebtProblem(result)) throw new Error("a budget that meets the minimums is a plan");
  assert.equal(result.surplus, 0);
  assert.equal(result.avalanche.stalled, false);
  assert.ok(result.avalanche.months > 0);
});
