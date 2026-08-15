import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePayrollWithholding, calculateRecalculation, calculateSettlement,
  DAILY_MINIMUM_WAGE, DECEMBER_RECALC_TABLE, JUNE_RECALC_TABLE,
  MINIMUM_WAGE_TABLES, QUINCENA25, RULES_REVIEWED, withholdingForTaxable,
} from "../app/statutory.ts";

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
    startDate: "2020-01-01", endDate: "2027-06-30", monthlySalary: 1200,
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
  // as of right until the general regime starts.
  assert.equal(settle({ endDate: "2026-12-31" }).quincena25, 0);
  assert.equal(settle({ endDate: "2027-01-01" }).quincena25Applies, true);

  // Half a monthly salary, prorated over the calendar year the January payment
  // closes: 181 days of 2027 worked out of 365.
  assert.equal(settle({}).quincena25, round(1200 * 0.5 * 181 / 365));
  // A full year in service takes the whole half salary, never more.
  assert.equal(settle({ endDate: "2027-12-31" }).quincena25, 600);
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
  // The aguinaldo line is deliberately not compared: the MTPS runs its bonus
  // year from 12 December, this module still runs it over the calendar year,
  // and settling that needs the October 2025 reform decree.
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
