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
 * WHAT CHANGED WITH IT: a collected bonus no longer zeroes the line. See
 * `alreadyPaid`. The statement's aguinaldo line — $21.15, the one figure the
 * reconciliation used to leave uncompared — is now reproduced to the cent, and
 * only under the 12 December cycle. That is evidence about the disputed value
 * and it is not being used to move it: `aguinaldoCycleStart` still applies the
 * calendar year, and what changed here is only that the code can now express
 * both readings on the case that distinguishes them. It could not before, and a
 * dispute whose alternative the program cannot produce is a footnote.
 *
 * FOR THE NEXT DECISION, NOT ACTED ON HERE. Reformed article 202 carries the
 * same restrictive formula as article 187: it grants the proportional bonus
 * "cuando se declare terminado un contrato de trabajo con responsabilidad para
 * el patrono, o cuando el trabajador fuere despedido de hecho, sin causa legal",
 * and names no other case. This module pays the proportional bonus on a
 * resignation too, on the same unexamined footing as the vacation fraction. It
 * is the same shape of question that `quincena25Window` has just been decided
 * in the other direction, and it is recorded here so it is decided rather than
 * inherited.
 *
 * WHAT THIS FUNCTION PRICES, now that the boundary is load-bearing: ONE cycle,
 * the one the last day worked falls in. A worker who reached the qualifying
 * date, was NOT paid, and leaves after the cycle reopened is owed that whole
 * unpaid bonus AS WELL, and this returns only the days of the new cycle. That
 * debt belongs to a cycle this call is not pricing, and paying two cycles from
 * one call is a larger change than the gap justifies. It cannot arise under the
 * applied calendar cycle, where the cycle day always precedes the qualifying
 * date; it is reachable only under the 12 December reading, and there the
 * previous behaviour was worse — the fraction was measured from a cycle opening
 * after the date it measured to, and a full year worked came back as zero.
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
  /**
   * The bonus earned by the qualifying date has already been collected.
   *
   * IT DOES NOT MEAN "NOTHING IS OWED". A payment discharges the cycle that was
   * open at the QUALIFYING DATE — that is the day the bonus is earned by and
   * the day the payment window pays for. Since the 2025 reform that window runs
   * from 20 October to 20 December, so a worker can collect and then leave with
   * weeks still to run, and under a cycle that reopens inside those weeks those
   * days belong to a NEW cycle the payment never touched.
   *
   * WHAT IT COSTS TODAY: nothing, and that is worth being exact about. Under
   * the applied calendar cycle the cycle day always precedes the October
   * qualifying date, so the payment always discharges the cycle the departure
   * falls in and this branch never runs. No settlement figure moved when it was
   * written. What it does is make the 12 December reading produce the MTPS
   * statement's $21.15 instead of zero — which is the difference between a
   * dispute with two live readings and a decision with a footnote, and it is
   * the precondition for deciding `aguinaldoCycleStart` on evidence at all.
   *
   * So the flag settles a cycle, not a worker: `settledByPayment` when the
   * discharged cycle is the one the last day worked falls in, and
   * `accruesNewCycle` when a later one has opened since.
   */
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

  // WHICH CYCLE A COLLECTED BONUS DISCHARGED, which is the whole of the
  // `alreadyPaid` question and used to be assumed rather than asked.
  //
  // The payment settles the cycle that was open at the qualifying date. When
  // the cycle containing the last day worked opened AFTER that date, the two
  // are different cycles: the money paid for the earlier one, and the days run
  // since this one opened are still owed. Under a 1 January cycle that never
  // happens — the cycle day precedes the October qualifying date every year —
  // so this splits exactly along the reading in dispute, which is why it can be
  // written at all only now that the cycle is a parameter.
  // THIS FUNCTION PRICES ONE CYCLE: the one the last day worked falls in. When
  // that cycle opened after the qualifying date, the qualifying date belongs to
  // the PREVIOUS cycle, and nothing about this one has been earned in full or
  // discharged by a payment — whether or not a payment was made.
  const cycleOpenedAfterCutoff = cycleOpens > cutoff;
  /** Paid, and the payment covered the cycle the departure falls in. */
  const settledByPayment = input.alreadyPaid === true && !cycleOpenedAfterCutoff;
  /** Paid, but a later cycle has opened since: its part-year is still owed. */
  const accruesNewCycle = input.alreadyPaid === true && cycleOpenedAfterCutoff;

  /** Share of this cycle worked, 0 to 1, before the scale is applied. */
  let cycleFraction = 0;
  let fraction = 0;
  // Seniority at the LAST DAY READ, which is the scale kept for anyone who
  // never reached the qualifying date. See the asymmetry note at the top.
  let scaleDays = aguinaldoDaysFor(service.completedYears);
  const reachedCutoff = end >= cutoff;

  if (workStart <= end) {
    cycleFraction = daysInclusive(workStart, end) / YEAR_DAYS;
    // A cycle that opened after the qualifying date is a part-year like any
    // other: its own qualifying date is a year away, nobody has reached it, and
    // the scale is read at the last day worked. Reaching the PREVIOUS cycle's
    // date says nothing about this one, and pricing it as a whole bonus would
    // pay the discharged cycle a second time. Without this branch the else
    // below measured from a cycle that opens AFTER the cutoff it measures to,
    // and returned zero for a full year worked.
    if (!reachedCutoff || cycleOpenedAfterCutoff) {
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

  const days = settledByPayment ? 0 : scaleDays * Math.min(1, fraction);

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
    /**
     * The bonus was collected and this figure is what the cycle that opened
     * afterwards has accrued since.
     *
     * No page reads it yet, because under the applied calendar cycle it is
     * never true. It is returned rather than kept private because the day the
     * cycle moves, a reader who ticked "already paid" and still sees a line owed
     * needs to be told why on screen — and a flag the caller cannot see is a
     * flag nobody will remember to add.
     */
    accruesNewCycle,
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
