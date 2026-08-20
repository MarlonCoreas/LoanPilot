import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ALL_RULES, citationsFor, currentValue, isssMonthlyCeiling, oldestReviewed, RULES,
  RULE_USAGE,
} from "../app/rules.ts";
import { OFFICIAL } from "../app/sources.ts";
import {
  calculatePayrollWithholding, calculateRecalculation, calculateSettlement,
  DAILY_MINIMUM_WAGE, DECEMBER_RECALC_TABLE, estimateAccumulated, JUNE_RECALC_TABLE,
  MINIMUM_WAGE_TABLES, PAYSLIP_TOLERANCE, QUINCENA25, RULES_REVIEWED,
  verifyPayslip, withholdingForTaxable,
} from "../app/statutory.ts";

/** The line of a payslip check, which every test below reaches for by name. */
const lineFor = (check, concept) => check.lines.find((item) => item.concept === concept);

const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

// These assertions restate figures the module already declares, which is
// normally a smell. Here it is the point: every number below is a quotation
// from an official text, and a distracted edit to the module would otherwise
// ship silently because nothing else in the suite pins the values themselves.
// Changing one of these tests means going back to the source named beside it.
test("statutory figures still match the official texts they are quoted from", () => {
  // Executive Decree 12/2025, single sector table, in force since 1 June 2025.
  assert.deepEqual(DAILY_MINIMUM_WAGE, {
    commerce: 13.44, maquila: 13.227, coffee: 10.035, agriculture: 8.96,
  });

  // Labor Code art. 198: 15 days from one year, 19 from three, 21 from ten.
  // Read through a full year of service so the scale is exercised, not restated.
  const aguinaldoFor = (years) => calculateSettlement({
    startDate: `${2026 - years}-10-20`, endDate: "2026-10-20", monthlySalary: 900,
    sector: "commerce", termination: "dismissal",
  }).aguinaldoDays;
  assert.equal(aguinaldoFor(1), 15);
  assert.equal(aguinaldoFor(2), 15);
  assert.equal(aguinaldoFor(3), 19);
  assert.equal(aguinaldoFor(9), 19);
  assert.equal(aguinaldoFor(10), 21);

  // Labor Code art. 177: 15 days of vacation plus a 30% surcharge. Isolated by
  // difference so the assertion pins the article and not the proration rule.
  const withPeriod = (periods) => calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-01-01", monthlySalary: 3000,
    sector: "commerce", termination: "dismissal", unusedVacationPeriods: periods, aguinaldoPaid: true,
  });
  assert.equal(withPeriod(1).vacationDays - withPeriod(0).vacationDays, 15);
  assert.equal(round(withPeriod(1).vacation - withPeriod(0).vacation), 1950, "100 daily x 15 days x 1.30");

  // Art. 58 caps the daily base at four daily minimum wages; art. 8 of the
  // Voluntary Resignation Law (Decree 592) caps it at two.
  const capped = (termination) => calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-01-01", monthlySalary: 9000,
    sector: "commerce", termination, aguinaldoPaid: true,
  }).indemnityBaseDaily;
  assert.equal(capped("dismissal"), 53.76, "13.44 x 4");
  assert.equal(capped("resignation"), 26.88, "13.44 x 2");

  // ISSS: 3% of a contributory salary capped at $1,000 a month since 2015.
  // The pension contribution is 7.25% with no maximum base under the Integral
  // Pension System Law, so a high salary must not be capped.
  const high = calculatePayrollWithholding({ gross: 20000, frequency: "monthly" });
  assert.equal(high.isss, 30);
  assert.equal(high.afp, 1450, "7.25% of the whole salary: the previous ceiling was repealed");

  // The ceiling is MONTHLY. It used to be stored as its annualised 12,000 and
  // divided by the pay periods, which is the same arithmetic and the wrong
  // magnitude to read: the figure in the file did not match the figure in the
  // comment beside it, and only the division reconciled them. A monthly gross
  // just over the ceiling must contribute exactly the ceiling's 3%, and a
  // fortnightly one exactly half of that.
  assert.equal(currentValue(isssMonthlyCeiling), 1000);
  assert.equal(calculatePayrollWithholding({ gross: 1000.01, frequency: "monthly" }).isss, 30);
  assert.equal(calculatePayrollWithholding({ gross: 500.01, frequency: "fortnightly" }).isss, 15);
});

// Each figure above is now declared in `app/rules.ts` with its article, its
// official document and the day it was last verified. That the declaration is
// well formed — every rule sourced, dated, ordered and reachable from a page —
// is checked in `tests/rules.test.mjs`, which is what replaced the lone format
// assertion on `RULES_REVIEWED` that used to sit at the end of this test.
test("the module's figures are the ones the rule registry declares", () => {
  assert.equal(RULES_REVIEWED, oldestReviewed(ALL_RULES));
  assert.deepEqual(DAILY_MINIMUM_WAGE, currentValue(RULES.minimumWage));
  assert.deepEqual(JUNE_RECALC_TABLE, currentValue(RULES.recalcTables).june);
  assert.deepEqual(DECEMBER_RECALC_TABLE, currentValue(RULES.recalcTables).december);
  assert.equal(QUINCENA25.salaryCeiling, currentValue(RULES.quincena25SalaryCeiling));
  assert.equal(QUINCENA25.rate, currentValue(RULES.quincena25Rate));
  assert.deepEqual(QUINCENA25.mandatoryFrom, currentValue(RULES.quincena25MandatoryFrom));
  assert.deepEqual(QUINCENA25.exempt, currentValue(RULES.quincena25Exempt));
});

test("2025 monthly withholding bands use the official thresholds and fixed amounts", () => {
  assert.equal(withholdingForTaxable(550, "monthly").amount, 0);
  assert.equal(withholdingForTaxable(550.01, "monthly").amount, 17.67);
  assert.equal(withholdingForTaxable(895.24, "monthly").amount, 52.19);
  assert.equal(withholdingForTaxable(895.25, "monthly").amount, 60);
  assert.equal(withholdingForTaxable(2038.11, "monthly").amount, 288.57);
});

test("payroll withholding deducts employee AFP and capped ISSS before income tax", () => {
  const result = calculatePayrollWithholding({ gross: 1000, frequency: "monthly" });
  assert.equal(result.afp, 72.50);
  assert.equal(result.isss, 30);
  assert.equal(result.taxable, 897.50);
  assert.equal(result.isr, 60.45);
  assert.equal(result.net, 837.05);

  const highSalary = calculatePayrollWithholding({ gross: 4000, frequency: "monthly" });
  assert.equal(highSalary.isss, 30, "ISSS employee contribution is capped at a $1,000 monthly base");
});

test("the $1,600 employee deduction reduces the tax base but not take-home pay directly", () => {
  const result = calculatePayrollWithholding({ gross: 700, frequency: "monthly" });
  assert.equal(result.qualifiesForFixedDeduction, true);
  assert.equal(result.fixedDeduction, 133.33);
  assert.equal(result.taxableBeforeFixedDeduction, 628.25);
  assert.equal(result.taxable, 494.92);
  assert.equal(result.isr, 0);
  assert.equal(result.net, 628.25);
});

test("the $9,100 eligibility limit is measured on the renta obtenida, which the AFP is outside of", () => {
  // Article 29 caps the deduction by "renta obtenida". Article 26 of the
  // pension law makes the compulsory contribution a renta no gravable and
  // article 4 excludes those "del cómputo de la renta obtenida", so the limit
  // is read against the pay less the AFP — and only the AFP. Measuring it on
  // the pay moves the border down to $758 a month; measuring it after the ISSS
  // as well would move it up past $845.
  const inLimit = calculatePayrollWithholding({ gross: 817.61, frequency: "monthly" });
  assert.equal(inLimit.annualPay, 9811.32);
  assert.equal(inLimit.annualIncome, 9100, "the pay less the pension contribution");
  assert.equal(inLimit.qualifiesForFixedDeduction, true, "exactly on the limit is inside it");
  assert.equal(inLimit.fixedDeduction, 133.33);
  const atLimit = calculatePayrollWithholding({ gross: 817.62, frequency: "monthly" });
  assert.equal(atLimit.annualIncome, 9100.11);
  assert.equal(atLimit.qualifiesForFixedDeduction, false, "a cent of renta obtenida over is over");

  // The reader the old reading got wrong: $9,600 of pay is $8,904 of renta
  // obtenida, which is inside the limit and takes the deduction.
  const nearLimit = calculatePayrollWithholding({ gross: 800, frequency: "monthly" });
  assert.equal(nearLimit.annualIncome, 8904);
  assert.equal(nearLimit.qualifiesForFixedDeduction, true);
  assert.equal(nearLimit.fixedDeduction, 133.33);
  assert.equal(nearLimit.taxableBeforeFixedDeduction, 718);
  assert.equal(nearLimit.taxable, 584.67);
  assert.equal(nearLimit.isr, 21.14);

  // Well clear of it, and the deduction is gone.
  const overLimit = calculatePayrollWithholding({ gross: 1000, frequency: "monthly" });
  assert.equal(overLimit.annualIncome, 11130);
  assert.equal(overLimit.qualifiesForFixedDeduction, false);
  assert.equal(overLimit.fixedDeduction, 0);

  const fortnightly = calculatePayrollWithholding({ gross: 408.80, frequency: "fortnightly" });
  assert.equal(fortnightly.qualifiesForFixedDeduction, true);
  assert.equal(fortnightly.fixedDeduction, 66.67);
  const overFortnightly = calculatePayrollWithholding({ gross: 408.81, frequency: "fortnightly" });
  assert.equal(overFortnightly.qualifiesForFixedDeduction, false);

  // Pay with no pension contribution has nothing to exclude, so there the
  // limit does fall on the pay itself.
  const noAfp = calculatePayrollWithholding({ gross: 800, frequency: "monthly", includeAfp: false });
  assert.equal(noAfp.annualIncome, 9600);
  assert.equal(noAfp.qualifiesForFixedDeduction, false);
});

test("the aguinaldo does not contribute, so a December payslip is not priced on the gross", () => {
  // ARTICLE 14 SAYS THE PENSION BASE IS NOT THE GROSS. "No forman parte del
  // Ingreso Base de Cotización" the aguinaldo, occasional bonuses, viáticos,
  // gastos de representación and statutory prestaciones sociales. A December
  // payslip carrying a bonus equal to a month of pay contributes on the salary
  // alone, and charging the rate on the whole gross doubles it.
  const salary = 900;
  const december = calculatePayrollWithholding({
    gross: salary * 2, frequency: "monthly", nonContributoryPay: salary,
  });
  assert.equal(december.contributoryBase, 900);
  assert.equal(december.nonContributoryPay, 900);
  assert.equal(december.afp, 65.25, "7.25% of the salary, not of the gross");

  const onTheGross = calculatePayrollWithholding({ gross: salary * 2, frequency: "monthly" });
  assert.equal(onTheGross.afp, 130.50, "exactly double, which is the defect");
  assert.equal(onTheGross.contributoryBase, 1800, "an ordinary month contributes on all of it");

  // The excluded slice is still pay: it stays in the gross, in the income tax
  // base and in the net. Only the pension base loses it.
  assert.equal(december.gross, 1800);
  assert.equal(december.isss, onTheGross.isss, "the ISSS ceiling is untouched by article 14");
  assert.ok(december.taxableBeforeFixedDeduction > onTheGross.taxableBeforeFixedDeduction,
    "a smaller pension deduction leaves a larger income tax base");
  assert.equal(december.net,
    Math.round((1800 - december.afp - december.isss - december.isr) * 100) / 100);

  // It cannot take more than the gross, however the caller misuses it.
  const silly = calculatePayrollWithholding({
    gross: 900, frequency: "monthly", nonContributoryPay: 5000,
  });
  assert.equal(silly.contributoryBase, 0);
  assert.equal(silly.afp, 0);
});

test("a payslip that got article 14 right is not reported as a discrepancy", () => {
  // THE WORST WAY FOR THE CHECKER TO BE WRONG, because the reader takes its
  // output to human resources. A December payroll contributing on the salary
  // alone is correct, and comparing it against the gross would call it a
  // difference and hand the reader a complaint that is not theirs to make.
  const check = verifyPayslip({
    gross: 1800, frequency: "monthly", nonContributoryPay: 900,
    reported: { afp: 65.25 },
  });
  const afp = check.lines.find((line) => line.concept === "afp");
  assert.equal(afp.status, "match", JSON.stringify(afp.causes));
  assert.equal(check.differences, 0);
});

test("a declared pension contribution beats deriving it, because the bonus is not in the base", () => {
  // THE DEFECT THIS CLOSES. The annual figure the reader is asked for is a TAX
  // figure and includes the year-end bonus, because the excess above the exempt
  // slice is renta gravada. Article 14 keeps the aguinaldo out of the ingreso
  // base de cotización, so multiplying that figure by 7.25% charges a
  // contribution on money that does not contribute: it overstates the AFP,
  // understates the renta obtenida, and hands the flat deduction to somebody
  // over the limit.
  //
  // $750 a month plus a thirty-day bonus is $9,750 of taxable pay. The real
  // contribution is 7.25% of the salary alone.
  const realAfp = Math.round(9000 * 0.0725 * 100) / 100;
  assert.equal(realAfp, 652.50);

  const derived = calculatePayrollWithholding({
    gross: 750, frequency: "monthly", annualGross: 9750,
  });
  assert.equal(derived.annualAfpDeclared, false);
  assert.equal(derived.annualIncome, 9043.12, "7.25% of the bonus as well");

  const declared = calculatePayrollWithholding({
    gross: 750, frequency: "monthly", annualGross: 9750, annualAfp: realAfp,
  });
  assert.equal(declared.annualAfpDeclared, true);
  assert.equal(declared.annualIncome, 9097.50, "the pay less the contribution actually made");
  assert.equal(Math.round((declared.annualIncome - derived.annualIncome) * 100) / 100, 54.38);

  // And the case where the difference is not cosmetic: the two readings put
  // this reader on opposite sides of the $9,100 limit.
  const flipDerived = calculatePayrollWithholding({
    gross: 750.21, frequency: "monthly", annualGross: 9752.73,
  });
  const flipDeclared = calculatePayrollWithholding({
    gross: 750.21, frequency: "monthly", annualGross: 9752.73,
    annualAfp: Math.round(750.21 * 12 * 0.0725 * 100) / 100,
  });
  assert.equal(flipDerived.qualifiesForFixedDeduction, true, "the derivation says yes");
  assert.equal(flipDeclared.qualifiesForFixedDeduction, false, "the real contribution says no");

  // Pay with no pension contribution has nothing to declare and nothing to
  // derive, and a declared figure must not be subtracted twice.
  const noAfp = calculatePayrollWithholding({
    gross: 750, frequency: "monthly", annualGross: 9750, annualAfp: realAfp, includeAfp: false,
  });
  assert.equal(noAfp.annualIncome, 9750);
  assert.equal(noAfp.annualAfpDeclared, false);
});

test("the $1,600 deduction is only applied in band II, the one the decree leaves it out of", () => {
  // Literal e) of Executive Decree 10/2025 exempts band II alone. Bands III and
  // IV displace the article 37 limits by exactly $1,600 ($9,142.86 + 1,600 =
  // $10,742.86 = 895.24 × 12), so applying it again there deducts it twice.
  // Only a declared annual income reaches this: annualising any band III period
  // clears $9,100 on its own.
  const bandThree = calculatePayrollWithholding({ gross: 1500, frequency: "monthly", annualGross: 3000 });
  assert.equal(bandThree.qualifiesForFixedDeduction, true, "$3,000 a year is inside the limit");
  assert.equal(bandThree.bandBeforeFixedDeduction, 3);
  assert.equal(bandThree.fixedDeduction, 0);
  assert.equal(bandThree.taxable, 1361.25);
  assert.equal(bandThree.isr, 153.2);

  // The band is read before the deduction, so band II keeps it even when
  // subtracting it drops the base into band I and the withholding to zero —
  // which is what liquidating the year under article 37 gives.
  const bandTwo = calculatePayrollWithholding({ gross: 700, frequency: "monthly" });
  assert.equal(bandTwo.bandBeforeFixedDeduction, 2);
  assert.equal(bandTwo.fixedDeduction, 133.33);
  assert.equal(bandTwo.band, 1);
  assert.equal(bandTwo.isr, 0);
});

test("the recalculation tables are the ones printed in literal f)", () => {
  // Executive Decree 10/2025, article 1 literal f), numerals 1) and 2). The
  // June figures are the monthly table times six and December's times twelve,
  // which is the relationship the continuity test below leans on.
  assert.deepEqual(JUNE_RECALC_TABLE, [
    { from: 0.01, to: 3300, rate: 0, excess: 0, fixed: 0 },
    { from: 3300.01, to: 5371.44, rate: 0.10, excess: 3300, fixed: 106.20 },
    { from: 5371.45, to: 12228.60, rate: 0.20, excess: 5371.44, fixed: 360 },
    { from: 12228.61, to: null, rate: 0.30, excess: 12228.60, fixed: 1731.42 },
  ]);
  assert.deepEqual(DECEMBER_RECALC_TABLE, [
    { from: 0.01, to: 6600, rate: 0, excess: 0, fixed: 0 },
    { from: 6600.01, to: 10742.86, rate: 0.10, excess: 6600, fixed: 212.12 },
    { from: 10742.87, to: 24457.14, rate: 0.20, excess: 10742.86, fixed: 720 },
    { from: 24457.15, to: null, rate: 0.30, excess: 24457.14, fixed: 3462.86 },
  ]);
});

// The whole point of the mechanism is that the accumulated tables land on the
// same tax the ordinary periods already withheld, so a steady salary should
// settle to nothing extra. Any misreading of the accumulation period — a
// December that covered only the second semester, say — breaks this at once.
test("a steady salary recalculates to what the monthly periods already withheld", () => {
  const monthly = calculatePayrollWithholding({ gross: 1500, frequency: "monthly" });
  assert.equal(monthly.isr, 153.20);

  const june = calculateRecalculation({
    period: "june",
    accumulatedTaxable: monthly.taxableBeforeFixedDeduction * 6,
    accumulatedWithheld: monthly.isr * 5,
  });
  assert.equal(june.settledTax, 919.21, "6 x 153.20 = 919.20, off by a cent of table rounding");
  assert.equal(june.withholding, 153.21, "one more ordinary period, not a correction");
  assert.equal(june.excess, 0);

  const december = calculateRecalculation({
    period: "december",
    accumulatedTaxable: monthly.taxableBeforeFixedDeduction * 12,
    accumulatedWithheld: monthly.isr * 11,
  });
  assert.equal(december.settledTax, 1838.43, "12 x 153.20 = 1838.40");
  assert.equal(december.withholding, 153.23);
});

test("the $1,600 deduction is prorated to the months each recalculation covers", () => {
  // Literal f) names the flat $1,600 for band II of both tables, but the June
  // table is the monthly one scaled by six and the monthly one takes $1,600/12
  // per period. Six months of that is $800; taking the whole $1,600 against a
  // half-year table would leave band II workers over-withheld until December.
  const june = calculateRecalculation({
    period: "june", accumulatedTaxable: 5000, accumulatedWithheld: 0, annualGross: 9000,
  });
  assert.equal(june.qualifiesForFixedDeduction, true);
  assert.equal(june.bandBeforeFixedDeduction, 2);
  assert.equal(june.fixedDeduction, 800);
  assert.equal(june.taxable, 4200);
  assert.equal(june.settledTax, 196.20);

  const december = calculateRecalculation({
    period: "december", accumulatedTaxable: 9000, accumulatedWithheld: 0, annualGross: 9000,
  });
  assert.equal(december.fixedDeduction, 1600, "the annual settlement takes the whole deduction");
  assert.equal(december.taxable, 7400);
  assert.equal(december.settledTax, 292.12);

  // Bands III and IV build the deduction into their limits, here as in the
  // periodic tables, so it must not be subtracted twice.
  const bandThree = calculateRecalculation({
    period: "june", accumulatedTaxable: 8167.50, accumulatedWithheld: 0, annualGross: 9000,
  });
  assert.equal(bandThree.bandBeforeFixedDeduction, 3);
  assert.equal(bandThree.fixedDeduction, 0);
});

test("a negative difference withholds nothing and is not paid back through payroll", () => {
  // "Si la diferencia es negativa no se retendrá valor alguno." Literal i)
  // leaves the worker the annual return or a refund request, so the excess is
  // reported as such and never as money the December payslip returns.
  const overWithheld = calculateRecalculation({
    period: "june", accumulatedTaxable: 8167.50, accumulatedWithheld: 1000,
  });
  assert.equal(overWithheld.settledTax, 919.21);
  assert.equal(overWithheld.withholding, 0);
  assert.equal(overWithheld.excess, 80.79);
});

test("estimating the accumulated figures reproduces the same year, month by month", () => {
  // The interface offers this because almost nobody has the two figures the
  // decree names to hand. It must be the same arithmetic the calculate mode
  // does, multiplied — an estimate that quietly used a different base would
  // disagree with the panel above it on the reader's own salary.
  const monthly = calculatePayrollWithholding({ gross: 1500, frequency: "monthly" });

  const june = estimateAccumulated({ period: "june", monthlySalary: 1500 });
  assert.equal(june.months, 6);
  assert.equal(june.monthlyTaxable, monthly.taxableBeforeFixedDeduction);
  assert.equal(june.monthlyWithholding, monthly.isr);
  assert.equal(june.accumulatedTaxable, round(monthly.taxableBeforeFixedDeduction * 6));
  // FIVE months of withholding against SIX of base. The month being
  // recalculated has not withheld yet — its withholding is the difference the
  // procedure produces — and accumulating six on both sides would report that
  // June withholds nothing from a worker whose salary never moved.
  assert.equal(june.withheldMonths, 5);
  assert.equal(june.accumulatedWithheld, round(monthly.isr * 5));
  assert.equal(june.annualGross, 18000);

  const december = estimateAccumulated({ period: "december", monthlySalary: 1500 });
  assert.equal(december.months, 12);
  assert.equal(december.withheldMonths, 11);
  assert.equal(december.accumulatedTaxable, round(monthly.taxableBeforeFixedDeduction * 12));

  // A flat year recalculates to one more ordinary period, not to a correction:
  // this is the same case the hand-written test above pins, reached through the
  // estimate instead of through two typed figures.
  const settled = calculateRecalculation({
    period: "june",
    accumulatedTaxable: june.accumulatedTaxable,
    accumulatedWithheld: june.accumulatedWithheld,
    annualGross: june.annualGross,
  });
  assert.equal(settled.excess, 0);
  assert.ok(Math.abs(settled.withholding - monthly.isr) <= 0.05,
    `a flat year withholds one ordinary month in June, not ${settled.withholding}`);

  // Switching a contribution off moves the estimate the same way it moves one
  // month, so the two panels cannot drift apart on the same checkbox.
  const noAfp = estimateAccumulated({ period: "june", monthlySalary: 1500, includeAfp: false });
  assert.ok(noAfp.accumulatedTaxable > june.accumulatedTaxable);
});

test("an estimated year can also land on a saldo a favor, and says so", () => {
  // The case a reader is most likely to arrive with and least likely to be
  // told about: withholding stopped mid-year — a raise reversed, a bonus in
  // one month, an employer applying the pre-2025 reading of the deduction —
  // and the accumulated tax comes out below what was already taken. The panel
  // has to report that as an excess and never as a payment.
  const estimated = estimateAccumulated({ period: "december", monthlySalary: 1200 });
  const flat = calculateRecalculation({
    period: "december",
    accumulatedTaxable: estimated.accumulatedTaxable,
    accumulatedWithheld: estimated.accumulatedWithheld,
    annualGross: estimated.annualGross,
  });
  // A flat year still owes December its own month, so the estimate on its own
  // is not the case: the excess needs a year where payroll took more than the
  // annual table asks for.
  assert.ok(flat.withholding > 0 && flat.excess === 0);

  const overWithheld = calculateRecalculation({
    period: "december",
    accumulatedTaxable: estimated.accumulatedTaxable,
    accumulatedWithheld: round(flat.settledTax + 250),
    annualGross: estimated.annualGross,
  });
  assert.equal(overWithheld.settledTax, flat.settledTax, "the base did not move");
  assert.equal(overWithheld.withholding, 0, "a negative difference withholds nothing");
  // The excess is the DIFFERENCE and not the settled tax: reporting the latter
  // would tell the reader they are owed a year of withholding back.
  assert.equal(overWithheld.excess, 250);
});

test("the recalculation accumulates remuneration that was never withheld on", () => {
  // "considerando todas las remuneraciones gravadas acumuladas a dichos meses,
  // hayan sido objeto de retención o no": months below the withholding
  // threshold still enter the base, which is what makes December settle up.
  const untouched = calculateRecalculation({
    period: "december", accumulatedTaxable: 12000, accumulatedWithheld: 0,
  });
  assert.equal(untouched.band, 3);
  assert.equal(untouched.settledTax, 971.43);
  assert.equal(untouched.withholding, 971.43);

  // A worker who changed employers mid-year is not excluded: the last employer
  // runs it over both jobs, so the inputs simply already carry the earlier one.
  const merged = calculateRecalculation({
    period: "december", accumulatedTaxable: 12000, accumulatedWithheld: 400,
  });
  assert.equal(merged.withholding, 571.43);
});

test("contributions can be switched off without disturbing the tax base", () => {
  const noAfp = calculatePayrollWithholding({ gross: 1000, frequency: "monthly", includeAfp: false });
  assert.equal(noAfp.afp, 0);
  assert.equal(noAfp.taxableBeforeFixedDeduction, 970);
  assert.equal(noAfp.net, 1000 - 30 - noAfp.isr);

  const noneAtAll = calculatePayrollWithholding({ gross: 1000, frequency: "monthly", includeAfp: false, includeIsss: false });
  assert.equal(noneAtAll.isss, 0);
  assert.equal(noneAtAll.taxableBeforeFixedDeduction, 1000);
  assert.equal(noneAtAll.net, 1000 - noneAtAll.isr);

  const noDeduction = calculatePayrollWithholding({ gross: 700, frequency: "monthly", applyFixedDeduction: false });
  assert.equal(noDeduction.fixedDeduction, 0);
  assert.equal(noDeduction.qualifiesForFixedDeduction, true, "eligibility is reported even when the deduction is not applied");
  assert.equal(noDeduction.taxable, 628.25);
});

test("fortnightly and weekly tables carry their own thresholds", () => {
  assert.equal(withholdingForTaxable(275, "fortnightly").amount, 0);
  assert.equal(withholdingForTaxable(275.01, "fortnightly").amount, 8.83);
  assert.equal(withholdingForTaxable(447.63, "fortnightly").amount, 30);
  assert.equal(withholdingForTaxable(1019.06, "fortnightly").amount, 144.28);
  assert.equal(withholdingForTaxable(137.5, "weekly").amount, 0);
  assert.equal(withholdingForTaxable(137.51, "weekly").amount, 4.42);
  assert.equal(withholdingForTaxable(223.82, "weekly").amount, 15);
  assert.equal(withholdingForTaxable(509.53, "weekly").amount, 72.14);
  assert.equal(withholdingForTaxable(2038.11, "monthly").band, 4);
  assert.equal(withholdingForTaxable(3000, "monthly").amount, 577.14);
});

test("weekly payroll annualizes 52 pay periods for caps and eligibility", () => {
  const result = calculatePayrollWithholding({ gross: 250, frequency: "weekly" });
  assert.equal(result.isss, 6.92, "the $12,000 annual ISSS ceiling is allocated over 52 weeks");
  assert.equal(result.qualifiesForFixedDeduction, false);
  assert.equal(result.fixedDeduction, 0);
});

test("dismissal severance observes the four-minimum-wage daily cap", () => {
  const result = calculateSettlement({
    startDate: "2025-01-01", endDate: "2026-01-01", monthlySalary: 3000,
    sector: "commerce", termination: "dismissal", aguinaldoPaid: true,
  });
  assert.equal(result.indemnityBaseDaily, 53.76);
  // 365 days of complete year plus the day of departure, which is worked.
  assert.equal(result.serviceDays, 366);
  assert.equal(result.indemnity, 1617.22);
});

test("dismissal severance has a minimum of fifteen salary-base days", () => {
  const result = calculateSettlement({
    startDate: "2026-01-01", endDate: "2026-04-01", monthlySalary: 900,
    sector: "commerce", termination: "dismissal", aguinaldoPaid: true,
  });
  assert.equal(result.indemnity, 450);
});

test("voluntary resignation requires two years and then pays fractions too", () => {
  const eligible = calculateSettlement({
    startDate: "2020-01-01", endDate: "2025-08-10", monthlySalary: 1200,
    sector: "commerce", termination: "resignation", aguinaldoPaid: true,
  });
  assert.equal(eligible.eligibleForResignationBenefit, true);
  assert.equal(eligible.completedYears, 5);
  assert.equal(eligible.indemnityBaseDaily, 26.88);
  // 1,827 days of complete years — two leap days inside them — plus 222 days.
  assert.equal(eligible.serviceDays, 2049);
  assert.equal(eligible.indemnity, 2263.44);

  const ineligible = calculateSettlement({
    startDate: "2025-01-01", endDate: "2026-08-10", monthlySalary: 700,
    sector: "commerce", termination: "resignation", aguinaldoPaid: true,
  });
  assert.equal(ineligible.eligibleForResignationBenefit, false);
  assert.equal(ineligible.indemnity, 0);
});

test("the minimum wage cap uses the table in force on the last day worked", () => {
  const oldest = MINIMUM_WAGE_TABLES[MINIMUM_WAGE_TABLES.length - 1];
  const priced = (endDate) => calculateSettlement({
    startDate: "2019-01-01", endDate, monthlySalary: 5000,
    sector: "commerce", termination: "dismissal", aguinaldoPaid: true,
  });

  const current = priced("2026-06-01");
  assert.equal(current.minimumWageDecree, "D.E. 12/2025");
  assert.equal(current.minimumWagePredatesTables, false);
  assert.equal(current.indemnityBaseDaily, 53.76);

  // Before the oldest table this project has verified, the figure is a stand-in
  // and has to say so rather than pass for the rate of the day.
  const older = priced("2024-03-15");
  assert.equal(older.minimumWagePredatesTables, true);
  assert.equal(older.minimumWageDecree, oldest.decree);
});

test("the Quincena 25 follows Decree 499 and stays out of every other case", () => {
  const settle = (over) => calculateSettlement({
    startDate: "2020-01-01", endDate: "2027-01-20", monthlySalary: 1200,
    sector: "commerce", termination: "dismissal", aguinaldoPaid: true, ...over,
  });

  // Article 3 names termination with employer responsibility and dismissal
  // without legal cause. Resignation is not among them.
  assert.equal(settle({}).quincena25Applies, true);
  assert.equal(settle({ termination: "resignation" }).quincena25, 0);

  // Article 2: only salaries at or below $1,500.
  assert.equal(settle({ monthlySalary: QUINCENA25.salaryCeiling }).quincena25Applies, true);
  assert.equal(settle({ monthlySalary: 1500.01 }).quincena25, 0);

  // Article 6 leaves 2026 voluntary for private employers, so nothing is owed
  // as of right until the general regime starts. January 2026 is inside the
  // article 3 window and still carries nothing, which is the two rules working
  // independently rather than one standing in for the other.
  assert.equal(settle({ endDate: "2026-01-20" }).quincena25, 0);
  assert.equal(settle({ endDate: "2027-01-01" }).quincena25Applies, true);

  // Half a monthly salary, prorated over the cycle worked: 20 days of 2027.
  assert.equal(settle({}).quincena25, round(1200 * 0.5 * 20 / 365));
});

test("article 3 pays inside its window and names the reading that would pay outside", () => {
  // The restrictive reading, decided against the broad one and against the
  // direction article 187 was decided in. Article 3 grants the benefit to
  // someone dismissed "antes del veinticinco de enero o en esa misma fecha",
  // which is the day article 1 makes the payment fall due. See the
  // `quincena25Window` rule for why the asymmetry with 187 is deliberate.
  const settle = (endDate) => calculateSettlement({
    startDate: "2020-01-01", endDate, monthlySalary: 1200,
    sector: "commerce", termination: "dismissal", aguinaldoPaid: true,
  });

  const inside = settle("2027-01-20");
  assert.equal(inside.quincena25Applies, true);
  assert.equal(inside.quincena25OutsideWindow, false);
  assert.ok(inside.quincena25 > 0);
  assert.equal(inside.quincena25Alternative, 0, "nothing to name: the line was paid");

  // The exact edge. The 25th is inside — the article says "o en esa misma
  // fecha" — and the 26th is not.
  assert.equal(settle("2027-01-25").quincena25Applies, true);
  assert.equal(settle("2027-01-26").quincena25Applies, false);
  assert.equal(round(settle("2027-01-25").quincena25), round(1200 * 0.5 * 25 / 365));

  // Outside, the line is zero and the page is told why, with the figure the
  // broad reading would have produced so the note can name it.
  const outside = settle("2027-06-30");
  assert.equal(outside.quincena25Applies, false);
  assert.equal(outside.quincena25, 0);
  assert.equal(outside.quincena25OutsideWindow, true);
  assert.equal(outside.quincena25Alternative, round(1200 * 0.5 * 181 / 365));
  // A case that fails on something other than the date is not "outside the
  // window": there is no alternative reading that would have paid it.
  const resigned = calculateSettlement({
    startDate: "2020-01-01", endDate: "2027-06-30", monthlySalary: 1200,
    sector: "commerce", termination: "resignation", aguinaldoPaid: true,
  });
  assert.equal(resigned.quincena25OutsideWindow, false);
  assert.equal(resigned.quincena25Alternative, 0);

  // The window is cited whenever it decided the answer, in either direction:
  // a document that prints a zero without the article behind it is unarguable.
  assert.ok(inside.appliedRules.includes("quincena25Window"));
  assert.ok(outside.appliedRules.includes("quincena25Window"));
  assert.equal(resigned.appliedRules.includes("quincena25Window"), false);
});

test("Decree 499 puts the two sectors on different timetables", () => {
  // Article 1 opens the general regime "a partir del año dos mil veintisiete"
  // for everyone. Article 6 then splits 2026 in two directions: public servants
  // and municipal employees "gozarán" of the benefit that fiscal year, with
  // institutions ordered to move budget for it, while for private employers the
  // same year's payment "tendrá carácter voluntario".
  //
  // One date could not say both. The single "2027-01-01" that used to be stored
  // was the private half, silently making the same claim about the public one.
  assert.equal(QUINCENA25.mandatoryFrom.private, "2027-01-01");
  assert.equal(QUINCENA25.mandatoryFrom.public, "2026-01-14", "article 9: the day it took effect");
  assert.ok(QUINCENA25.mandatoryFrom.public < QUINCENA25.mandatoryFrom.private);

  // The settlement is Labour Code employment throughout, so it reads the
  // private date and nothing is owed as of right before the general regime.
  const settle = (endDate) => calculateSettlement({
    startDate: "2020-01-01", endDate, monthlySalary: 1200,
    sector: "commerce", termination: "dismissal", aguinaldoPaid: true,
  });
  assert.equal(settle("2026-12-31").quincena25Applies, false);
  assert.equal(settle(QUINCENA25.mandatoryFrom.private).quincena25Applies, true);
});

test("the Quincena 25 carries no withholding and enters no other base", () => {
  // Article 1: paid "de forma íntegra y sin ningún descuento", it "no formará
  // parte de la base de cálculo de otras prestaciones, por lo que no será
  // objeto de ninguna clase de retención", and in no case may it be subject to
  // deduction for social security or pension obligations. Article 4 adds income
  // tax and unattachability.
  assert.deepEqual(QUINCENA25.exempt.withholdings, [], "no deduction of any kind is allowed");
  assert.equal(QUINCENA25.exempt.inBenefitBase, false);
  assert.equal(QUINCENA25.exempt.attachable, false);

  // And the arithmetic holds it there, which is the half a declaration cannot
  // do on its own. In a settlement that DOES carry the benefit, every other
  // line still prices at the ordinary daily salary of $1,200/30 = $40. Folding
  // half a month's pay into the base would take that to $60 and move all of
  // them, so these four assertions fail the moment the benefit leaks into one.
  const settlement = calculateSettlement({
    startDate: "2020-01-01", endDate: "2027-01-20", monthlySalary: 1200,
    sector: "commerce", termination: "dismissal", pendingSalaryDays: 10,
    unusedVacationPeriods: 1,
  });
  assert.ok(settlement.quincena25 > 0, "the case has to carry the benefit to prove anything");
  assert.equal(settlement.dailySalary, 40);
  assert.equal(settlement.indemnityBaseDaily, 40, "under the $53.76 cap, so the salary itself");
  assert.equal(settlement.pendingSalary, 400, "10 days at $40");
  assert.equal(settlement.completeVacation, round(40 * 15 * 1.3));
  assert.equal(settlement.aguinaldo, round(40 * settlement.aguinaldoDays));

  // It reaches the total on its own line, and on no other.
  assert.equal(settlement.total, round(settlement.indemnity + settlement.pendingSalary
    + settlement.vacation + settlement.aguinaldo + settlement.quincena25));
});

test("an end date before the start date yields nothing instead of negative service", () => {
  const result = calculateSettlement({
    startDate: "2026-06-01", endDate: "2026-01-01", monthlySalary: 900,
    sector: "commerce", termination: "dismissal",
  });
  assert.equal(result.invalid, true);
  assert.equal(result.total, 0);
  assert.equal(result.serviceYears, 0);

  const empty = calculateSettlement({
    startDate: "", endDate: "", monthlySalary: 900, sector: "commerce", termination: "dismissal",
  });
  assert.equal(empty.invalid, true);
});

test("service is reported in whole calendar months, not thirtieths of a year", () => {
  const monthsAfter = (endDate) => calculateSettlement({
    startDate: "2021-01-31", endDate, monthlySalary: 900,
    sector: "commerce", termination: "dismissal", aguinaldoPaid: true,
  });

  assert.equal(monthsAfter("2026-01-31").serviceMonths, 0, "on the anniversary itself");
  assert.equal(monthsAfter("2026-02-28").serviceMonths, 0, "february never reaches the 31st");
  assert.equal(monthsAfter("2026-03-02").serviceMonths, 1);
  assert.equal(monthsAfter("2026-03-31").serviceMonths, 2);
  assert.equal(monthsAfter("2026-12-31").serviceMonths, 11, "never rolls over into a twelfth month");

  // The contradiction this field exists to remove: two years all but reached.
  const almostTwo = calculateSettlement({
    startDate: "2026-01-01", endDate: "2027-12-31", monthlySalary: 900,
    sector: "commerce", termination: "resignation", aguinaldoPaid: true,
  });
  assert.equal(almostTwo.completedYears, 1);
  assert.equal(almostTwo.serviceMonths, 11);
  assert.equal(almostTwo.eligibleForResignationBenefit, false);
});

test("a declared annual income overrides annualising a single pay period", () => {
  // $750 a month annualises to $9,000 of pay and qualifies, but a $900 year-end
  // bonus pushes the real renta obtenida over the limit. The field takes the
  // gross figure and the exclusion happens here, so the reader types what they
  // can actually read off their payslips.
  const annualised = calculatePayrollWithholding({ gross: 750, frequency: "monthly" });
  assert.equal(annualised.annualPay, 9000);
  assert.equal(annualised.annualIncome, 8347.50);
  assert.equal(annualised.annualIncomeDeclared, false);
  assert.equal(annualised.qualifiesForFixedDeduction, true);

  const declared = calculatePayrollWithholding({ gross: 750, frequency: "monthly", annualGross: 9900 });
  assert.equal(declared.annualPay, 9900);
  assert.equal(declared.annualIncome, 9182.25);
  assert.equal(declared.annualIncomeDeclared, true);
  assert.equal(declared.qualifiesForFixedDeduction, false);
  assert.equal(declared.fixedDeduction, 0);
  assert.ok(declared.isr > annualised.isr, "losing the deduction raises the withholding");

  // An empty or zero field must not be read as "zero income, so it qualifies".
  for (const annualGross of [0, undefined, Number.NaN]) {
    const blank = calculatePayrollWithholding({ gross: 3000, frequency: "monthly", annualGross });
    assert.equal(blank.annualPay, 36000);
    assert.equal(blank.annualIncome, 33390);
    assert.equal(blank.qualifiesForFixedDeduction, false);
  }
});

test("vacation carries the 30% statutory surcharge over complete and proportional periods", () => {
  const result = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-01-01", monthlySalary: 900,
    sector: "commerce", termination: "dismissal", unusedVacationPeriods: 1, aguinaldoPaid: true,
  });
  assert.equal(result.dailySalary, 30);
  // One complete period plus the single day worked on the anniversary itself.
  assert.equal(round(result.vacationDays), 15.04);
  assert.equal(result.vacation, 586.6);

  const halfway = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-07-02", monthlySalary: 900,
    sector: "commerce", termination: "dismissal", aguinaldoPaid: true,
  });
  assert.ok(Math.abs(halfway.vacationDays - 7.5) < 0.05, `half a year should accrue about 7.5 days, got ${halfway.vacationDays}`);
});

test("reproduces a real MTPS settlement statement to the cent", () => {
  // Voluntary resignation statement issued by the MTPS online service on 9 Dec
  // 2025: 1 Nov 2021 to 24 Dec 2025, $937.54 a month, commerce. The statement
  // reports $1,613.90 for the complete years and $59.65 for the 54 remaining
  // days, $90.16 of proportional vacation, and $21.15 of aguinaldo.
  const result = calculateSettlement({
    startDate: "2021-11-01", endDate: "2025-12-24", monthlySalary: 937.54,
    sector: "commerce", termination: "resignation", aguinaldoPaid: true,
  });
  assert.equal(result.serviceDays, 1515, "1,461 days of complete years plus 54");
  assert.equal(result.indemnityBaseDaily, 26.88, "capped at two daily minimum wages");
  assert.equal(result.indemnity, 1673.55, "1,613.90 + 59.65");
  assert.equal(result.vacation, 90.16);
  // THE BONUS LINE DIVERGES, and it is now compared rather than skipped. The
  // statement prints $21.15; this settlement prints zero, because the applied
  // cycle is the calendar year and the payment discharged it. Under the 12
  // December cycle the same case reproduces $21.15 to the cent — pinned in
  // `tests/aguinaldo.test.mjs`, which can pass the cycle that this entry point
  // cannot.
  //
  // The zero is asserted so the divergence cannot drift unnoticed in either
  // direction: it used to be an uncompared line, which hid both this gap and
  // the settlement bug underneath it — a collected bonus zeroed the whole
  // figure, for every reading, including cases where days were plainly owed.
  //
  // Do not "fix" this by switching the cycle. That is a decision about
  // `aguinaldoCycleStart`, it moves every proportional bonus this suite pins,
  // and it is waiting on a second piece of evidence: this statement is dated
  // December 2025, two months after the reform moved the qualifying date, so
  // the ministry's own tool may simply not have been updated yet.
  assert.equal(result.aguinaldo, 0, "the calendar cycle was discharged by the payment");
});

test("leaving before the cutoff accrues the year-end bonus in proportion to days worked", () => {
  const result = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-03-31", monthlySalary: 900,
    sector: "commerce", termination: "dismissal",
  });
  // 19 days for six years of service, over the 90 days worked in 2026.
  assert.equal(result.aguinaldoDays.toFixed(4), "4.6849");
  assert.equal(result.aguinaldo, 140.55);

  const alreadyPaid = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-03-31", monthlySalary: 900,
    sector: "commerce", termination: "dismissal", aguinaldoPaid: true,
  });
  assert.equal(alreadyPaid.aguinaldo, 0);
});

test("the 2025 October 20 reform grants the full due year-end bonus at the cutoff", () => {
  const result = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-10-20", monthlySalary: 900,
    sector: "commerce", termination: "dismissal", aguinaldoPaid: false,
  });
  assert.equal(result.aguinaldoDays, 19);
  assert.equal(result.aguinaldo, 570);
});

// --- Vacation battery -------------------------------------------------------
//
// The vacation line was audited in August 2026 after the default form — five
// years of service, $900, zero pending periods — reported $1.60. The formula
// turned out to be right and was left untouched; what these cases pin is the
// full shape of it, so the next reader can tell an implausible-looking number
// from a wrong one without re-deriving the units.
//
// Units, once, for the whole block: `dailySalary` is dollars per day
// (salary/30), `fractionDays` is days since the last anniversary counted
// inclusively, and 15 is days of vacation per year of service. The proportional
// part is `15 x fractionDays / 365` days of salary. There is one division by
// 365 in the chain and no year-to-day mixing.

const vacationCase = (overrides) => calculateSettlement({
  sector: "commerce", termination: "dismissal", monthlySalary: 900, aguinaldoPaid: true, ...overrides,
});

test("vacation with under a year of service is the prorated fraction alone", () => {
  // 1 Jan to 1 Jul inclusive is 182 days, so no anniversary has been reached
  // and every vacation day owed is proportional.
  const result = vacationCase({ startDate: "2026-01-01", endDate: "2026-07-01" });
  assert.equal(result.completedYears, 0);
  assert.equal(result.serviceDays, 182);
  assert.equal(result.completeVacationDays, 0);
  assert.equal(result.completeVacation, 0);
  assert.equal(result.proportionalVacationDays.toFixed(6), "7.479452", "15 x 182 / 365");
  assert.equal(result.proportionalVacation, 291.70, "30 daily x 7.479452 days x 1.30");
  assert.equal(result.vacation, 291.70);
});

test("leaving on the anniversary itself accrues a single day of the new period", () => {
  // This is the case that triggered the audit, and it looks wrong until the
  // units are spelled out. Someone hired on 16 Aug 2021 who leaves on 16 Aug
  // 2026 has closed five vacation periods and has started a sixth. The last
  // day worked counts, so the new period is exactly ONE day old:
  //
  //   15 days/year x 1 day / 365 days/year = 0.0410959 days of salary
  //   $30/day x 0.0410959 days x 1.30      = $1.60
  //
  // The $1.60 is not a scaling error. It is the whole answer to "what did the
  // sixth period accrue", and the five closed periods are absent because the
  // caller declared zero of them unpaid — which is what a worker who took
  // their vacation every year should declare.
  const result = vacationCase({ startDate: "2021-08-16", endDate: "2026-08-16", unusedVacationPeriods: 0 });
  assert.equal(result.completedYears, 5);
  assert.equal(result.serviceDays, 1827);
  assert.equal(result.proportionalVacationDays.toFixed(7), "0.0410959");
  assert.equal(result.proportionalVacation, 1.60);
  assert.equal(result.completeVacation, 0);
  assert.equal(result.vacation, 1.60);
});

test("each unpaid complete period adds exactly 15 days of salary plus the 30%", () => {
  const at = (unusedVacationPeriods) => vacationCase({
    startDate: "2021-08-16", endDate: "2026-08-16", unusedVacationPeriods,
  });
  const [none, one, two] = [at(0), at(1), at(2)];

  assert.equal(none.completeVacationDays, 0);
  assert.equal(one.completeVacationDays, 15);
  assert.equal(two.completeVacationDays, 30);
  assert.equal(none.completeVacation, 0);
  assert.equal(one.completeVacation, 585, "30 daily x 15 days x 1.30");
  assert.equal(two.completeVacation, 1170, "twice the same period, not a different rate");

  // The proportional part is independent of how many periods went unpaid.
  for (const result of [none, one, two]) {
    assert.equal(result.proportionalVacation, 1.60);
  }
  assert.equal(round(one.vacation - none.vacation), 585);
  assert.equal(round(two.vacation - one.vacation), 585, "the surcharge does not compound");

  // The reported total is the sum of the two published lines, so a reader
  // adding up what is on screen cannot land a cent away from the headline.
  for (const result of [none, one, two]) {
    assert.equal(result.vacation, round(result.completeVacation + result.proportionalVacation));
    assert.equal(round(result.vacationDays), round(result.completeVacationDays + result.proportionalVacationDays));
  }
});

test("years plus a fraction pay both parts, and the fraction ignores the closed years", () => {
  // 15 Mar 2020 to 30 Sep 2026: six closed periods and 200 days into a seventh.
  const result = vacationCase({
    startDate: "2020-03-15", endDate: "2026-09-30", unusedVacationPeriods: 2,
  });
  assert.equal(result.completedYears, 6);
  assert.equal(result.serviceDays, 2391);
  assert.equal(result.proportionalVacationDays.toFixed(6), "8.219178", "15 x 200 / 365");
  assert.equal(result.proportionalVacation, 320.55);
  assert.equal(result.completeVacation, 1170, "the two periods the caller declared unpaid");
  assert.equal(result.vacation, 1490.55);

  // Six years of service do not enlarge the proportional part: it is measured
  // from the last anniversary, not from the hire date.
  const shorter = vacationCase({
    startDate: "2025-03-15", endDate: "2025-09-30", unusedVacationPeriods: 0,
  });
  assert.equal(shorter.proportionalVacationDays.toFixed(6), "8.219178");
});

test("vacation is identical on dismissal and resignation, and is never capped", () => {
  // Article 58's four-minimum-wage cap and article 8's two-minimum-wage one
  // bound the severance base, not the vacation base: vacation is paid on the
  // real ordinary salary whatever ended the contract.
  const dates = { startDate: "2020-01-01", endDate: "2026-01-01", unusedVacationPeriods: 1 };
  const dismissal = vacationCase({ ...dates, monthlySalary: 9000, termination: "dismissal" });
  const resignation = vacationCase({ ...dates, monthlySalary: 9000, termination: "resignation" });

  assert.equal(dismissal.indemnityBaseDaily, 53.76, "13.44 x 4");
  assert.equal(resignation.indemnityBaseDaily, 26.88, "13.44 x 2");
  assert.equal(dismissal.vacation, resignation.vacation);
  assert.equal(dismissal.completeVacation, resignation.completeVacation);
  assert.equal(dismissal.proportionalVacation, resignation.proportionalVacation);
  // $9,000/30 = $300 a day, ten times the capped severance base of $26.88.
  assert.equal(dismissal.completeVacation, 5850, "300 daily x 15 days x 1.30");
});

test("the severance base sits exactly on the four- and two-minimum-wage caps per sector", () => {
  const baseFor = (monthlySalary, sector, termination) => calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-01-01", monthlySalary, sector, termination, aguinaldoPaid: true,
  }).indemnityBaseDaily;

  // Decree 12/2025 daily rates, times four for dismissal (art. 58) and twice
  // for voluntary resignation (art. 8 of Decree 592). Each sector is probed a
  // dollar of daily salary under the cap, exactly on it, and a dollar over.
  const caps = [
    { sector: "commerce", daily: 13.44 },
    { sector: "maquila", daily: 13.227 },
    { sector: "coffee", daily: 10.035 },
    { sector: "agriculture", daily: 8.96 },
  ];
  for (const { sector, daily } of caps) {
    for (const [termination, multiplier] of [["dismissal", 4], ["resignation", 2]]) {
      const capDaily = round(daily * multiplier);
      const atCap = daily * multiplier * 30;
      assert.equal(baseFor(atCap - 30, sector, termination), round(capDaily - 1),
        `${sector}/${termination}: below the cap the real salary is used`);
      assert.equal(baseFor(atCap, sector, termination), capDaily,
        `${sector}/${termination}: exactly on the cap`);
      assert.equal(baseFor(atCap + 30, sector, termination), capDaily,
        `${sector}/${termination}: above the cap it stops at the cap`);
    }
  }
});

test("the year-end bonus scale window is flagged, not silently resolved", () => {
  // Hired 15 Oct 2023, left 5 Oct 2026. On the last day worked they had two
  // complete years (15-day step); had they stayed ten more days to the cutoff
  // they would have had three (19-day step). The reform does not say which
  // scale an early leaver takes, so the conservative figure is the one paid
  // and the alternative is named beside it.
  const ambiguous = calculateSettlement({
    startDate: "2023-10-15", endDate: "2026-10-05", monthlySalary: 900,
    sector: "commerce", termination: "dismissal",
  });
  assert.equal(ambiguous.completedYears, 2);
  assert.equal(ambiguous.aguinaldoScaleAmbiguous, true);
  assert.equal(ambiguous.aguinaldoScaleDays, 15, "the scale at the last day worked");
  assert.equal(ambiguous.aguinaldoAlternativeScaleDays, 19, "the scale at 20 October");
  // Both readings share the same 278/365 fraction: only the step differs.
  assert.equal(ambiguous.aguinaldoDays.toFixed(4), "11.4247");
  assert.equal(ambiguous.aguinaldo, 342.74, "the figure actually reported");
  assert.equal(ambiguous.aguinaldoAlternativeDays.toFixed(4), "14.4712");
  assert.equal(ambiguous.aguinaldoAlternative, 434.14, "shown only as the alternative");

  // Well clear of any step: six complete years on both dates, so there is
  // nothing to disclose and the alternative fields stay empty.
  const settled = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-10-05", monthlySalary: 900,
    sector: "commerce", termination: "dismissal",
  });
  assert.equal(settled.aguinaldoScaleAmbiguous, false);
  assert.equal(settled.aguinaldoAlternativeScaleDays, 0);
  assert.equal(settled.aguinaldoAlternative, 0);
  assert.equal(settled.aguinaldoDays.toFixed(4), "14.4712", "19 days over 278/365");

  // Past the cutoff the worker did reach the qualifying date, so the scale is
  // read there and nothing is ambiguous. This case is unchanged by the window
  // check: it is the branch that already used the 20 October seniority.
  const afterCutoff = calculateSettlement({
    startDate: "2023-11-01", endDate: "2026-12-15", monthlySalary: 900,
    sector: "commerce", termination: "dismissal",
  });
  assert.equal(afterCutoff.completedYears, 3, "three years on the last day worked");
  assert.equal(afterCutoff.aguinaldoScaleAmbiguous, false);
  assert.equal(afterCutoff.aguinaldoDays, 15, "two years at 20 October, paid in full");
  assert.equal(afterCutoff.aguinaldo, 450);

  // A bonus already paid has no figure to disclose either way.
  const paid = calculateSettlement({
    startDate: "2023-10-15", endDate: "2026-10-05", monthlySalary: 900,
    sector: "commerce", termination: "dismissal", aguinaldoPaid: true,
  });
  assert.equal(paid.aguinaldoScaleAmbiguous, false);
  assert.equal(paid.aguinaldo, 0);
});

// --- What the exported document is allowed to say ---------------------------

test("a settlement cites the rules it applied, and no others", () => {
  // The PDF prints these and only these. The temptation is to cite everything
  // the settlement page could ever use — it is one constant and it never goes
  // stale — but a dismissal that cites the voluntary resignation law is a
  // document making a claim its own arithmetic does not support, and nobody
  // reads a source list closely enough to catch it.
  const dismissal = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-06-30", monthlySalary: 900,
    sector: "commerce", termination: "dismissal",
  });
  for (const id of dismissal.appliedRules) {
    assert.ok(id in RULES, `${id} is cited but is not a rule`);
    assert.ok(RULE_USAGE.settlement.includes(id), `${id} is cited by a page that does not list it`);
  }
  assert.deepEqual([...new Set(dismissal.appliedRules)], dismissal.appliedRules, "an article cited twice");
  assert.ok(dismissal.appliedRules.includes("severanceDaysPerYear"));
  for (const id of ["resignationDaysPerYear", "resignationWageCap", "resignationMinimumService"]) {
    assert.ok(!dismissal.appliedRules.includes(id), `a dismissal must not cite ${id}`);
  }

  const resignation = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-06-30", monthlySalary: 900,
    sector: "commerce", termination: "resignation",
  });
  assert.ok(resignation.appliedRules.includes("resignationDaysPerYear"));
  for (const id of ["severanceDaysPerYear", "severanceMinimumDays", "severanceWageCap"]) {
    assert.ok(!resignation.appliedRules.includes(id), `a resignation must not cite ${id}`);
  }

  // A bonus already paid never opens the article 198 scale, so the document
  // must not claim the scale is what produced its zero.
  const paid = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-06-30", monthlySalary: 900,
    sector: "commerce", termination: "dismissal", aguinaldoPaid: true,
  });
  assert.equal(paid.aguinaldo, 0);
  for (const id of ["aguinaldoScale", "aguinaldoCutoff", "aguinaldoCycleStart"]) {
    assert.ok(!paid.appliedRules.includes(id), `a bonus already paid must not cite ${id}`);
  }

  // Every citation the document will print has to resolve to a live document.
  for (const citation of citationsFor(dismissal.appliedRules, dismissal.endDate)) {
    assert.match(OFFICIAL[citation.source], /^https:\/\//, citation.norm);
  }

  // An invalid case exports nothing, and must not offer a source list for a
  // calculation that did not happen.
  const broken = calculateSettlement({
    startDate: "2026-06-30", endDate: "2020-01-01", monthlySalary: 900,
    sector: "commerce", termination: "dismissal",
  });
  assert.deepEqual(broken.appliedRules, []);
});

test("the settlement says whether the statutory cap bit, rather than implying it", () => {
  // On screen and on paper the capped and the uncapped case look the same —
  // two dollar figures, one smaller than the other — and the reader is left to
  // work out whether that is the cap or just arithmetic. So it is an answer.
  const capped = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-06-30", monthlySalary: 9000,
    sector: "commerce", termination: "dismissal",
  });
  assert.equal(capped.dailySalary, 300, "9,000 / 30");
  assert.equal(capped.capMultiplier, 4);
  assert.equal(capped.sectorDailyMinimumWage, 13.44);
  assert.equal(capped.capDaily, 53.76, "13.44 x 4");
  assert.equal(capped.capApplied, true);
  assert.equal(capped.indemnityBaseDaily, 53.76, "the cap, not the salary");

  const free = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-06-30", monthlySalary: 900,
    sector: "commerce", termination: "resignation",
  });
  assert.equal(free.dailySalary, 30);
  assert.equal(free.capMultiplier, 2, "resignation is capped at two, not four");
  assert.equal(free.capDaily, 26.88);
  assert.equal(free.capApplied, true);

  const under = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-06-30", monthlySalary: 600,
    sector: "commerce", termination: "resignation",
  });
  assert.equal(under.dailySalary, 20);
  assert.equal(under.capApplied, false, "20 is under the 26.88 cap");
  assert.equal(under.indemnityBaseDaily, 20, "the salary is used in full");
});

test("the article 187 divergence is flagged on the cases it actually touches", () => {
  // Article 187 grants the part-year of vacation to dismissal and, read
  // literally, gives someone who resigns only the years already completed. The
  // MTPS pays the fraction on a resignation anyway, and this module follows the
  // ministry — so it has to say where the two readings part company.
  const resignation = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-06-30", monthlySalary: 900,
    sector: "commerce", termination: "resignation",
  });
  assert.ok(resignation.proportionalVacation > 0);
  assert.equal(resignation.proportionalVacationDisputed, true);
  assert.ok(resignation.appliedRules.includes("vacationProportionalOnExit"),
    "the case that diverges has to cite the article it diverges from");

  // A dismissal is squarely inside the literal text: nothing to disclose.
  const dismissal = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-06-30", monthlySalary: 900,
    sector: "commerce", termination: "dismissal",
  });
  assert.ok(dismissal.proportionalVacation > 0);
  assert.equal(dismissal.proportionalVacationDisputed, false);

  // Every valid resignation carries a fraction — the smallest is the single
  // day accrued by leaving on the anniversary itself — so the flag is really
  // "this is a resignation", and it says so on the shortest case there is.
  const oneDay = calculateSettlement({
    startDate: "2020-07-01", endDate: "2026-07-01", monthlySalary: 900,
    sector: "commerce", termination: "resignation",
  });
  assert.equal(round(oneDay.proportionalVacationDays), 0.04, "15 / 365");
  assert.equal(oneDay.proportionalVacationDisputed, true);

  // A case that never calculated has nothing to disclose and nothing to export.
  const broken = calculateSettlement({
    startDate: "2026-07-01", endDate: "2020-07-01", monthlySalary: 900,
    sector: "commerce", termination: "resignation",
  });
  assert.equal(broken.proportionalVacationDisputed, false);

  // The statement the suite reconciles against is itself one of these cases,
  // which is the whole reason the fraction is paid on a resignation at all.
  const mtps = calculateSettlement({
    startDate: "2021-11-01", endDate: "2025-12-24", monthlySalary: 937.54,
    sector: "commerce", termination: "resignation", aguinaldoPaid: true,
  });
  assert.equal(mtps.vacation, 90.16);
  assert.equal(mtps.proportionalVacationDisputed, true);
});

// --- Checking a payslip -----------------------------------------------------
//
// The other mode only has to be right. This one has to be right AND able to say
// where a difference comes from, so the tests below are mostly about the second
// half: that a cause is attached when its arithmetic actually reproduces the
// reported figure, and left off when it does not. A checker that listed every
// thing that can go wrong under every difference would pass a test that only
// looked at the numbers, and would be worth nothing to the person holding the
// payslip.

test("a payslip that matches the tables reports no difference at all", () => {
  const expected = calculatePayrollWithholding({ gross: 1000, frequency: "monthly" });
  const check = verifyPayslip({
    gross: 1000, frequency: "monthly",
    reported: { afp: expected.afp, isss: expected.isss, isr: expected.isr, net: expected.net },
  });
  assert.equal(check.compared, 4);
  assert.equal(check.differences, 0);
  for (const line of check.lines) {
    assert.equal(line.status, "match", line.concept);
    assert.deepEqual(line.causes, [], line.concept);
  }
});

test("an empty field is not compared, and a zero is a finding", () => {
  // They are opposite claims: "I do not have this figure" must not be scored,
  // while "the payslip deducted nothing" is one of the differences worth
  // finding. Collapsing both into 0 would silently accuse every payslip that
  // does not itemise its pension line.
  const check = verifyPayslip({
    gross: 1000, frequency: "monthly", reported: { afp: null, isss: 0 },
  });
  assert.equal(check.compared, 1);
  const afp = lineFor(check, "afp");
  assert.equal(afp.status, "unchecked");
  assert.equal(afp.reported, null);
  assert.deepEqual(afp.causes, []);
  assert.ok(afp.expected > 0, "the expected figure is still shown beside the blank");

  const isss = lineFor(check, "isss");
  assert.equal(isss.status, "lower");
  assert.deepEqual(isss.causes.map((cause) => cause.id), ["isssNotApplied"]);
});

test("a cent is rounding and two cents is a difference", () => {
  // Both sides have already rounded to cents once, and the two roundings do not
  // have to land on the same side. Reporting that as a finding would bury the
  // real ones.
  assert.equal(PAYSLIP_TOLERANCE, 0.01);
  const expected = calculatePayrollWithholding({ gross: 1000, frequency: "monthly" });
  const at = verifyPayslip({
    gross: 1000, frequency: "monthly", reported: { isr: round(expected.isr + 0.01) },
  });
  assert.equal(lineFor(at, "isr").status, "match");
  assert.equal(lineFor(at, "isr").difference, 0, "inside the tolerance nothing is reported");

  const beyond = verifyPayslip({
    gross: 1000, frequency: "monthly", reported: { isr: round(expected.isr + 0.02) },
  });
  assert.equal(lineFor(beyond, "isr").status, "higher");
  assert.equal(lineFor(beyond, "isr").difference, 0.02);
});

test("an ISSS ceiling that was not applied is named, with the ceiling it should have used", () => {
  const check = verifyPayslip({ gross: 2000, frequency: "monthly", reported: { isss: 60 } });
  const isss = lineFor(check, "isss");
  assert.equal(isss.expected, 30, "3% of the $1,000 monthly ceiling");
  assert.equal(isss.status, "higher");
  const cause = isss.causes.find((item) => item.id === "isssNoCeiling");
  assert.ok(cause, "3% of the whole gross is exactly the ceiling being skipped");
  assert.equal(cause.amount, 1000);
  assert.equal(cause.rule, "isssMonthlyCeiling");
});

test("a pension contribution on another base reports that base rather than a ceiling", () => {
  // The maximum pension base was repealed and this project does not carry the
  // repealed figure, so naming it as the cause would be inventing a number. The
  // base the deduction implies is checkable: the reader can compare it with the
  // pay they entered and recognise a travel allowance or a bonus left out of it.
  const check = verifyPayslip({ gross: 1000, frequency: "monthly", reported: { afp: 58 } });
  const afp = lineFor(check, "afp");
  assert.equal(afp.status, "lower");
  const cause = afp.causes.find((item) => item.id === "afpOtherBase");
  assert.ok(cause);
  assert.equal(cause.amount, 800, "58.00 is 7.25% of 800");
});

test("income tax read on the gross instead of on the base after contributions", () => {
  const onGross = withholdingForTaxable(1000, "monthly").amount;
  const check = verifyPayslip({ gross: 1000, frequency: "monthly", reported: { isr: onGross } });
  const isr = lineFor(check, "isr");
  assert.equal(isr.status, "higher");
  assert.ok(isr.causes.some((item) => item.id === "isrOnGross"));
  assert.ok(!isr.causes.some((item) => item.id === "isrRecalc"),
    "a reading that reproduces the figure rules out the catch-all");
});

test("the pre-2025 reading of the fixed deduction is named as the reading it is", () => {
  // Much of the country's payroll still applies Decree 95/2015, where the tables
  // were said to already contain the $1,600. That is not an error to accuse
  // anyone of; it is the difference this whole calculator exists to explain.
  const expected = calculatePayrollWithholding({ gross: 700, frequency: "monthly" });
  assert.ok(expected.fixedDeduction > 0, "band II, under the $9,100 limit");
  const older = withholdingForTaxable(expected.taxableBeforeFixedDeduction, "monthly").amount;
  const check = verifyPayslip({ gross: 700, frequency: "monthly", reported: { isr: older } });
  const isr = lineFor(check, "isr");
  assert.equal(isr.status, "higher");
  const cause = isr.causes.find((item) => item.id === "isrWithoutFixedDeduction");
  assert.ok(cause);
  assert.equal(cause.rule, "fixedDeduction");
});

test("a Quincena 25 left inside the taxable base explains the extra withholding", () => {
  // Article 1 of Decree 499 bars every kind of retention on the benefit and
  // article 4 keeps it out of "el cómputo de la renta obtenida". A payroll that
  // adds it to the base withholds on money the law does not tax, and the cause
  // is only claimed where that arithmetic lands on the payslip's own figure.
  const expected = calculatePayrollWithholding({ gross: 1200, frequency: "monthly" });
  const inflated = withholdingForTaxable(round(expected.taxable + 600), "monthly").amount;
  const check = verifyPayslip({ gross: 1200, frequency: "monthly", reported: { isr: inflated } });
  const cause = lineFor(check, "isr").causes.find((item) => item.id === "isrQuincena25");
  assert.ok(cause);
  assert.equal(cause.amount, 600, "half of a $1,200 monthly salary");
  assert.equal(cause.rule, "quincena25Exempt");
  assert.ok(check.appliedRules.includes("quincena25Exempt"),
    "the exported document has to cite the rule the explanation rests on");

  // Above the eligibility ceiling there is no benefit to have been included, so
  // the same shape of difference must not be blamed on it.
  const overCeiling = calculatePayrollWithholding({ gross: 1600, frequency: "monthly" });
  const other = verifyPayslip({
    gross: 1600, frequency: "monthly",
    reported: { isr: withholdingForTaxable(round(overCeiling.taxable + 800), "monthly").amount },
  });
  assert.ok(!lineFor(other, "isr").causes.some((item) => item.id === "isrQuincena25"));
});

test("a withholding above the table with nothing else to explain it points at the recalculation", () => {
  const expected = calculatePayrollWithholding({ gross: 1000, frequency: "monthly" });
  const check = verifyPayslip({
    gross: 1000, frequency: "monthly", reported: { isr: round(expected.isr + 45) },
  });
  const cause = lineFor(check, "isr").causes.find((item) => item.id === "isrRecalc");
  assert.ok(cause, "June and December carry the whole catch-up in one payment");
  assert.equal(cause.amount, 45);
  assert.equal(cause.rule, "recalcTables");

  // It is the last resort and never an extra voice beside a reading that fits.
  assert.equal(lineFor(check, "isr").causes.length, 1);
});

test("the payslip is also read against itself, and the residual is reported not guessed", () => {
  // Every deduction matches the tables and $50 of the pay still does not reach
  // the net. A payroll loan, a garnishment, an advance — none of them is
  // modelled here, and the honest answer is the amount, not a diagnosis.
  const expected = calculatePayrollWithholding({ gross: 1000, frequency: "monthly" });
  const check = verifyPayslip({
    gross: 1000, frequency: "monthly",
    reported: {
      afp: expected.afp, isss: expected.isss, isr: expected.isr,
      net: round(expected.net - 50),
    },
  });
  const net = lineFor(check, "net");
  assert.equal(net.status, "lower");
  const cause = net.causes.find((item) => item.id === "netUndisclosed");
  assert.ok(cause);
  assert.equal(cause.amount, 50);
  assert.ok(!net.causes.some((item) => item.id === "netDeductionsDiffer"),
    "the three deductions match, so the net does not differ because of them");
});

test("a net that follows a deduction that differs says so, and leaves no residual", () => {
  const expected = calculatePayrollWithholding({ gross: 2000, frequency: "monthly" });
  const uncapped = 60;
  const check = verifyPayslip({
    gross: 2000, frequency: "monthly",
    reported: {
      afp: expected.afp, isss: uncapped, isr: expected.isr,
      net: round(expected.net - (uncapped - expected.isss)),
    },
  });
  const net = lineFor(check, "net");
  assert.equal(net.status, "lower");
  assert.deepEqual(net.causes.map((item) => item.id), ["netDeductionsDiffer"],
    "the payslip is consistent with itself: nothing is left unaccounted for");
});

test("a check cites the rules it used and not the page's whole list", () => {
  const full = verifyPayslip({ gross: 1000, frequency: "monthly", reported: {} });
  for (const id of ["withholdingTables", "afpEmployeeRate", "isssEmployeeRate",
    "isssMonthlyCeiling", "fixedDeduction", "fixedDeductionIncomeLimit"]) {
    assert.ok(full.appliedRules.includes(id), id);
  }

  // Switch the contributions off and the articles behind them stop being cited:
  // a document that names article 29 under a check that never applied the
  // deduction is making a claim it cannot back.
  const bare = verifyPayslip({
    gross: 1000, frequency: "monthly",
    includeAfp: false, includeIsss: false, applyFixedDeduction: false, reported: {},
  });
  assert.deepEqual(bare.appliedRules, ["withholdingTables"]);

  for (const id of full.appliedRules) assert.ok(id in RULES, `${id} is not a rule`);
  const citations = citationsFor(full.appliedRules, "2026-08-16");
  assert.ok(citations.length > 0);
  for (const citation of citations) assert.ok(citation.source in OFFICIAL, citation.norm);
});

test("every cause the checker can raise has wording behind it in both languages", () => {
  // The identifiers live in the calculation and the sentences live in the page,
  // which is the split the rest of the site uses. The failure it makes possible
  // is a cause that fires and renders as nothing, so the page's dictionaries are
  // read here rather than trusted.
  const source = readFileSync(new URL("../app/StatutoryTools.tsx", import.meta.url), "utf8");
  const causes = [
    "afpNotApplied", "afpApplied", "afpOtherBase",
    "isssNotApplied", "isssApplied", "isssNoCeiling", "isssOtherBase", "isssProration",
    "isrNotApplied", "isrOnGross", "isrWithoutFixedDeduction", "isrWithFixedDeduction",
    "isrQuincena25", "isrRecalc",
    "netDeductionsDiffer", "netUndisclosed", "unexplained",
  ];
  for (const id of causes) {
    // Once in the Spanish dictionary and once in the English one.
    const written = source.split(`${id}:`).length - 1;
    assert.equal(written, 2, `${id} is written ${written} time(s), not once per language`);
  }
});
