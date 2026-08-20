import assert from "node:assert/strict";
import test from "node:test";

import {
  aguinaldoCutoffFor, aguinaldoPaymentDates, aguinaldoTax, AGUINALDO_TAX_PREVIEW,
  calculateAguinaldo, exemptAmount,
} from "../app/aguinaldo.ts";
import {
  aguinaldoExemptionFor, AGUINALDO_EXEMPTION_HISTORY, citationsFor, currentValue, ruleAt,
  RULES, RULE_USAGE,
} from "../app/rules.ts";
import { OFFICIAL } from "../app/sources.ts";
import { calculateSettlement, withholdingForTaxable } from "../app/statutory.ts";

const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Someone still employed, read at the qualifying date of the year given. */
const atCutoff = (startDate, year = 2026, over = {}) => calculateAguinaldo({
  startDate, endDate: aguinaldoCutoffFor(year), monthlySalary: 900, ...over,
});

test("the qualifying date and the payment window are the 2025 reform's, not the old ones", () => {
  // D.L. 433 moved both: service is read at 20 October and the payment runs to
  // 20 December. Before it, article 200 keyed on 12 December for both.
  assert.equal(aguinaldoCutoffFor(2026), "2026-10-20");
  assert.deepEqual(aguinaldoPaymentDates(2026), { opens: "2026-10-20", closes: "2026-12-20" });
  assert.deepEqual(aguinaldoPaymentDates(2030), { opens: "2030-10-20", closes: "2030-12-20" });
});

test("article 198 pays 15, 19 and 21 days, and the step turns on the exact anniversary", () => {
  // Measured at the cutoff, so every case below has reached the qualifying date
  // and takes its whole step. The pairs are the edges: one day of service
  // either side of each anniversary, which is where an off-by-one would live.
  assert.equal(atCutoff("2025-10-20").days, 15, "exactly one year");
  assert.equal(atCutoff("2023-10-20").days, 19, "exactly three years");
  assert.equal(atCutoff("2016-10-20").days, 21, "exactly ten years");

  // A day short of each anniversary stays on the step below.
  assert.equal(atCutoff("2023-10-21").days, 15, "two years and 364 days");
  assert.equal(atCutoff("2016-10-21").days, 19, "nine years and 364 days");

  // And the middle of each band takes the same figure as its edge.
  assert.equal(atCutoff("2024-06-15").days, 15);
  assert.equal(atCutoff("2020-03-02").days, 19);
  assert.equal(atCutoff("2005-01-01").days, 21);
});

test("under a year the bonus is the share of the cycle actually worked", () => {
  // Hired 1 June 2026 and read at 20 October: 142 days of the cycle, and the
  // 15-day step prorated over them. Not the whole 15 days, which is the
  // mistake the article's "proporcional al tiempo trabajado" exists to stop.
  const partial = atCutoff("2026-06-01");
  assert.equal(partial.completedYears, 0);
  assert.equal(partial.scaleDays, 15);
  assert.equal(round(partial.days), round(15 * 142 / 365));
  assert.equal(partial.amount, round(900 / 30 * 15 * 142 / 365));
  assert.ok(partial.days < 15);

  // Someone hired in the previous year but still short of the anniversary is
  // measured from the start of the cycle, not from their hire date: 293 days
  // of 2026, not the 365 they have been employed.
  const acrossTheYear = atCutoff("2025-10-21");
  assert.equal(acrossTheYear.completedYears, 0);
  assert.equal(round(acrossTheYear.days), round(15 * 293 / 365));
});

test("a bonus already collected settles its own cycle, and only its own", () => {
  // Read at the qualifying date under the applied calendar cycle: the payment
  // covered the cycle this day falls in, so nothing is left.
  const paid = atCutoff("2020-01-01", 2026, { alreadyPaid: true });
  assert.equal(paid.days, 0);
  assert.equal(paid.amount, 0);
  assert.equal(paid.accruesNewCycle, false);
  assert.equal(paid.scaleAmbiguous, false);
  assert.deepEqual(paid.appliedRules, ["dailySalaryDivisor", "accrualYearDays"],
    "a document for a zero must not cite the scale it never read");

  // The same flag under a cycle that reopens BEFORE the payment window closes.
  // The money paid for the cycle that ended on 11 December; the days since the
  // 12th belong to one the payment never touched, and they are still owed.
  const reopened = calculateAguinaldo({
    startDate: "2020-01-01", endDate: "2026-12-24", monthlySalary: 900,
    cycleStart: { month: 12, day: 12 }, alreadyPaid: true,
  });
  assert.equal(reopened.accruesNewCycle, true);
  assert.equal(reopened.cycleStartDate, "2026-12-12");
  assert.ok(reopened.days > 0, "a reopened cycle accrues");
  assert.equal(reopened.scaleDays, 19, "six completed years");
  assert.equal(round(reopened.days), round(19 * 13 / 365), "13 days of the new cycle");
  assert.ok(reopened.appliedRules.includes("aguinaldoCycleStart"),
    "the figure now turns on the cycle, so it has to cite it");
});

test("the MTPS statement's bonus line reconciles, and only on the 12 December cycle", () => {
  // The line the reconciliation used to leave uncompared. Same statement as
  // `tests/statutory.test.mjs`: voluntary resignation, 1 Nov 2021 to 24 Dec
  // 2025, $937.54 a month, bonus already collected in the payment window. The
  // MTPS prints $21.15 for it and this module used to return zero.
  const statement = {
    startDate: "2021-11-01", endDate: "2025-12-24", monthlySalary: 937.54,
    alreadyPaid: true,
  };

  // Nineteen days of scale over the thirteen run from 12 December, on a daily
  // base of 937.54/30. No other whole number of days lands on the printed
  // figure: twelve gives $19.52 and fourteen gives $22.77.
  const december = calculateAguinaldo({ ...statement, cycleStart: { month: 12, day: 12 } });
  assert.equal(december.cycleStartDate, "2025-12-12");
  assert.equal(december.scaleDays, 19);
  assert.equal(december.amount, 21.15, "the aguinaldo line of the official statement");

  // And the applied reading gives zero, because a 1 January cycle is the cycle
  // the payment discharged: there is nothing left of it to accrue. That is the
  // divergence, stated rather than hidden — it is the whole of the evidence
  // recorded on `aguinaldoCycleStart`, and it does not move the value.
  const calendar = calculateAguinaldo(statement);
  assert.equal(calendar.cycleStartDate, "2025-01-01");
  assert.equal(calendar.accruesNewCycle, false);
  assert.equal(calendar.amount, 0);

  // The case discriminates the two readings, which is what makes it evidence.
  // Before the payment branch was split it could not: every candidate cycle
  // ran through `reachedCutoff` and returned the same whole bonus.
  assert.notEqual(december.amount, calendar.amount);
});

test("the two branches read seniority on different days, and say when that matters", () => {
  // Left on 1 October 2026 having started on 15 October 2023: three years at
  // the cutoff, but only two on the day they left. The conservative reading is
  // the figure — crediting the step they never completed would pay for time
  // not worked — and the other one is surfaced rather than discarded.
  const early = calculateAguinaldo({
    startDate: "2023-10-15", endDate: "2026-10-01", monthlySalary: 900,
  });
  assert.equal(early.reachedCutoff, false);
  assert.equal(early.scaleDays, 15, "seniority at the last day worked");
  assert.equal(early.scaleAmbiguous, true);
  assert.equal(early.alternativeScaleDays, 19, "seniority at 20 October");
  assert.ok(early.alternativeAmount > early.amount);

  // Stay two more weeks and the ambiguity disappears: the cutoff was reached,
  // so there is only one day to read the scale at.
  const late = calculateAguinaldo({
    startDate: "2023-10-15", endDate: "2026-10-25", monthlySalary: 900,
  });
  assert.equal(late.reachedCutoff, true);
  assert.equal(late.scaleDays, 19);
  assert.equal(late.scaleAmbiguous, false);
  assert.equal(late.days, 19, "a completed year at the cutoff earns the whole bonus");
});

test("the accrual cycle is a parameter, not a 1 January buried in the arithmetic", () => {
  // The value has not moved and this test does not move it: what it pins is
  // that a caller CAN move it, which is the whole point of the extraction. No
  // article of chapter VII fixes the period, and the rule says so.
  const calendar = atCutoff("2026-01-01");
  const later = calculateAguinaldo({
    startDate: "2026-01-01", endDate: aguinaldoCutoffFor(2026), monthlySalary: 900,
    cycleStart: { month: 2, day: 1 },
  });
  assert.equal(calendar.cycleStartDate, "2026-01-01");
  assert.equal(later.cycleStartDate, "2026-02-01");
  assert.ok(later.days < calendar.days, "a cycle that opens later has fewer days in it");

  // The cutoff moves the same way, which is what prices a pre-2025 case.
  const oldCutoff = calculateAguinaldo({
    startDate: "2023-10-15", endDate: "2024-12-12", monthlySalary: 900,
    cutoff: { month: 12, day: 12 },
  });
  assert.equal(oldCutoff.cutoffDate, "2024-12-12");
  assert.equal(oldCutoff.reachedCutoff, true);
});

test("both readings of the accrual cycle are expressible, including the one that straddles the year", () => {
  // The rule is marked DISPUTED and the live alternative is a cycle that opens
  // on 12 December of the PREVIOUS year. While the cycle day was resolved
  // inside the calendar year of the last day read, that alternative could not
  // be written down at all — the parameter existed and could only ever produce
  // the reading it already applied. This is that gap closed.
  const december = calculateAguinaldo({
    startDate: "2020-01-01", endDate: "2026-06-30", monthlySalary: 900,
    cycleStart: { month: 12, day: 12 },
  });
  assert.equal(december.cycleStartDate, "2025-12-12",
    "the cycle containing 30 June 2026 opened in December 2025");

  // Past the cycle day of its own year, the same parameter resolves forward
  // rather than sticking a year behind: 20 December is inside the cycle that
  // opened eight days earlier.
  const afterTheDay = calculateAguinaldo({
    startDate: "2020-01-01", endDate: "2026-12-20", monthlySalary: 900,
    cycleStart: { month: 12, day: 12 },
  });
  assert.equal(afterTheDay.cycleStartDate, "2026-12-12");

  // And the applied reading is untouched, which is the point of pinning it: a
  // 1 January cycle never steps back, because no last day read is earlier than
  // the January of its own year.
  for (const endDate of ["2026-01-01", "2026-06-30", "2026-12-31"]) {
    const calendar = calculateAguinaldo({
      startDate: "2020-01-01", endDate, monthlySalary: 900,
    });
    assert.equal(calendar.cycleStartDate, `${endDate.slice(0, 4)}-01-01`, endDate);
  }
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
