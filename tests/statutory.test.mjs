import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePayrollWithholding, calculateSettlement, withholdingForTaxable,
} from "../app/statutory.ts";

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

test("the 2025 October 20 reform grants the full due year-end bonus at the cutoff", () => {
  const result = calculateSettlement({
    startDate: "2020-01-01", endDate: "2026-10-20", monthlySalary: 900,
    sector: "commerce", termination: "dismissal", aguinaldoPaid: false,
  });
  assert.equal(result.aguinaldoDays, 19);
  assert.equal(result.aguinaldo, 570);
});
