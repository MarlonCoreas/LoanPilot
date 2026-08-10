import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePayrollWithholding, calculateSettlement, DAILY_MINIMUM_WAGE,
  RULES_REVIEWED, withholdingForTaxable,
} from "../app/statutory.ts";

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

  // Labor Code art. 177: 15 days of vacation plus a 30% surcharge.
  const vacation = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-01-01", monthlySalary: 3000,
    sector: "commerce", termination: "dismissal", unusedVacationPeriods: 1, aguinaldoPaid: true,
  });
  assert.equal(vacation.vacationDays, 15);
  assert.equal(vacation.vacation, 1950, "100 daily x 15 days x 1.30");

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

  assert.match(RULES_REVIEWED, /^\d{4}-\d{2}-\d{2}$/);
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

test("the $9,100 eligibility limit is measured on gross income, not on the base after contributions", () => {
  // Article 29 caps the deduction by "renta obtenida", which article 2 defines
  // as the remuneration received. Measuring it after AFP and ISSS would let
  // salaries of up to roughly $845 a month qualify.
  const inLimit = calculatePayrollWithholding({ gross: 758.33, frequency: "monthly" });
  assert.equal(inLimit.qualifiesForFixedDeduction, true, "$9,099.96 a year is inside the limit");
  assert.equal(inLimit.fixedDeduction, 133.33);
  const atLimit = calculatePayrollWithholding({ gross: 758.34, frequency: "monthly" });
  assert.equal(atLimit.qualifiesForFixedDeduction, false, "$9,100.08 a year is outside it");

  const overLimit = calculatePayrollWithholding({ gross: 800, frequency: "monthly" });
  assert.equal(overLimit.qualifiesForFixedDeduction, false, "$9,600 a year is above the limit even though the taxable base is not");
  assert.equal(overLimit.fixedDeduction, 0);
  assert.equal(overLimit.taxableBeforeFixedDeduction, 718);
  assert.equal(overLimit.taxable, 718);
  assert.equal(overLimit.isr, 34.47);

  const fortnightly = calculatePayrollWithholding({ gross: 379.16, frequency: "fortnightly" });
  assert.equal(fortnightly.qualifiesForFixedDeduction, true);
  assert.equal(fortnightly.fixedDeduction, 66.67);
  const overFortnightly = calculatePayrollWithholding({ gross: 400, frequency: "fortnightly" });
  assert.equal(overFortnightly.qualifiesForFixedDeduction, false);
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
  assert.equal(result.indemnity, 1612.80);
});

test("dismissal severance has a minimum of fifteen salary-base days", () => {
  const result = calculateSettlement({
    startDate: "2026-01-01", endDate: "2026-04-01", monthlySalary: 900,
    sector: "commerce", termination: "dismissal", aguinaldoPaid: true,
  });
  assert.equal(result.indemnity, 450);
});

test("voluntary resignation requires two years and counts completed service years", () => {
  const eligible = calculateSettlement({
    startDate: "2020-01-01", endDate: "2025-08-10", monthlySalary: 1200,
    sector: "commerce", termination: "resignation", aguinaldoPaid: true,
  });
  assert.equal(eligible.eligibleForResignationBenefit, true);
  assert.equal(eligible.completedYears, 5);
  assert.equal(eligible.indemnityBaseDaily, 26.88);
  assert.equal(eligible.indemnity, 2016);

  const ineligible = calculateSettlement({
    startDate: "2025-01-01", endDate: "2026-08-10", monthlySalary: 700,
    sector: "commerce", termination: "resignation", aguinaldoPaid: true,
  });
  assert.equal(ineligible.eligibleForResignationBenefit, false);
  assert.equal(ineligible.indemnity, 0);
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
  // $750 a month annualises to $9,000 and qualifies, but the year-end bonus
  // pushes the real renta obtenida over the limit.
  const annualised = calculatePayrollWithholding({ gross: 750, frequency: "monthly" });
  assert.equal(annualised.annualIncome, 9000);
  assert.equal(annualised.annualIncomeDeclared, false);
  assert.equal(annualised.qualifiesForFixedDeduction, true);

  const declared = calculatePayrollWithholding({ gross: 750, frequency: "monthly", annualGross: 9375 });
  assert.equal(declared.annualIncome, 9375);
  assert.equal(declared.annualIncomeDeclared, true);
  assert.equal(declared.qualifiesForFixedDeduction, false);
  assert.equal(declared.fixedDeduction, 0);
  assert.ok(declared.isr > annualised.isr, "losing the deduction raises the withholding");

  // An empty or zero field must not be read as "zero income, so it qualifies".
  for (const annualGross of [0, undefined, Number.NaN]) {
    const blank = calculatePayrollWithholding({ gross: 3000, frequency: "monthly", annualGross });
    assert.equal(blank.annualIncome, 36000);
    assert.equal(blank.qualifiesForFixedDeduction, false);
  }
});

test("vacation carries the 30% statutory surcharge over complete and proportional periods", () => {
  const result = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-01-01", monthlySalary: 900,
    sector: "commerce", termination: "dismissal", unusedVacationPeriods: 1, aguinaldoPaid: true,
  });
  assert.equal(result.dailySalary, 30);
  assert.equal(result.vacationDays, 15, "an exact anniversary leaves no proportional fraction");
  assert.equal(result.vacation, 585, "15 days of salary plus 30%");

  const halfway = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-07-02", monthlySalary: 900,
    sector: "commerce", termination: "dismissal", aguinaldoPaid: true,
  });
  assert.ok(Math.abs(halfway.vacationDays - 7.5) < 0.05, `half a year should accrue about 7.5 days, got ${halfway.vacationDays}`);
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
