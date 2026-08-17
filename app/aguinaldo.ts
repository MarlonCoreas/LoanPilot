import { calendarService, daysInclusive, isoDate, round2, utcDate } from "./dates.ts";
import {
  accrualYearDays, aguinaldoCutoff, aguinaldoCycleStart, aguinaldoPaymentWindow, aguinaldoScale,
  currentValue, dailySalaryDivisor, minimumWage,
} from "./rules.ts";
import type { AguinaldoExemption, RuleId, YearDay } from "./rules.ts";

/**
 * The year-end bonus, in one place, for the two pages that owe an answer about
 * it.
 *
 * It used to be forty lines in the middle of `calculateSettlement`, which was
 * fine while a settlement was the only place anybody asked. It is not any more:
 * most people who want to know about their aguinaldo are still employed and
 * have no settlement to compute. Two implementations of article 198 would have
 * disagreed on exactly the cases this file spends most of its words on — the
 * asymmetry between the branches, and the window where the scale is ambiguous —
 * and they would have disagreed silently.
 *
 * WHAT SURVIVED THE MOVE UNCHANGED, ON PURPOSE:
 *
 * The two branches read seniority on DIFFERENT DAYS and that is not an
 * oversight. Someone still on the payroll at the qualifying date is read there,
 * because that is the day article 198's scale is measured at. Someone who left
 * on the 5th never reached it, and crediting them a seniority step they never
 * completed would pay for time not worked. Nothing in the reform says which
 * scale that early leaver takes, so the conservative reading is the figure and
 * the other one is surfaced beside it.
 *
 * WHAT CHANGED: the accrual cycle is now a parameter. It used to be a 1 January
 * built into the arithmetic while `aguinaldoCycleStart` recorded, a few files
 * away, that no article fixes it and two readings are in use. The value has not
 * moved — that needs a document, not a refactor — but a caller now passes it,
 * and a reader can see which cycle produced a number.
 *
 * FOR THE NEXT DECISION, NOT ACTED ON HERE. Reformed article 202 carries the
 * same restrictive formula as article 187: it grants the proportional bonus
 * "cuando se declare terminado un contrato de trabajo con responsabilidad para
 * el patrono, o cuando el trabajador fuere despedido de hecho, sin causa legal",
 * and names no other case. This module pays the proportional bonus on a
 * resignation too. For vacation that divergence is at least anchored — an MTPS
 * statement pays the fraction on a resignation and the suite reconciles to the
 * cent against it. The bonus has no such anchor: the statement's aguinaldo line
 * is the one figure the reconciliation leaves uncompared. It is the same shape
 * of question that `quincena25Window` has just been decided in the other
 * direction, and it is recorded here so it is decided rather than inherited.
 */

const DAILY_DIVISOR = currentValue(dailySalaryDivisor);
const YEAR_DAYS = currentValue(accrualYearDays);
const SCALE = currentValue(aguinaldoScale);
const CUTOFF = currentValue(aguinaldoCutoff);
const CYCLE_START = currentValue(aguinaldoCycleStart);
const PAYMENT_WINDOW = currentValue(aguinaldoPaymentWindow);

/**
 * The article 198 scale. Takes COMPLETED years: with service measured in days,
 * 1,095 divides into exactly 3.0 while the third anniversary is a day away.
 */
export function aguinaldoDaysFor(completedYears: number) {
  return SCALE.find((step) => completedYears >= step.fromCompletedYears)!.days;
}

const yearDayIso = (year: number, day: YearDay) =>
  isoDate(new Date(Date.UTC(year, day.month - 1, day.day)));

/** The qualifying date of a given year, which is what a still-employed reader is measured to. */
export function aguinaldoCutoffFor(year: number, cutoff: YearDay = CUTOFF) {
  return yearDayIso(year, cutoff);
}

/** When the employer must hand it over: 20 October to 20 December since the 2025 reform. */
export function aguinaldoPaymentDates(year: number) {
  return {
    opens: yearDayIso(year, PAYMENT_WINDOW.opens),
    closes: yearDayIso(year, PAYMENT_WINDOW.closes),
  };
}

export type AguinaldoResult = ReturnType<typeof calculateAguinaldo>;

export function calculateAguinaldo(input: {
  startDate: string;
  /**
   * The day the entitlement is read at: the last day worked for someone who
   * has left, and the qualifying date of the bonus year for someone still
   * employed — which `aguinaldoCutoffFor` supplies.
   */
  endDate: string;
  monthlySalary: number;
  /** Already collected this cycle: nothing is owed and the scale never opens. */
  alreadyPaid?: boolean;
  /**
   * Where the accrual cycle starts. DISPUTED — passed, never implied.
   *
   * BOTH READINGS ARE EXPRESSIBLE, which they were not. The day used to be
   * resolved inside the calendar year of `endDate`, so a cycle that opens in
   * the PREVIOUS year could not be written down at all — and that rules out the
   * 12 December reading, which is the live alternative. A rule whose
   * alternative the code cannot produce is not in dispute in any way that
   * matters; it is a decision with a footnote attached.
   *
   * It now resolves to the most recent occurrence of this day on or before
   * `endDate`, which is simply "the cycle that contains the last day read".
   * For 1 January that is the same date it always was — the last day read is
   * never earlier than the January of its own year — so no figure moves.
   */
  cycleStart?: YearDay;
  /** The day seniority is read at and by which the bonus is fully earned. */
  cutoff?: YearDay;
}) {
  const start = utcDate(input.startDate);
  const end = utcDate(input.endDate);
  const salary = Math.max(0, input.monthlySalary || 0);
  const dailySalary = salary / DAILY_DIVISOR;

  const cutoffDay = input.cutoff ?? CUTOFF;
  const cycleDay = input.cycleStart ?? CYCLE_START;
  const year = end.getUTCFullYear();
  const cutoff = new Date(Date.UTC(year, cutoffDay.month - 1, cutoffDay.day));
  // The cycle that CONTAINS the last day read: the most recent occurrence of
  // the cycle day on or before it, which steps back a year when that day has
  // not come round yet. A 1 January cycle never steps back; a 12 December one
  // does for most of the year, and that is the whole point of writing it this
  // way rather than pinning the cycle to the calendar year of `endDate`.
  const cycleThisYear = new Date(Date.UTC(year, cycleDay.month - 1, cycleDay.day));
  const cycleOpens = cycleThisYear <= end
    ? cycleThisYear
    : new Date(Date.UTC(year - 1, cycleDay.month - 1, cycleDay.day));
  const workStart = start > cycleOpens ? start : cycleOpens;

  const service = calendarService(start, end);
  const atCutoff = calendarService(start, cutoff);

  /** Share of this cycle worked, 0 to 1, before the scale is applied. */
  let cycleFraction = 0;
  let fraction = 0;
  // Seniority at the LAST DAY READ, which is the scale kept for anyone who
  // never reached the qualifying date. See the asymmetry note at the top.
  let scaleDays = aguinaldoDaysFor(service.completedYears);
  const reachedCutoff = end >= cutoff;

  if (workStart <= end) {
    cycleFraction = daysInclusive(workStart, end) / YEAR_DAYS;
    if (!reachedCutoff) {
      fraction = cycleFraction;
    } else {
      // Past the qualifying date the worker did reach it, so the scale is read
      // there and a completed year earns the whole bonus.
      scaleDays = aguinaldoDaysFor(atCutoff.completedYears);
      fraction = atCutoff.completedYears >= 1
        ? 1
        : daysInclusive(workStart, cutoff) / YEAR_DAYS;
    }
  }

  const days = input.alreadyPaid ? 0 : scaleDays * Math.min(1, fraction);

  // The window where the two readings of the scale disagree: the reader leaves
  // before the qualifying date and would have crossed a step (15 / 19 / 21) had
  // they stayed to it. Only then is there a second figure worth naming, and the
  // interface names it without claiming either one governs. Because the cutoff
  // is later than the departure in this branch, seniority there is never lower,
  // so the alternative is always the larger figure.
  const alternativeScaleDays = aguinaldoDaysFor(atCutoff.completedYears);
  const scaleAmbiguous = !input.alreadyPaid
    && workStart <= end
    && !reachedCutoff
    && alternativeScaleDays !== scaleDays;
  const alternativeDays = scaleAmbiguous ? alternativeScaleDays * Math.min(1, fraction) : 0;

  const unrounded = dailySalary * days;

  const appliedRules: RuleId[] = [
    "dailySalaryDivisor", "accrualYearDays",
    ...(days > 0 ? ["aguinaldoScale", "aguinaldoCutoff", "aguinaldoCycleStart"] as const : []),
    // Only where the two readings actually differ. Citing the divergence on a
    // case it does not touch would put an article in a document as grounds for
    // a figure it had no part in.
    ...(scaleAmbiguous ? ["aguinaldoScaleOnExit"] as const : []),
  ];

  return {
    /** Days of salary earned, after the scale and the proportion. */
    days,
    /** The bonus, rounded the way it is paid. */
    amount: round2(unrounded),
    /**
     * The same figure before rounding. A caller summing this into a larger
     * total needs it: the settlement rounds its total once, at the end, and
     * rounding here first would move that total by a cent on some cases.
     */
    unrounded,
    dailySalary: round2(dailySalary),
    /** The article 198 step applied, and the seniority it was read at. */
    scaleDays,
    completedYears: reachedCutoff ? atCutoff.completedYears : service.completedYears,
    /** Share of the cycle worked, before the scale. Reused by the Quincena 25. */
    cycleFraction,
    fraction,
    reachedCutoff,
    cutoffDate: isoDate(cutoff),
    cycleStartDate: isoDate(cycleOpens),
    /** True only inside the window where the two readings of the scale differ. */
    scaleAmbiguous,
    alternativeScaleDays: scaleAmbiguous ? alternativeScaleDays : 0,
    alternativeDays,
    alternativeAmount: round2(dailySalary * alternativeDays),
    appliedRules,
  };
}

// --- Income tax on the bonus ------------------------------------------------

/**
 * Whether the fiscal panel of `/aguinaldo/` is shown. It is, and only as far as
 * the taxable base.
 *
 * WHAT CHANGED. This was off on the reasoning that the $1,500 of D.L. 432 and
 * the standing article were two candidates with nothing to choose between them.
 * They are not equals. Numeral 16) of article 4 is permanent and was never
 * repealed; D.L. 432 opens by displacing it — "No obstante lo dispuesto en el
 * numeral 16)" — for one named fiscal year, and expires with it. With no decree
 * in force for an exercise, the permanent floor governs it. That is not a
 * vacuum, and treating it as one meant withholding a sourced figure from
 * readers because an unsourced one might arrive later.
 *
 * WHAT IS STILL OFF, and it is not a detail: WHICH TABLE WITHHOLDS ON THE
 * EXCESS. Article 1 of D.L. 432 and numeral 16) both say the surplus is
 * withheld "deduciendo" the exempt slice, and neither names a table. A bonus is
 * not a pay period, so reaching for the monthly one is a reading and not a
 * citation. `aguinaldoTax` will apply whatever table a caller hands it and
 * returns nothing when a caller hands it none, which is what the page does: it
 * prints the gross, the exempt slice and the taxable base, and says plainly
 * that the withholding on that base is not something this project can source.
 */
export const AGUINALDO_TAX_PREVIEW = true;

/** The exempt slice in dollars, for whichever shape the governing rule takes. */
export function exemptAmount(exemption: AguinaldoExemption) {
  if (exemption.kind === "amount") return exemption.amount;
  // The monthly minimum wage is the daily rate times 365/12, which is the
  // conversion the wage decree itself states — see the note on `minimumWage`.
  const daily = currentValue(minimumWage)[exemption.sector];
  return round2(daily * 365 / 12 * exemption.multiple);
}

/**
 * Gross, exempt slice, taxable base and the estimated net of a bonus.
 *
 * Both texts make the exemption a DEDUCTIBLE SLICE and not a cliff: a bonus
 * above the limit is taxed on the excess, "deduciendo el valor no gravable".
 * Getting that backwards would tax the whole bonus of anyone a dollar over.
 */
export function aguinaldoTax(input: {
  bonus: number;
  exemption: AguinaldoExemption;
  /**
   * The withholding the caller's table gives for a base. OPTIONAL, and the page
   * omits it: no text names the table that applies to a bonus, so `withheld`
   * and `net` come back null rather than as a figure with no citation behind
   * it. A caller that passes one is stating which table it chose.
   */
  withhold?: (taxable: number) => number;
}) {
  const gross = round2(Math.max(0, input.bonus || 0));
  const exempt = round2(Math.min(gross, exemptAmount(input.exemption)));
  const taxable = round2(Math.max(0, gross - exempt));
  if (!input.withhold) return { gross, exempt, taxable, withheld: null, net: null };
  const withheld = taxable > 0 ? round2(input.withhold(taxable)) : 0;
  return { gross, exempt, taxable, withheld, net: round2(gross - withheld) };
}
