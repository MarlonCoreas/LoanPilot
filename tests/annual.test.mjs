import assert from "node:assert/strict";
import test from "node:test";

import {
  annualTableFor, calculateAnnualReturn, estimateAnnualFromSalary, exerciseClose,
  filingDeadline, MAX_ITEMISED_DEDUCTION, receiptsToClose,
} from "../app/annual.ts";
import { round2 } from "../app/dates.ts";
import { currentValue, recalcTables, RULES } from "../app/rules.ts";
import { applyBands, calculatePayrollWithholding } from "../app/statutory.ts";

const EXERCISE = 2025;
const table = () => annualTableFor(EXERCISE).table;
const tax = (base) => applyBands(base, table()).amount;

/** A year of the same salary, priced the way the payroll would have priced it. */
function flatYear(monthlySalary, months = 12) {
  const monthly = calculatePayrollWithholding({ gross: monthlySalary, frequency: "monthly" });
  return estimateAnnualFromSalary({
    monthlySalary, months, monthlyWithholding: monthly.isr,
  });
}

test("the annual table and the December withholding table are the same function", () => {
  // THE CHECK THAT GATED THIS PAGE. Executive Decree 10/2025 builds its December
  // table out of article 37 with $1,600 already inside bands III and IV, so the
  // two have to agree everywhere once article 37 is evaluated at (base - 1,600).
  // A disagreement means one of the two tables was transcribed wrong, and every
  // figure on two calculators would be wrong with it.
  const december = currentValue(recalcTables).december;
  for (let base = 5000; base <= 60000; base += 1) {
    const band = december.findIndex((b) => b.to === null || base <= b.to) + 1;
    // The engine subtracts the deduction only in band II; bands III and IV carry
    // it in their limits, and band I never withholds.
    const withheld = band === 2
      ? applyBands(Math.max(0, base - 1600), december).amount
      : applyBands(base, december).amount;
    assert.equal(withheld, tax(Math.max(0, base - 1600)), `base ${base}`);
  }
});

test("the equivalence holds at the exact borders of the undisplaced first band", () => {
  // THE STRIP WHERE IT WOULD BREAK. The sweep above steps by whole dollars, and
  // the $1,600 displacement is absent from band I, so between $6,600.01 and
  // $8,200.00 the December table puts the reader in band II while article 37,
  // evaluated $1,600 lower, still has them in band I. Both have to withhold
  // nothing across the whole strip, and the $212.12 step of band II has to
  // appear on the same cent in both — one off-by-a-cent limit in either table
  // would show up here and nowhere else.
  const december = currentValue(recalcTables).december;
  const withheldAt = (base) => {
    const band = december.findIndex((b) => b.to === null || base <= b.to) + 1;
    return band === 2
      ? applyBands(Math.max(0, round2(base - 1600)), december).amount
      : applyBands(base, december).amount;
  };
  const art37At = (base) => tax(Math.max(0, round2(base - 1600)));

  for (const base of [5000, 6599.99, 6600, 6600.01, 8199.99, 8200]) {
    assert.equal(withheldAt(base), 0, `base ${base} withholds nothing`);
    assert.equal(art37At(base), 0, `article 37 at ${base} - 1,600 is exempt`);
  }
  // The first cent that is taxed, and it is the step of band II rather than a
  // slope: both tables jump the whole $212.12 at once.
  assert.equal(withheldAt(8200.01), 212.12);
  assert.equal(art37At(8200.01), 212.12);
  assert.equal(withheldAt(8201), 212.22);
  assert.equal(art37At(8201), 212.22);

  // And the strip swept at the resolution money actually has, plus the two
  // band boundaries above it, so the check does not rest on six points.
  for (let cents = 500000; cents <= 2500000; cents += 1) {
    const base = cents / 100;
    assert.equal(withheldAt(base), art37At(base), `base ${base}`);
  }
});

test("the exempt band is not displaced by the $1,600, and that is the decree's design", () => {
  // Checking the two tables band by band shows the displacement in three places
  // and none in the first: December band I closes at $6,600, not at $8,200.
  // D.L. 293 set the exempt base at $6,600 a year, "equivalente a un ingreso
  // mensual de hasta $550.00", and literal e) of D.E. 10/2025 keeps bands I and
  // II free of the deduction. This test exists so nobody "fixes" it later.
  const december = currentValue(recalcTables).december;
  assert.equal(table()[0].to, 6600);
  assert.equal(december[0].to, 6600);
  assert.notEqual(december[0].to, 8200);
  // And the displacement that IS there, so a change to either table trips this.
  assert.equal(december[1].to - table()[1].to, 1600);
  assert.equal(december[2].from - table()[2].from, 1600);
  assert.equal(december[3].excess - table()[3].excess, 1600);
  for (let band = 0; band < 4; band++) {
    assert.equal(december[band].fixed, table()[band].fixed, `cuota fija del tramo ${band + 1}`);
  }
});

test("a salary above the limit with no receipts owes the tax the tables did not withhold", () => {
  // THE CASE THE PAGE IS NOT ALLOWED TO CALL AN ERROR. The withholding tables
  // hand every band III taxpayer $1,600 of deductions; article 37 grants them
  // only to somebody entitled. At $1,000 a month with nothing spent on medicine
  // or schooling, the gap is 20% of $1,600.
  const year = flatYear(1000);
  const result = calculateAnnualReturn({ exercise: EXERCISE, ...year });

  assert.equal(result.grossPay, 12000);
  assert.equal(result.rentaObtenida, 11130, "the AFP is out of the figure the limit reads");
  assert.equal(result.qualifiesForFixedDeduction, false);
  assert.equal(result.deductions, 0);
  assert.equal(result.taxable, 10770);
  assert.equal(result.tax, 1045.43);
  assert.ok(result.balanceDue > 0, "the balance lands against the reader");
  assert.equal(result.balanceInFavour, 0);
  assert.ok(Math.abs(result.balanceDue - 320) < 0.5, `${result.balanceDue}`);

  // And the actionable half: the receipts that would take it to zero.
  const receipts = receiptsToClose(result);
  assert.equal(receipts.possible, true);
  assert.ok(receipts.needed > 1590 && receipts.needed <= MAX_ITEMISED_DEDUCTION, `${receipts.needed}`);
});

test("receipts are solved against the table, not divided by the marginal rate", () => {
  // An interior solution: the balance is small enough that part of the room
  // closes it. Applying exactly the solved amount lands on zero.
  const input = {
    exercise: EXERCISE, taxableIncome: 12000, afpPaid: 870, isssPaid: 360, withheld: 900,
  };
  const result = calculateAnnualReturn(input);
  const receipts = receiptsToClose(result);
  assert.equal(receipts.closesFully, true);
  assert.ok(receipts.needed > 0 && receipts.needed < MAX_ITEMISED_DEDUCTION, `${receipts.needed}`);

  const closed = calculateAnnualReturn({
    ...input,
    medicalExpenses: Math.min(800, receipts.needed),
    educationExpenses: Math.max(0, receipts.needed - 800),
  });
  assert.ok(Math.abs(closed.balance) <= 0.01, `${closed.balance}`);
  // A dollar less than solved does not close it, which is what makes the figure
  // worth printing rather than a decoration.
  const short = calculateAnnualReturn({
    ...input,
    medicalExpenses: Math.min(800, Math.max(0, receipts.needed - 1)),
    educationExpenses: Math.max(0, receipts.needed - 1 - 800),
  });
  assert.ok(short.balanceDue > 0);
});

test("receipts that fall a few cents short say so rather than rounding it away", () => {
  // A flat year of $1,000 withholds 60.45 twelve times, and twelve rounded
  // months are three cents away from the year's own figure. The full $1,600 of
  // room therefore leaves $0.03 on the table. It is a silly amount of money and
  // it is the honest answer: the page reports the remainder instead of calling
  // it zero, for the same reason it applies no tolerance to article 38.
  const year = flatYear(1000);
  const receipts = receiptsToClose(calculateAnnualReturn({ exercise: EXERCISE, ...year }));
  assert.equal(receipts.needed, MAX_ITEMISED_DEDUCTION);
  assert.equal(receipts.closesFully, false);
  assert.ok(receipts.remaining > 0 && receipts.remaining < 0.10, `${receipts.remaining}`);
});

test("a balance the receipts cannot close reports how far they get", () => {
  // Somebody well into band IV cannot deduct their way out of it, and saying
  // "add $1,600 of receipts" to that reader would be a false promise.
  const year = flatYear(4000);
  const result = calculateAnnualReturn({ exercise: EXERCISE, ...year, withheld: 0 });
  const receipts = receiptsToClose(result);
  assert.equal(receipts.closesFully, false);
  assert.equal(receipts.needed, MAX_ITEMISED_DEDUCTION);
  assert.ok(receipts.remaining > 0);
});

test("a used-up article 33 room is not the same as being under the limit", () => {
  // FOUND IN THE BROWSER. Both cases return `possible: false`, and the page was
  // printing the same sentence for both — telling somebody on $12,000 that the
  // flat deduction of the under-$9,100 branch had been applied to them.
  const year = flatYear(1000);
  const spent = calculateAnnualReturn({
    exercise: EXERCISE, ...year, medicalExpenses: 800, educationExpenses: 800,
  });
  assert.equal(spent.qualifiesForFixedDeduction, false, "this reader is above the limit");
  assert.equal(spent.itemisedDeduction, MAX_ITEMISED_DEDUCTION);
  const receipts = receiptsToClose(spent);
  assert.equal(receipts.possible, false);
  assert.equal(receipts.room, 0, "there is no room left, which is why it is false");

  // The other reason, with room that was never there to begin with.
  const under = calculateAnnualReturn({
    exercise: EXERCISE, taxableIncome: 8000, withheld: 500, afpPaid: 580, isssPaid: 240,
  });
  assert.equal(under.qualifiesForFixedDeduction, true);
  assert.equal(receiptsToClose(under).room, MAX_ITEMISED_DEDUCTION,
    "the room exists on paper and the branch is closed to this reader anyway");
});

test("a part-year of salary is withheld month by month and settles at zero", () => {
  // The most common refund on the site, and nobody did anything wrong: five
  // months at $900 is $4,500 of renta obtenida, under the exempt band once the
  // contributions and the $1,600 come out, but payroll withheld every month.
  const year = flatYear(900, 5);
  const result = calculateAnnualReturn({ exercise: EXERCISE, ...year });

  assert.equal(result.grossPay, 4500);
  assert.equal(result.qualifiesForFixedDeduction, true);
  assert.equal(result.fixedDeduction, 1600);
  assert.equal(result.tax, 0);
  assert.ok(result.withheld > 0, "payroll did withhold");
  assert.equal(result.balanceDue, 0);
  assert.equal(result.balanceInFavour, result.withheld);
  // No receipts to add: below the limit the flat deduction is already in.
  assert.equal(receiptsToClose(result).possible, false);
});

test("the salary that lands exactly on the $9,100 limit liquidates zero", () => {
  const result = calculateAnnualReturn({
    exercise: EXERCISE, taxableIncome: 9100, withheld: 0,
    afpPaid: 9100 * 0.0725, isssPaid: 9100 * 0.03,
  });
  assert.equal(result.qualifiesForFixedDeduction, true);
  assert.equal(result.taxable, 6567.25);
  assert.equal(result.tax, 0, "the whole point of the $1,600 in band II");
});

test("the $9,100 limit is measured on the renta obtenida, so the AFP is out of it", () => {
  // ARTICLE 26 IS AN EXCLUSION, NOT A DEDUCTION, and this is the test that says
  // which. The pension contribution is a renta no gravable, and article 4
  // excludes those "del cómputo de la renta obtenida", so the limit is not read
  // against the pay: it is read against the pay less the AFP. The two readings
  // send different people to different branches of article 29 numeral 7, and
  // the renta imponible is identical in both — which is why nothing but the
  // eligibility can catch a mistake here.
  const pay = (taxableIncome) => calculateAnnualReturn({
    exercise: EXERCISE, taxableIncome, withheld: 0,
    afpPaid: Math.round(taxableIncome * 0.0725 * 100) / 100,
    isssPaid: Math.round(taxableIncome * 0.03 * 100) / 100,
  });

  // The reader the two readings disagree about. On the gross this salary is
  // over the limit and deducts nothing; on the renta obtenida it is under it
  // and takes the flat $1,600, which is $160 of tax at the 10% of band II.
  const disputed = pay(9400);
  assert.equal(disputed.grossPay, 9400);
  assert.equal(disputed.rentaObtenida, 8718.50);
  assert.equal(disputed.qualifiesForFixedDeduction, true);
  assert.equal(disputed.fixedDeduction, 1600);
  assert.equal(disputed.taxable, 6836.50);
  assert.equal(disputed.tax, 235.77);

  // The border itself, which sits at the pay whose renta obtenida is exactly
  // $9,100 — not at $9,100 of pay.
  const atLimit = pay(9811.32);
  assert.equal(atLimit.rentaObtenida, 9100);
  assert.equal(atLimit.qualifiesForFixedDeduction, true);
  const overLimit = pay(9811.33);
  assert.equal(overLimit.rentaObtenida, 9100.01);
  assert.equal(overLimit.qualifiesForFixedDeduction, false, "a cent over is over");
  // The cliff of the law: the same cent of pay costs the whole $1,600.
  assert.equal(Math.round((overLimit.taxable - atLimit.taxable) * 100) / 100, 1600.01);

  // And the ISSS is NOT excluded: no article gives it the article 26 status, so
  // it is still inside the renta obtenida when the limit is read. A reader on
  // the wrong side of the border stays there whatever the health contribution
  // was — the two figures below differ only in the ISSS.
  const noIsss = calculateAnnualReturn({
    exercise: EXERCISE, taxableIncome: 9811.33, withheld: 0, afpPaid: 711.32, isssPaid: 0,
  });
  assert.equal(noIsss.rentaObtenida, 9100.01);
  assert.equal(noIsss.qualifiesForFixedDeduction, false);
});

test("article 38's $60,000 is measured on the same renta obtenida", () => {
  // Both thresholds read one figure, and reading them on different ones is the
  // failure this catches: article 38 says "rentas" and article 29 numeral 7
  // says "renta obtenida", and the AFP is outside both.
  const over = (taxableIncome) => calculateAnnualReturn({
    exercise: EXERCISE, taxableIncome, withheld: 0,
    afpPaid: Math.round(taxableIncome * 0.0725 * 100) / 100, isssPaid: 0,
  }).filing.overThreshold;
  assert.equal(over(64690), false, "$59,999.98 of renta obtenida is under it");
  assert.equal(over(64691), true, "$60,000.90 is over it");
  // Measured on the pay instead, both of these would be over. The threshold is
  // "mayores a", so the exact figure is not over it either.
  const exact = calculateAnnualReturn({
    exercise: EXERCISE, taxableIncome: 60000, withheld: 0, afpPaid: 0, isssPaid: 0,
  });
  assert.equal(exact.rentaObtenida, 60000);
  assert.equal(exact.filing.overThreshold, false);
});

test("article 38 is answered from the figures, with no tolerance of our own", () => {
  const base = { exercise: EXERCISE, taxableIncome: 12000, afpPaid: 870, isssPaid: 360 };

  // A cent of difference is a difference: the text sets no minimum and neither
  // does this. Inventing one would be inventing a rule.
  const offByACent = calculateAnnualReturn({ ...base, withheld: 1045.42 });
  assert.equal(offByACent.balance, 0.01);
  assert.equal(offByACent.filing.mismatch, true);
  assert.equal(offByACent.filing.mustFile, true);

  const exact = calculateAnnualReturn({ ...base, withheld: 1045.43 });
  assert.equal(exact.balance, 0);
  assert.equal(exact.filing.mismatch, false);
  assert.equal(exact.filing.mustFile, false);

  // Nothing withheld at all, and over the $60,000 threshold: the other two.
  assert.equal(calculateAnnualReturn({ ...base, withheld: 0 }).filing.nothingWithheld, true);
  const rich = calculateAnnualReturn({
    exercise: EXERCISE, taxableIncome: 60001, withheld: 0, afpPaid: 0, isssPaid: 0,
  });
  assert.equal(rich.filing.overThreshold, true);
  assert.equal(
    calculateAnnualReturn({ ...base, taxableIncome: 60000, withheld: 0 }).filing.overThreshold,
    false, "the threshold is 'mayores a', not 'iguales o mayores'");
});

test("the bonus excess reaches the return that the withholding tables never taxed", () => {
  // /aguinaldo/ cannot withhold on the excess: no text names the table. The
  // annual return does not need one — article 37 taxes the year, not a pay
  // period — so the excess lands here, and for somebody whose employer withheld
  // nothing on it that shows up as a balance due rather than as a surprise.
  const withBonus = calculateAnnualReturn({
    exercise: EXERCISE, taxableIncome: 12000, withheld: 1045.43, afpPaid: 870, isssPaid: 360,
    bonus: 2000,
  });
  assert.ok(withBonus.bonusExempt > 0, "the standing exemption applies");
  assert.equal(withBonus.bonusTaxable, Math.round((2000 - withBonus.bonusExempt) * 100) / 100);
  assert.equal(withBonus.grossPay, Math.round((12000 + withBonus.bonusTaxable) * 100) / 100);
  assert.equal(withBonus.rentaObtenida, Math.round((withBonus.grossPay - 870) * 100) / 100);
  assert.ok(withBonus.balanceDue > 0, "nothing was withheld on the excess");

  // A bonus under the exempt slice changes nothing at all.
  const small = calculateAnnualReturn({
    exercise: EXERCISE, taxableIncome: 12000, withheld: 1045.43, afpPaid: 870, isssPaid: 360,
    bonus: 100,
  });
  assert.equal(small.bonusTaxable, 0);
  assert.equal(small.balance, 0);
});

test("an exercise the table does not reach is reported, not priced silently", () => {
  // The table in the registry took effect on 8 May 2025. A 2024 return is
  // priced with it only because there is nothing else, and the caller has to be
  // able to say so — the same contract `ruleAt` gives the settlement page.
  assert.equal(annualTableFor(2025).predatesRule, false);
  assert.equal(annualTableFor(2024).predatesRule, true);
  assert.equal(exerciseClose(2025), "2025-12-31");
});

test("the deadline is four months after the exercise closes", () => {
  assert.equal(filingDeadline(2025), "2026-04-30");
  assert.equal(filingDeadline(2026), "2027-04-30");
  // Derived from the rule, so a change to the rule moves the date.
  assert.equal(RULES.annualFilingWindowMonths.versions[0].value, 4);
});

test("a return cites the rules it used and not the page's whole list", () => {
  const under = calculateAnnualReturn({
    exercise: EXERCISE, taxableIncome: 8000, withheld: 0, afpPaid: 580, isssPaid: 240,
  });
  assert.ok(under.appliedRules.includes("fixedDeduction"));
  assert.ok(!under.appliedRules.includes("annualDeductionLimit"));
  assert.ok(!under.appliedRules.includes("aguinaldoTaxExemption"), "no bonus, no bonus citation");

  const over = calculateAnnualReturn({
    exercise: EXERCISE, taxableIncome: 20000, withheld: 0, afpPaid: 1450, isssPaid: 360, bonus: 1500,
  });
  assert.ok(over.appliedRules.includes("annualDeductionLimit"));
  assert.ok(!over.appliedRules.includes("fixedDeduction"));
  assert.ok(over.appliedRules.includes("aguinaldoTaxExemption"));
  for (const id of over.appliedRules) assert.ok(id in RULES, id);
});
