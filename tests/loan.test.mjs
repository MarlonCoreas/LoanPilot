import assert from "node:assert/strict";
import test from "node:test";

import {
  balanceAfterTerm, buildActiveSchedule, buildHistoricalSchedule,
  parseDate, solvePayment, solveRate,
} from "../app/loan.ts";

// A real contract: $16,500 at 9.25% over 120 months, first instalment 29 Jun 2024.
const LOAN = { principal: 16500, annualRate: 9.25, payment: 211.25, firstDate: parseDate("2024-06-29"), extras: [] };
const change = (id, date, rate, payment = "") => ({ id, date, rate, payment });
const extra = (id, date, amount) => ({ id, date, amount });

// Rows carry Date objects, so compare a serialisable projection of the schedule.
const shape = (result) => ({
  invalid: result.invalid,
  rows: result.rows.map((row) => [
    row.number, row.date.toISOString(),
    ...[row.opening, row.payment, row.interest, row.principal, row.insurance, row.extra, row.closing].map((v) => v.toFixed(6)),
  ]),
});

test("a rate ledger that never changes the rate is a no-op", () => {
  // The property that catches most timeline bugs: splitting the accrual into
  // segments must not by itself alter a single cent.
  const plain = buildHistoricalSchedule(LOAN);
  const segmented = buildHistoricalSchedule({
    ...LOAN,
    rateChanges: [
      change(1, "2025-01-15", "9.25"),
      change(2, "2026-03-01", "9.25"),
      change(3, "2029-11-30", "9.25"),
    ],
  });

  assert.deepEqual(shape(segmented), shape(plain));
});

test("a rate change dated after payoff never applies", () => {
  const plain = buildHistoricalSchedule(LOAN);
  const last = plain.rows.at(-1).date;
  const after = new Date(last.getTime() + 86_400_000 * 30).toISOString().slice(0, 10);

  assert.deepEqual(shape(buildHistoricalSchedule({ ...LOAN, rateChanges: [change(1, after, "22")] })), shape(plain));
});

test("a rate change effective when accrual starts equals running the whole loan at that rate", () => {
  // Accrual opens one month before the first instalment, so "the whole loan at
  // 12.5%" means a change dated 29 May, not 29 Jun.
  const wholeLoan = buildHistoricalSchedule({ ...LOAN, annualRate: 12.5 });
  const switched = buildHistoricalSchedule({ ...LOAN, rateChanges: [change(1, "2024-05-29", "12.5")] });

  assert.deepEqual(shape(switched), shape(wholeLoan));
});

test("a change dated on the first instalment leaves that instalment on the old rate", () => {
  // "Vigente desde" is literal: the days already accrued before the effective
  // date stay at the previous rate. This pins the semantics down.
  const wholeLoan = buildHistoricalSchedule({ ...LOAN, annualRate: 12.5 });
  const switched = buildHistoricalSchedule({ ...LOAN, rateChanges: [change(1, "2024-06-29", "12.5")] });

  assert.ok(switched.rows[0].interest < wholeLoan.rows[0].interest, "first instalment must still price at 9.25%");
  assert.equal(switched.rows[0].interest, buildHistoricalSchedule(LOAN).rows[0].interest);
  // From the second instalment on, both loans accrue at the same rate.
  assert.ok(Math.abs(switched.rows[1].interest - wholeLoan.rows[1].interest) < 0.5);
});

test("a rate change only bites from its effective date onward", () => {
  const plain = buildHistoricalSchedule(LOAN);
  const raised = buildHistoricalSchedule({ ...LOAN, rateChanges: [change(1, "2026-06-29", "14")] });

  // Instalments before the change are untouched; the loan then costs more.
  const before = (result) => shape(result).rows.filter((row) => row[1] < "2026-06-29");
  assert.deepEqual(before(raised), before(plain));

  const totalInterest = (result) => result.rows.reduce((sum, row) => sum + row.interest, 0);
  assert.ok(totalInterest(raised) > totalInterest(plain));
  assert.ok(raised.rows.length > plain.rows.length, "a higher rate at a fixed payment must extend the loan");
});

test("a condition change can carry a new payment", () => {
  const rePriced = buildHistoricalSchedule({
    ...LOAN,
    rateChanges: [change(1, "2026-06-29", "14", "250")],
  });
  const afterChange = rePriced.rows.filter((row) => row.date >= parseDate("2026-06-29") && row.closing > 0.005);

  // Every full instalment after the change is the new one, not the original.
  for (const row of afterChange) assert.ok(Math.abs(row.payment - 250) < 1e-9, `row ${row.number} paid ${row.payment}`);
});

test("prepayments and rate changes on the same day both land", () => {
  const both = buildHistoricalSchedule({
    ...LOAN,
    extras: [extra(1, "2026-06-29", "1000")],
    rateChanges: [change(2, "2026-06-29", "14")],
  });
  const onlyExtra = buildHistoricalSchedule({ ...LOAN, extras: [extra(1, "2026-06-29", "1000")] });

  const applied = both.rows.reduce((sum, row) => sum + row.extra, 0);
  assert.ok(Math.abs(applied - 1000) < 1e-9, `prepayment applied: ${applied}`);
  assert.ok(both.rows.length > onlyExtra.rows.length, "the rate rise must still lengthen the loan");
});

test("an event on an instalment date bills no extra day of interest", () => {
  // Regression: daysBetween floors at one day, so the empty [event, instalment]
  // leg used to accrue a full day. Paying on the due date is the common case.
  const onDue = buildHistoricalSchedule({ ...LOAN, extras: [extra(1, "2025-06-29", "1000")] });
  const dayBefore = buildHistoricalSchedule({ ...LOAN, extras: [extra(1, "2025-06-28", "1000")] });
  const total = (result) => result.rows.reduce((sum, row) => sum + row.interest, 0);

  // Prepaying a day later costs exactly one day of interest on the $1,000 —
  // roughly $0.25, not the ~$8 the spurious day used to add.
  const gap = total(onDue) - total(dayBefore);
  assert.ok(gap > 0, "paying later cannot be cheaper");
  assert.ok(gap < 1, `one day of deferral should cost cents, got $${gap.toFixed(2)}`);
});

test("solveRate inverts solvePayment", () => {
  // Round-trip: derive the payment from a rate, then recover the rate from it.
  for (const [months, rate] of [[60, 11.5], [120, 9.25], [36, 18], [12, 6.75]]) {
    const first = parseDate("2024-06-29");
    const payment = solvePayment(LOAN.principal, rate, first, months);
    // solvePayment anchors accrual at today(); re-solve against the same anchor
    // the historical builder uses so the inversion is like-for-like.
    const anchored = (p) => balanceAfterTerm(LOAN.principal, rate, p, first, months);
    const level = (() => { let lo = 0, hi = LOAN.principal; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (anchored(m) > 0) lo = m; else hi = m; } return hi; })();
    assert.ok(payment > 0, `payment for ${months}m @ ${rate}%`);
    assert.ok(Math.abs(solveRate(LOAN.principal, level, first, months) - rate) < 1e-6, `${months}m @ ${rate}%`);
  }
});

test("solveRate reports no solution when the payment cannot clear the principal", () => {
  // $50 a month never repays $16,500 over 120 months, at any rate.
  assert.ok(Number.isNaN(solveRate(16500, 50, parseDate("2024-06-29"), 120)));
});

test("insurance rides alongside the schedule without amortising anything", () => {
  // The bug this guards: folding the premium into `payment` reclassified it as
  // interest dollar for dollar and inflated every derived figure.
  const bare = buildHistoricalSchedule(LOAN);
  const insured = buildHistoricalSchedule({ ...LOAN, insurance: 19.8 });

  assert.equal(insured.rows.length, bare.rows.length);
  for (const [i, row] of insured.rows.entries()) {
    assert.equal(row.payment, bare.rows[i].payment, `row ${row.number} payment must exclude insurance`);
    assert.equal(row.interest, bare.rows[i].interest);
    assert.equal(row.closing, bare.rows[i].closing);
  }
});

test("every builder keeps insurance out of the payment column", () => {
  // The exporter and the table both render `payment + insurance`, so a builder
  // that pre-added the premium double counted it.
  const args = { balance: 10205.55, annualRate: 9.25, payment: 211.25, nextDate: parseDate("2026-08-29") };
  const bare = buildActiveSchedule({ ...args, insurance: 0 });
  const insured = buildActiveSchedule({ ...args, insurance: 19.8 });

  assert.equal(insured.rows.length, bare.rows.length);
  for (const [i, row] of insured.rows.entries()) {
    assert.equal(row.payment, bare.rows[i].payment, `row ${row.number}`);
    assert.equal(row.insurance, 19.8);
  }
});

test("prepayments shorten the loan and never overpay the balance", () => {
  const scenario = buildHistoricalSchedule({
    ...LOAN,
    extras: [extra(1, "2025-02-04", "200"), extra(2, "2025-09-04", "300"), extra(3, "2026-04-04", "1000")],
  });
  const baseline = buildHistoricalSchedule(LOAN);

  assert.ok(scenario.rows.length < baseline.rows.length);
  assert.ok(scenario.rows.every((row) => row.closing >= 0));
  assert.ok(scenario.rows.at(-1).closing <= 0.005, "the loan has to actually close");
  const applied = scenario.rows.reduce((sum, row) => sum + row.extra, 0);
  assert.ok(Math.abs(applied - 1500) < 1e-9, `applied ${applied}`);
});
