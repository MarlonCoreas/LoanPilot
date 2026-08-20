import { calendarService, DAY_MS, daysInclusive, isoDate, round2, utcDate } from "./dates.ts";
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
 * WHAT THE MTPS ACTUALLY DOES, which is what this now implements. Its online
 * calculator was run on five cases on 20 August 2026 and it answers in TWO
 * ROWS, each carrying the period it covers:
 *
 *     12/12/2024 - 11/12/2025   365 días   AGUINALDO COMPLETO      $570.00
 *     12/12/2025 - 30/06/2026   201 días   AGUINALDO PROPORCIONAL  $313.89
 *
 * Four things fall out of that output and all four were wrong here before:
 *
 *   THE CYCLE RUNS 12 DECEMBER TO 11 DECEMBER. It is printed, not inferred.
 *   This module applied the calendar year and under-stated every proportional
 *   bonus by exactly the scale times 20/365 of the daily wage.
 *
 *   THERE ARE TWO LINES, and a settlement can owe both: the whole bonus of the
 *   cycle that closed and was never handed over, plus the part-year of the one
 *   that opened after it. One figure could express one or the other depending
 *   on the date, never both.
 *
 *   THE SCALE IS READ ON THE LAST DAY OF THE PERIOD BEING PAID — on 11 December
 *   for the closed cycle, on the last day worked for the running one. Not at
 *   the qualifying date. A worker hired on 1 November 2023 and leaving on
 *   15 December 2026 has two completed years on 20 October and three on
 *   11 December, and the ministry pays nineteen days.
 *
 *   THE QUALIFYING DATE DOES NOT CAP THE ACCRUAL. It opens the payment window
 *   and nothing else. This module used to stop the clock there, and to grant a
 *   whole bonus to anyone who reached it with a year of service.
 *
 * ALL SIX DATA POINTS ARE PINNED in `tests/aguinaldo.test.mjs`, including the
 * MTPS settlement statement whose bonus line this suite left uncompared for as
 * long as it existed. They are not derived from anything in this repository: if
 * one fails, the model and the ministry have parted company.
 *
 * WHAT SURVIVED, ON PURPOSE: the two readings of the scale for an early leaver
 * are still both surfaced. The ministry reads it on the last day worked, which
 * is what this module already applied, but a practice is not a text and
 * article 197 can still be read the other way — so where the two differ the
 * figure is shown beside its alternative and neither is claimed to govern.
 *
 * FOR THE NEXT DECISION, NOT ACTED ON HERE. Reformed article 202 carries the
 * same restrictive formula as article 187: it grants the proportional bonus
 * "cuando se declare terminado un contrato de trabajo con responsabilidad para
 * el patrono, o cuando el trabajador fuere despedido de hecho, sin causa legal",
 * and names no other case. This module pays it on a resignation too, on the
 * same unexamined footing as the vacation fraction.
 *
 * AND WHAT NOBODY MODELS: the anticipated payment. The window opens on
 * 20 October and the cycle closes on 11 December, so a bonus can be handed over
 * for a cycle still running, and neither this form nor the ministry's asks
 * whether that happened. See `aguinaldoAnticipatedPayment`.
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

/**
 * The last day of the cycle whose bonus is paid in the given year's window.
 *
 * WHAT A STILL-EMPLOYED READER IS MEASURED TO, and it is not the qualifying
 * date. The window opens on 20 October, but the cycle it pays for runs to
 * 11 December, so somebody read at 20 October has worked 313 of its 365 days
 * and would be shown a part-year for a bonus they are going to collect whole.
 * The article 197 date decides WHEN the money is handed over and, before the
 * MTPS output was read, was assumed to decide the scale as well; it does not.
 *
 * Measuring to the close instead makes the ordinary case fall out of the same
 * arithmetic as every other: a worker employed for the whole cycle gets 365/365
 * and therefore the entire step, and one hired inside it gets the days they
 * actually worked, with no branch of its own to disagree with the leaver's.
 */
export function aguinaldoCycleEndFor(year: number, cycleStart: YearDay = CYCLE_START) {
  return isoDate(new Date(Date.UTC(year, cycleStart.month - 1, cycleStart.day) - DAY_MS));
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

  // THE CYCLE CONTAINING THE LAST DAY READ, and the one that closed before it.
  // The most recent occurrence of the cycle day on or before `end`, stepping
  // back a year when that day has not come round yet.
  const cycleThisYear = new Date(Date.UTC(year, cycleDay.month - 1, cycleDay.day));
  const cycleOpens = cycleThisYear <= end
    ? cycleThisYear
    : new Date(Date.UTC(year - 1, cycleDay.month - 1, cycleDay.day));
  const closedEnds = new Date(cycleOpens.getTime() - DAY_MS);
  const closedOpens = new Date(Date.UTC(
    closedEnds.getUTCFullYear() - 1, cycleDay.month - 1, cycleDay.day));

  /** The article 198 step, read on the last day of the period being paid. */
  const scaleOn = (day: Date) => aguinaldoDaysFor(calendarService(start, day).completedYears);

  // THE CLOSED CYCLE. Owed whole when the worker was there for all of it and
  // has not collected it; nothing otherwise. It is not prorated: a cycle worked
  // end to end earns its whole step, which is what "prima anual" means.
  const workedWholeClosedCycle = start <= closedOpens && end >= closedEnds;
  const owedClosedCycle = !input.alreadyPaid && workedWholeClosedCycle;
  const completeDays = owedClosedCycle ? scaleOn(closedEnds) : 0;

  // THE RUNNING CYCLE, prorated over the days actually worked in it. Its own
  // qualifying date is a year away and nobody has reached it, so this is a
  // part-year however long the service is.
  const workStart = start > cycleOpens ? start : cycleOpens;
  const cycleFraction = workStart <= end ? daysInclusive(workStart, end) / YEAR_DAYS : 0;
  const fraction = Math.min(1, cycleFraction);
  const scaleDays = scaleOn(end);
  const proportionalDays = workStart <= end ? scaleDays * fraction : 0;

  const days = completeDays + proportionalDays;
  const reachedCutoff = end >= cutoff;

  // The window where the two readings of the scale disagreed. The MTPS reads it
  // on the last day worked — see the note on `aguinaldoScaleOnExit` — so the
  // alternative is named only where a reader would otherwise not know a second
  // reading existed, and never claimed to govern.
  const alternativeScaleDays = aguinaldoDaysFor(calendarService(start, cutoff).completedYears);
  const scaleAmbiguous = proportionalDays > 0
    && !reachedCutoff
    && alternativeScaleDays !== scaleDays;
  const alternativeDays = scaleAmbiguous ? alternativeScaleDays * fraction : 0;

  // ROUNDED PER LINE, THEN SUMMED, and the order matters now that there are two
  // of them. A settlement prints both and prints a total, and a reader who adds
  // the two figures on the page has to land on the third: rounding the sum
  // instead would leave the document a cent out of balance on some cases, which
  // is exactly the kind of thing that loses an argument at a human resources
  // desk. The unrounded figure stays available for callers that need it.
  const completeAmount = round2(dailySalary * completeDays);
  const proportionalAmount = round2(dailySalary * proportionalDays);
  const amount = round2(completeAmount + proportionalAmount);
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
    /** Days of salary owed in total: the closed cycle plus the running one. */
    days,
    /** The bonus, rounded the way it is paid: the two lines, each rounded, summed. */
    amount,
    /**
     * The same figure before rounding. A caller summing this into a larger
     * total needs it: the settlement rounds its total once, at the end, and
     * rounding here first would move that total by a cent on some cases.
     */
    unrounded,
    /**
     * THE TWO LINES THE MTPS PRINTS, and the reason the total above is a sum.
     *
     * A settlement can owe both at once: the whole bonus of the cycle that
     * closed and was never handed over, and the part-year of the cycle that
     * opened after it. Collapsing them lost one or the other depending on the
     * date — see the note at the top of this file.
     */
    completeDays,
    completeAmount,
    proportionalDays,
    proportionalAmount,
    dailySalary: round2(dailySalary),
    /** The article 198 step of the RUNNING cycle, read on the last day worked. */
    scaleDays,
    /** The step of the closed cycle, read on its own last day. Zero when none is owed. */
    completeScaleDays: owedClosedCycle ? scaleOn(closedEnds) : 0,
    completedYears: calendarService(start, end).completedYears,
    /** Share of the running cycle worked, before the scale. Reused by the Quincena 25. */
    cycleFraction,
    fraction,
    reachedCutoff,
    cutoffDate: isoDate(cutoff),
    cycleStartDate: isoDate(cycleOpens),
    closedCycleStartDate: isoDate(closedOpens),
    closedCycleEndDate: isoDate(closedEnds),
    /** True when a bonus already earned and never collected is part of this figure. */
    owedClosedCycle,
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
