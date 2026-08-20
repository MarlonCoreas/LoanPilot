import assert from "node:assert/strict";
import test from "node:test";

import {
  aguinaldoCutoffFor, aguinaldoCycleEndFor, aguinaldoPaymentDates, aguinaldoTax, AGUINALDO_TAX_PREVIEW,
  calculateAguinaldo, exemptAmount,
} from "../app/aguinaldo.ts";
import {
  aguinaldoExemptionFor, AGUINALDO_EXEMPTION_HISTORY, citationsFor, currentValue, ruleAt,
  RULES, RULE_USAGE,
} from "../app/rules.ts";
import { OFFICIAL } from "../app/sources.ts";
import { calculateSettlement, withholdingForTaxable } from "../app/statutory.ts";

const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Someone still employed, read at the CLOSE OF THE CYCLE paid in that year.
 *
 * Not at the qualifying date, which is when the money is handed over and not
 * what the cycle runs to. Reading at 20 October would show 313/365 of a bonus
 * the reader is going to collect whole. Every case below assumes the previous
 * cycle was collected, which is what a still-employed reader answers.
 */
const stillEmployed = (startDate, year = 2026, over = {}) => calculateAguinaldo({
  startDate, endDate: aguinaldoCycleEndFor(year), monthlySalary: 900, alreadyPaid: true, ...over,
});

test("the qualifying date and the payment window are the 2025 reform's, not the old ones", () => {
  // D.L. 433 moved both: service is read at 20 October and the payment runs to
  // 20 December. Before it, article 200 keyed on 12 December for both.
  assert.equal(aguinaldoCutoffFor(2026), "2026-10-20");
  assert.deepEqual(aguinaldoPaymentDates(2026), { opens: "2026-10-20", closes: "2026-12-20" });
  assert.deepEqual(aguinaldoPaymentDates(2030), { opens: "2030-10-20", closes: "2030-12-20" });
});

test("article 198 pays 15, 19 and 21 days, and the step turns on the exact anniversary", () => {
  // Employed for the whole cycle, so every case below takes its whole step: the
  // proportion is 365/365 and the scale is read on 11 December. The pairs are
  // the edges — a day of service either side of each anniversary, which is
  // where an off-by-one would live.
  assert.equal(stillEmployed("2025-12-12").days, 15, "exactly one cycle");
  assert.equal(stillEmployed("2023-12-11").days, 19, "three years on 11 December");
  assert.equal(stillEmployed("2016-12-11").days, 21, "ten years on 11 December");

  // A day short of each anniversary stays on the step below.
  assert.equal(stillEmployed("2023-12-12").days, 15, "two years and 364 days");
  assert.equal(stillEmployed("2016-12-12").days, 19, "nine years and 364 days");

  // And the middle of each band takes the same figure as its edge.
  assert.equal(stillEmployed("2024-06-15").days, 15);
  assert.equal(stillEmployed("2020-03-02").days, 19);
  assert.equal(stillEmployed("2005-01-01").days, 21);
});

test("under a cycle the bonus is the share of it actually worked", () => {
  // Hired 1 June 2026, cycle closing 11 December 2026: 194 days of it, and the
  // 15-day step prorated over them. Not the whole 15 days, which is the mistake
  // the article's "proporcional al tiempo trabajado" exists to stop.
  const partial = stillEmployed("2026-06-01");
  assert.equal(partial.completedYears, 0);
  assert.equal(partial.scaleDays, 15);
  assert.equal(round(partial.days), round(15 * 194 / 365));
  assert.equal(partial.amount, round(900 / 30 * 15 * 194 / 365));
  assert.ok(partial.days < 15);

  // Someone hired before the cycle opened is measured from the CYCLE, not from
  // their hire date: the 365 days of it, not the longer stretch they have been
  // employed. This is what makes the ordinary case pay a whole step.
  const acrossTheYear = stillEmployed("2025-10-21");
  assert.equal(acrossTheYear.completedYears, 1);
  assert.equal(round(acrossTheYear.days), 15);
});

test("the MTPS calculator's own output, reproduced to the cent", () => {
  // THE EVIDENCE THIS MODULE IS BUILT ON. Five cases were run through the
  // ministry's online calculator on 20 August 2026, plus the settlement
  // statement the suite has reconciled against since the start. Each row it
  // returns carries the period it covers, and every one of them reads
  // 12/12/YYYY to 11/12/YYYY — which is how the accrual cycle stopped being a
  // question. Its two rows are why this function returns two figures.
  //
  // These are not derived from anything in this repository. If one of them
  // fails, the model and the ministry have parted company and the model is
  // wrong until somebody re-runs the case and says otherwise.
  const official = [
    // start        end           salary    paid   complete  proportional
    ["2024-12-20", "2025-11-30",  900,     false,     0.00,    426.58],
    ["2021-11-01", "2025-12-24",  937.54,  true,      0.00,     21.15],
    ["2020-01-01", "2026-06-30",  900,     false,   570.00,    313.89],
    ["2023-10-15", "2026-10-05",  900,     false,   450.00,    367.40],
    ["2023-11-01", "2026-12-15",  900,     false,   570.00,      6.25],
    ["2020-01-01", "2026-06-30",  900,     true,      0.00,    313.89],
  ];
  for (const [startDate, endDate, monthlySalary, alreadyPaid, complete, proportional] of official) {
    const where = `${startDate} to ${endDate}${alreadyPaid ? ", collected" : ""}`;
    const bonus = calculateAguinaldo({ startDate, endDate, monthlySalary, alreadyPaid });
    assert.equal(bonus.completeAmount, complete, `${where}: AGUINALDO COMPLETO`);
    assert.equal(bonus.proportionalAmount, proportional, `${where}: AGUINALDO PROPORCIONAL`);
    assert.equal(bonus.amount, round(complete + proportional), `${where}: the total is the sum`);
  }
});

test("a collected bonus settles the closed cycle, and only the closed cycle", () => {
  const shared = { startDate: "2020-01-01", endDate: "2026-06-30", monthlySalary: 900 };

  // Not collected: the cycle that closed on 11 December 2025 is owed whole, and
  // the one that opened on the 12th is owed in proportion. Both at once, which
  // is the case a single figure could not express.
  const unpaid = calculateAguinaldo(shared);
  assert.equal(unpaid.owedClosedCycle, true);
  assert.equal(unpaid.closedCycleStartDate, "2024-12-12");
  assert.equal(unpaid.closedCycleEndDate, "2025-12-11");
  assert.equal(unpaid.completeDays, 19, "a cycle worked end to end earns its whole step");
  assert.equal(round(unpaid.proportionalDays), round(19 * 201 / 365));

  // Collected: the closed cycle goes, the running one stays. The MTPS prints
  // exactly this — $0.00 against AGUINALDO COMPLETO and the proportional line
  // untouched — which is what makes "already paid" a statement about a cycle
  // rather than about a worker.
  const paid = calculateAguinaldo({ ...shared, alreadyPaid: true });
  assert.equal(paid.owedClosedCycle, false);
  assert.equal(paid.completeAmount, 0);
  assert.equal(paid.proportionalAmount, unpaid.proportionalAmount);
});

test("the scale is read on the last day of the period being paid", () => {
  // ONE RULE, TWO PLACES, and the MTPS output separates them. Hired 1 November
  // 2023 and leaving on 15 December 2026: two completed years at the 20 October
  // qualifying date, three by the time the cycle closed on 11 December. The
  // ministry pays $570 for the closed cycle, which is nineteen days — the step
  // at the CYCLE'S CLOSE, not at the qualifying date, which would have paid
  // fifteen and $450.
  const straddling = calculateAguinaldo({
    startDate: "2023-11-01", endDate: "2026-12-15", monthlySalary: 900,
  });
  assert.equal(straddling.completeScaleDays, 19, "the step on 11 December, not on 20 October");
  assert.equal(straddling.completeAmount, 570);

  // And the running cycle's step is read on the last day worked. Hired 15
  // October 2023, leaving 5 October 2026: two years that day, three had they
  // stayed to the qualifying date. The ministry prints $367.40, which is
  // fifteen days over 298, so it does not credit the step nobody reached.
  const early = calculateAguinaldo({
    startDate: "2023-10-15", endDate: "2026-10-05", monthlySalary: 900,
  });
  assert.equal(early.reachedCutoff, false);
  assert.equal(early.scaleDays, 15, "the step on the last day worked");
  assert.equal(early.proportionalAmount, 367.40);

  // The other reading is still named where it differs, because a practice is
  // not a text and article 197 can still be read the other way.
  assert.equal(early.scaleAmbiguous, true);
  assert.equal(early.alternativeScaleDays, 19, "the step at 20 October");
  assert.ok(early.alternativeAmount > early.proportionalAmount);
});

test("the accrual cycle is a parameter, and the calendar year is now the alternative", () => {
  // The value moved to 12 December on the ministry's own output, and the
  // parameter stays because the reading it replaced has to remain producible:
  // a rule whose alternative the code cannot express is a decision with a
  // footnote, whichever way round it is.
  const applied = calculateAguinaldo({
    startDate: "2020-01-01", endDate: "2026-06-30", monthlySalary: 900, alreadyPaid: true,
  });
  assert.equal(applied.cycleStartDate, "2025-12-12");
  assert.equal(applied.proportionalAmount, 313.89);

  const calendar = calculateAguinaldo({
    startDate: "2020-01-01", endDate: "2026-06-30", monthlySalary: 900, alreadyPaid: true,
    cycleStart: { month: 1, day: 1 },
  });
  assert.equal(calendar.cycleStartDate, "2026-01-01");
  assert.equal(calendar.proportionalAmount, 282.66);

  // Twenty days of scale is the whole of the difference between the two, every
  // time, for any departure before the cycle reopens: 12 December to 1 January.
  assert.equal(round(applied.proportionalAmount - calendar.proportionalAmount),
    round(19 * 20 / 365 * 30), "the gap is the twenty days between the two cycle days");

  // The cycle day resolves backwards when it has not come round yet, which is
  // what lets a cycle opening in the previous year be written down at all.
  const afterTheDay = calculateAguinaldo({
    startDate: "2020-01-01", endDate: "2026-12-20", monthlySalary: 900,
  });
  assert.equal(afterTheDay.cycleStartDate, "2026-12-12");
  assert.equal(afterTheDay.closedCycleEndDate, "2026-12-11");

  // The cutoff moves the same way, which is what prices a pre-2025 case.
  const oldCutoff = calculateAguinaldo({
    startDate: "2023-10-15", endDate: "2024-12-12", monthlySalary: 900,
    cutoff: { month: 12, day: 12 },
  });
  assert.equal(oldCutoff.cutoffDate, "2024-12-12");
  assert.equal(oldCutoff.reachedCutoff, true);
});

test("the settlement and the bonus page give the same figure for the same case", () => {
  // The reason the module exists. These were forty lines inside
  // `calculateSettlement`; two copies would have disagreed on exactly the cases
  // above, and would have disagreed silently.
  const cases = [
    { startDate: "2020-01-01", endDate: "2026-10-25" },
    { startDate: "2023-10-15", endDate: "2026-10-01" },
    { startDate: "2026-06-01", endDate: "2026-09-30" },
    { startDate: "2016-10-20", endDate: "2026-12-31" },
    { startDate: "2019-02-28", endDate: "2024-02-29" },
  ];
  for (const shared of cases) {
    const where = `${shared.startDate} -> ${shared.endDate}`;
    const settlement = calculateSettlement({
      ...shared, monthlySalary: 1100, sector: "commerce", termination: "dismissal",
    });
    const bonus = calculateAguinaldo({ ...shared, monthlySalary: 1100 });

    assert.equal(settlement.aguinaldo, bonus.amount, where);
    assert.equal(settlement.aguinaldoDays, bonus.days, where);
    assert.equal(settlement.aguinaldoScaleDays, bonus.scaleDays, where);
    assert.equal(settlement.aguinaldoScaleAmbiguous, bonus.scaleAmbiguous, where);
    assert.equal(settlement.aguinaldoAlternative, bonus.alternativeAmount, where);
  }
});

test("the bonus page cites the rules it applies, and every one of them resolves", () => {
  const ids = RULE_USAGE.aguinaldo;
  assert.ok(ids.length > 0);
  for (const id of ids) assert.ok(id in RULES, id);
  const citations = citationsFor(ids, "2026-10-20");
  assert.ok(citations.length > 0);
  for (const citation of citations) {
    assert.ok(citation.source in OFFICIAL, citation.norm);
    assert.ok(citation.norm.length > 0);
  }
  // The payment deadline is the one figure on that page a reader can act on,
  // so the article behind it has to travel with the document.
  assert.ok(citations.some((citation) => /art\. 200|arts\. 197/.test(citation.norm)));
});

// --- Income tax, which is written and switched off --------------------------

test("the fiscal panel is on, and the page claims the rule it now shows", () => {
  // It was off while the $1,500 of D.L. 432 and the standing article were read
  // as two equal candidates. They are not equals: numeral 16) is permanent and
  // was never repealed, and each decree displaces it for one named fiscal year
  // and expires. With no decree for an exercise the floor governs it, so there
  // is a sourced figure to show and it is shown.
  assert.equal(AGUINALDO_TAX_PREVIEW, true);
  assert.equal(RULE_USAGE.aguinaldo.includes("aguinaldoTaxExemption"), true,
    "a page that prints the exempt slice has to carry that rule's review date");
});

test("a transitory decree governs its own year and expires with it", () => {
  // The failure this guards against is the expensive one: the 2025 decree
  // still exempting $1,500 of a 2027 bonus because nothing told the lookup it
  // had run out. Adding the next decree is one entry with its own `exercise`.
  const rule = RULES.aguinaldoTaxExemption;

  const inside = ruleAt(rule, "2025-12-01");
  assert.deepEqual(inside.version.value, { kind: "amount", amount: 1500 });
  assert.match(inside.version.norm, /D\.L\. 432/);

  for (const date of ["2026-08-17", "2027-01-01", "2030-06-30"]) {
    const after = ruleAt(rule, date);
    assert.equal(after.version.value.kind, "minimumWages", date);
    assert.match(after.version.norm, /numeral 16\)/, date);
  }

  // And the standing floor is what "current" means for a rule like this, which
  // is the half `currentValue` would get wrong by taking versions[0].
  assert.deepEqual(currentValue(rule), { kind: "minimumWages", multiple: 2, sector: "commerce" });
});

test("the exemption resolves by fiscal year, and says whether a decree set it", () => {
  const decreed = aguinaldoExemptionFor(2025);
  assert.equal(decreed.byDecree, true);
  assert.deepEqual(decreed.version.value, { kind: "amount", amount: 1500 });

  const floor = aguinaldoExemptionFor(2026);
  assert.equal(floor.byDecree, false, "no 2026 decree exists as of this writing");
  assert.equal(floor.version.value.kind, "minimumWages");

  // The five-year history the page shows is data, not an adjective in a
  // sentence: every entry names a year, a figure and the decree behind it.
  assert.ok(AGUINALDO_EXEMPTION_HISTORY.length >= 5);
  for (const version of AGUINALDO_EXEMPTION_HISTORY) {
    assert.equal(typeof version.exercise, "number");
    assert.equal(version.value.kind, "amount");
    assert.match(version.norm, /D\.L\. \d+/);
    assert.equal(version.from.slice(0, 4), String(version.exercise),
      "a decree for a fiscal year is passed inside it");
  }
  assert.deepEqual(
    AGUINALDO_EXEMPTION_HISTORY.map((version) => version.exercise),
    [2025, 2024, 2023, 2022, 2021]);
});

test("the withholding on the excess is left uncalculated, on purpose", () => {
  // The second blocker did not move: no text names the table that withholds on
  // a bonus. Called without one, the function reports the base it can source
  // and null where a figure would be a reading dressed as a citation.
  const open = aguinaldoTax({ bonus: 2500, exemption: { kind: "amount", amount: 1500 } });
  assert.equal(open.taxable, 1000);
  assert.equal(open.withheld, null);
  assert.equal(open.net, null);
});

test("both shapes of the exemption resolve to a figure in dollars", () => {
  assert.equal(exemptAmount({ kind: "amount", amount: 1500 }), 1500);
  // Two monthly minimum wages of the commerce sector. The monthly figure is the
  // daily rate times 365/12, which is the conversion the wage decree states.
  const daily = currentValue(RULES.minimumWage).commerce;
  assert.equal(exemptAmount({ kind: "minimumWages", multiple: 2, sector: "commerce" }),
    round(daily * 365 / 12 * 2));
  assert.equal(exemptAmount({ kind: "minimumWages", multiple: 2, sector: "commerce" }), 817.6);
});

test("the exemption is a deductible slice and not a cliff", () => {
  const withhold = (taxable) => withholdingForTaxable(taxable, "monthly").amount;
  const exemption = { kind: "amount", amount: 1500 };

  // Under the limit: nothing taxable, nothing withheld, net is the gross.
  const under = aguinaldoTax({ bonus: 1200, exemption, withhold });
  assert.equal(under.exempt, 1200, "the slice never exceeds the bonus itself");
  assert.equal(under.taxable, 0);
  assert.equal(under.withheld, 0);
  assert.equal(under.net, 1200);

  // A dollar over is taxed on a dollar. Both texts say the surplus is withheld
  // "deduciendo" the exempt figure, so taxing the whole bonus of anyone just
  // over the line would be the expensive way to read it.
  const justOver = aguinaldoTax({ bonus: 1501, exemption, withhold });
  assert.equal(justOver.taxable, 1);
  assert.equal(justOver.withheld, 0, "one dollar is below the first band");

  // A high bonus: $1,000 of taxable base, in band III of the monthly table.
  const high = aguinaldoTax({ bonus: 2500, exemption, withhold });
  assert.equal(high.gross, 2500);
  assert.equal(high.exempt, 1500);
  assert.equal(high.taxable, 1000);
  assert.equal(high.withheld, round(60 + (1000 - 895.24) * 0.2));
  assert.equal(high.net, round(2500 - high.withheld));

  // The standing article gives a smaller slice, so it taxes more of the same
  // bonus. That gap is why neither may be assumed for 2026.
  const standing = aguinaldoTax({
    bonus: 2500, exemption: { kind: "minimumWages", multiple: 2, sector: "commerce" }, withhold,
  });
  assert.equal(standing.taxable, round(2500 - 817.6));
  assert.ok(standing.withheld > high.withheld);
});
