import {
  accrualYearDays, afpEmployeeRate, aguinaldoCutoff, aguinaldoCycleStart, aguinaldoScale,
  currentValue, dailySalaryDivisor, fixedDeduction, fixedDeductionIncomeLimit,
  isssEmployeeRate, isssMonthlyCeiling, minimumWage, quincena25MandatoryFrom,
  quincena25Rate, quincena25SalaryCeiling, recalcMonths, recalcTables, resignationDaysPerYear,
  resignationMinimumService, resignationWageCap, ruleAt, severanceDaysPerYear,
  severanceMinimumDays, severanceWageCap, vacationDaysPerYear,
  vacationProportionalOnExit, vacationSurcharge, withholdingTables,
} from "./rules.ts";
import type { PayFrequency, RecalcPeriod, RuleId, WageSector, WithholdingBand } from "./rules.ts";

export type EmploymentEnd = "dismissal" | "resignation";
export type { PayFrequency, RecalcPeriod, WageSector, WithholdingBand };

/**
 * Every statutory figure below now comes from `rules.ts`, which carries the
 * article, the official document and the day each one was last verified beside
 * the value itself. This file keeps the arithmetic and the readings that the
 * texts do not settle; it no longer keeps any number it cannot cite.
 *
 * `RULES_REVIEWED` is re-exported for the sitemap and the structured data,
 * where the claim is site-wide. It is now derived — the oldest review date in
 * the registry — instead of being a string somebody had to remember to edit.
 */
export { RULES_REVIEWED } from "./rules.ts";

export type WageTable = {
  /** First day the table applies, inclusive. */
  from: string;
  decree: string;
  daily: Record<WageSector, number>;
};

/**
 * Minimum wage tables, newest first. A settlement has to be priced with the
 * table in force on the last day worked: article 58 caps the daily base at the
 * "salario mínimo diario legal vigente", and the MTPS calculator applies a
 * single rate — the one current at termination — across every year of service,
 * rather than one rate per year.
 *
 * Only tables this project has read back against their decree are listed.
 * Earlier terminations are priced with the oldest entry and flagged, which is
 * visible guesswork rather than the silent kind.
 */
export const MINIMUM_WAGE_TABLES: WageTable[] = minimumWage.versions.map((version) => ({
  from: version.from,
  decree: version.norm,
  daily: version.value,
}));

/** The table in force today, and the sector list the interface iterates. */
export const DAILY_MINIMUM_WAGE: Record<WageSector, number> = currentValue(minimumWage);

export function minimumWageAt(isoDate: string) {
  const { version, predatesRule } = ruleAt(minimumWage, isoDate);
  return {
    table: { from: version.from, decree: version.norm, daily: version.value },
    predatesTables: predatesRule,
  };
}

export const PAY_PERIODS: Record<PayFrequency, number> = {
  monthly: 12,
  fortnightly: 24,
  weekly: 52,
};

export const WITHHOLDING_TABLES: Record<PayFrequency, WithholdingBand[]> = currentValue(withholdingTables);

export const RECALC_TABLES: Record<RecalcPeriod, WithholdingBand[]> = currentValue(recalcTables);
export const JUNE_RECALC_TABLE: WithholdingBand[] = RECALC_TABLES.june;
export const DECEMBER_RECALC_TABLE: WithholdingBand[] = RECALC_TABLES.december;

export const RECALC_MONTHS: Record<RecalcPeriod, number> = currentValue(recalcMonths);

const AFP_RATE = currentValue(afpEmployeeRate);
const ISSS_RATE = currentValue(isssEmployeeRate);
const ISSS_MONTHLY_CEILING = currentValue(isssMonthlyCeiling);
const FIXED_DEDUCTION = currentValue(fixedDeduction);
const FIXED_DEDUCTION_INCOME_LIMIT = currentValue(fixedDeductionIncomeLimit);
const MONTHS_IN_A_YEAR = 12;

const DAILY_DIVISOR = currentValue(dailySalaryDivisor);
const VACATION_DAYS_PER_YEAR = currentValue(vacationDaysPerYear);
const VACATION_SURCHARGE = currentValue(vacationSurcharge);
const AGUINALDO_SCALE = currentValue(aguinaldoScale);
const AGUINALDO_CUTOFF = currentValue(aguinaldoCutoff);
const AGUINALDO_CYCLE_START = currentValue(aguinaldoCycleStart);

// Both fields are free-text `<input type="date">`, so a typo like "0025-01-01"
// is a value the browser happily submits. Anything outside this window is
// treated as a mistake rather than turned into a century of service.
export const EARLIEST_EMPLOYMENT_DATE = "1950-01-01";
export const LATEST_EMPLOYMENT_DATE = "2100-12-31";

const DAY_MS = 86_400_000;
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function utcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcYears(date: Date, years: number) {
  const result = new Date(date.getTime());
  result.setUTCFullYear(result.getUTCFullYear() + years);
  // 29 February anniversaries fall on 28 February in non-leap years.
  if (result.getUTCMonth() !== date.getUTCMonth()) result.setUTCDate(0);
  return result;
}

function calendarService(start: Date, end: Date) {
  if (end < start) return { years: 0, completedYears: 0, fraction: 0, anniversary: start };
  let completedYears = end.getUTCFullYear() - start.getUTCFullYear();
  if (addUtcYears(start, completedYears) > end) completedYears--;
  completedYears = Math.max(0, completedYears);
  const anniversary = addUtcYears(start, completedYears);
  const nextAnniversary = addUtcYears(start, completedYears + 1);
  const elapsed = Math.max(0, (end.getTime() - anniversary.getTime()) / DAY_MS);
  const span = Math.max(1, (nextAnniversary.getTime() - anniversary.getTime()) / DAY_MS);
  const fraction = Math.min(1, elapsed / span);
  return { years: completedYears + fraction, completedYears, fraction, anniversary };
}

// Whole calendar months between two dates. Scaling the year fraction by 12
// instead assumed months of 30.4 days, so the thirtieth day after an
// anniversary still displayed as zero months.
function completedMonths(from: Date, to: Date) {
  const months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12
    + (to.getUTCMonth() - from.getUTCMonth())
    - (to.getUTCDate() < from.getUTCDate() ? 1 : 0);
  return Math.min(11, Math.max(0, months));
}

function daysInclusive(start: Date, end: Date) {
  if (end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

const EARLIEST_DATE = utcDate(EARLIEST_EMPLOYMENT_DATE);
const LATEST_DATE = utcDate(LATEST_EMPLOYMENT_DATE);

// The article 198 scale, read at whatever date the caller decides. Takes
// COMPLETED years: with service measured in days, 1,095 days divides into
// exactly 3.0 while the third anniversary is still a day away.
function aguinaldoDays(completedYears: number) {
  return AGUINALDO_SCALE.find((step) => completedYears >= step.fromCompletedYears)!.days;
}

/** See the `accrualYearDays` rule: 365, inclusive of both first and last day. */
const YEAR_DAYS = currentValue(accrualYearDays);

export const QUINCENA25 = {
  salaryCeiling: currentValue(quincena25SalaryCeiling),
  rate: currentValue(quincena25Rate),
  mandatoryFrom: currentValue(quincena25MandatoryFrom),
};

export function calculateSettlement(input: {
  startDate: string;
  endDate: string;
  monthlySalary: number;
  sector: WageSector;
  termination: EmploymentEnd;
  pendingSalaryDays?: number;
  unusedVacationPeriods?: number;
  aguinaldoPaid?: boolean;
}) {
  const start = utcDate(input.startDate);
  const end = utcDate(input.endDate);
  const invalid = !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())
    || end < start || start < EARLIEST_DATE || end > LATEST_DATE;
  if (invalid) return {
    invalid: true, serviceYears: 0, completedYears: 0, serviceMonths: 0, serviceDays: 0,
    dailySalary: 0, indemnityBaseDaily: 0, minimumWageDecree: "", minimumWagePredatesTables: false,
    capApplied: false, capMultiplier: 0, capDaily: 0, sectorDailyMinimumWage: 0,
    benefitDaysPerYear: 0,
    indemnity: 0, eligibleForResignationBenefit: false, pendingSalary: 0,
    vacationDays: 0, vacation: 0, completeVacationPeriods: 0, completeVacationDays: 0,
    completeVacation: 0, proportionalVacationDays: 0, proportionalVacation: 0,
    proportionalVacationDisputed: false,
    aguinaldoDays: 0, aguinaldo: 0, aguinaldoScaleAmbiguous: false, aguinaldoScaleDays: 0,
    aguinaldoAlternativeScaleDays: 0, aguinaldoAlternativeDays: 0, aguinaldoAlternative: 0,
    quincena25: 0, quincena25Applies: false, total: 0,
    appliedRules: [] as RuleId[], startDate: "", endDate: "",
  };

  const salary = Math.max(0, input.monthlySalary || 0);
  // See the `dailySalaryDivisor` rule: thirty, anchored to the MTPS constancia
  // and not to a text, because neither article 183 nor article 142 fixes it.
  const dailySalary = salary / DAILY_DIVISOR;
  const service = calendarService(start, end);

  // Split the way the MTPS statement does — complete years, then the days past
  // the last anniversary — because each line is rounded on its own and summing
  // the rounded parts is what reproduces the official figure to the cent.
  const yearsDays = Math.round((service.anniversary.getTime() - start.getTime()) / DAY_MS);
  const fractionDays = Math.round((end.getTime() - service.anniversary.getTime()) / DAY_MS) + 1;
  const serviceDays = yearsDays + fractionDays;

  const dismissed = input.termination === "dismissal";
  const wage = minimumWageAt(isoDate(end));
  const capMultiplier = currentValue(dismissed ? severanceWageCap : resignationWageCap);
  const sectorDailyMinimumWage = wage.table.daily[input.sector];
  // The cap in dollars, kept beside the base it produced. A settlement that was
  // capped and one that was not are the same two numbers on screen — the base
  // simply stops rising — so whether the limit bit has to be an answer the
  // calculation gives, not something a reader infers by comparing two figures.
  // Unrounded here: the maquila and coffee tables carry three decimals, and
  // rounding the cap before comparing would move the base it produces.
  const capDaily = sectorDailyMinimumWage * capMultiplier;
  const indemnityBaseDaily = Math.min(dailySalary, capDaily);
  const capApplied = capDaily < dailySalary;
  const eligibleForResignationBenefit = service.completedYears >= currentValue(resignationMinimumService);

  // Article 58 grants its days per year "y proporcionalmente por fracciones de
  // año", with a floor. Article 8 of the Voluntary Resignation Law says its
  // days "por cada año de servicio"; this estimator used to read that as
  // complete years only, but the MTPS calculator — the official service this
  // site links to — pays the fraction as a separate line, so it is paid here.
  const daysPerYear = currentValue(dismissed ? severanceDaysPerYear : resignationDaysPerYear);
  const accrue = (days: number) => round2(indemnityBaseDaily * daysPerYear * days / YEAR_DAYS);
  const earned = dismissed || eligibleForResignationBenefit
    ? accrue(yearsDays) + accrue(fractionDays)
    : 0;
  const indemnity = dismissed
    ? Math.max(earned, indemnityBaseDaily * currentValue(severanceMinimumDays))
    : earned;

  const pendingSalary = dailySalary * Math.max(0, input.pendingSalaryDays || 0);

  // Vacation is reported as two lines, not one. The proportional part alone is
  // a startlingly small number — leaving on the anniversary itself accrues a
  // single day, which is 15/365 of a day of salary — and folded into a single
  // total it reads as a broken calculation rather than as the answer to what
  // was actually asked, which is what the complete periods field controls.
  // Each part is rounded on its own and the total is their sum, the same way
  // the indemnity splits its complete years from its remaining days.
  //
  // The proportional part is paid on a resignation too, which article 187 read
  // literally does not grant: see the `vacationProportionalOnExit` rule for the
  // text and for the MTPS statement that pays it anyway. The result flags the
  // cases the divergence actually touches so the page and the exported PDF can
  // describe it, rather than leaving the reader to discover it at the ministry.
  const completeVacationPeriods = Math.max(0, input.unusedVacationPeriods || 0);
  const completeVacationDays = VACATION_DAYS_PER_YEAR * completeVacationPeriods;
  const proportionalVacationDays = VACATION_DAYS_PER_YEAR * fractionDays / YEAR_DAYS;
  const vacationDays = completeVacationDays + proportionalVacationDays;
  const vacationRate = 1 + VACATION_SURCHARGE;
  const completeVacation = round2(dailySalary * completeVacationDays * vacationRate);
  const proportionalVacation = round2(dailySalary * proportionalVacationDays * vacationRate);
  const vacation = completeVacation + proportionalVacation;

  const year = end.getUTCFullYear();
  // The date seniority is read at, and by which the bonus is fully earned: see
  // the `aguinaldoCutoff` rule. The 2025 reform moved it, and the article 202
  // payment window with it, from 12 December to 20 October.
  const cutoff = new Date(Date.UTC(year, AGUINALDO_CUTOFF.month - 1, AGUINALDO_CUTOFF.day));
  // Where the bonus year starts accruing. Declared rather than hardcoded — see
  // the `aguinaldoCycleStart` rule, which records that no article settles it.
  const yearStart = new Date(Date.UTC(year, AGUINALDO_CYCLE_START.month - 1, AGUINALDO_CYCLE_START.day));
  const workStartThisYear = start > yearStart ? start : yearStart;
  // Share of the year's bonus already earned, 0 to 1, kept separate from the
  // day scale so the Quincena 25 can reuse it without repeating the rules.
  let aguinaldoFraction = 0;
  // Seniority at the LAST DAY WORKED, which is the scale this branch keeps for
  // anyone who leaves before the cutoff. The asymmetry with the branch below is
  // deliberate, not an oversight: 20 October is the date the article 198 scale
  // is read at for someone still on the payroll, but a worker who left on the
  // 5th never reached it, and crediting them the scale of a seniority they
  // never completed would pay for time not worked. Nothing in the reform says
  // which scale that early leaver takes, so the conservative reading is used
  // for the figure and the alternative is surfaced separately — see
  // `aguinaldoScaleAmbiguous` below and the aguinaldo entry in `faq.ts`.
  let fullAguinaldoDays = aguinaldoDays(service.completedYears);
  const atCutoff = calendarService(start, cutoff);
  if (workStartThisYear <= end) {
    if (end < cutoff) {
      aguinaldoFraction = daysInclusive(workStartThisYear, end) / YEAR_DAYS;
    } else {
      // Seniority at 20 OCTOBER. Past the cutoff the worker did reach the
      // qualifying date, so the scale is read there and not at departure —
      // the counterpart of the comment above, and the reason the two branches
      // measure the same requirement on different days on purpose.
      fullAguinaldoDays = aguinaldoDays(atCutoff.completedYears);
      aguinaldoFraction = atCutoff.completedYears >= 1
        ? 1
        : daysInclusive(workStartThisYear, cutoff) / YEAR_DAYS;
    }
  }
  const earnedAguinaldoDays = input.aguinaldoPaid ? 0 : fullAguinaldoDays * Math.min(1, aguinaldoFraction);

  // The window where the two readings disagree: the worker leaves before the
  // cutoff and would have crossed an article 198 step (15 / 19 / 21) had they
  // stayed to 20 October. Only then is there a second figure worth naming, and
  // the interface names it without claiming either one is the right answer.
  // Because the cutoff is later than the departure in this branch, seniority
  // there is never lower, so the alternative is always the larger figure.
  const alternativeAguinaldoDays = aguinaldoDays(atCutoff.completedYears);
  const aguinaldoScaleAmbiguous = !input.aguinaldoPaid
    && workStartThisYear <= end
    && end < cutoff
    && alternativeAguinaldoDays !== fullAguinaldoDays;
  const aguinaldoAlternativeDays = aguinaldoScaleAmbiguous
    ? alternativeAguinaldoDays * Math.min(1, aguinaldoFraction)
    : 0;
  // The October 2025 package also exempted aguinaldo from income tax up to
  // $1,500, but as a transitory provision for the 2025 fiscal year only. It is
  // deliberately not modelled here; check for a 2026 equivalent before adding
  // it, and note this estimate is gross either way.
  const aguinaldo = dailySalary * earnedAguinaldoDays;

  // Decree 499 article 3 grants the Quincena 25 when the contract ends with
  // employer responsibility or the worker is dismissed without legal cause,
  // "o la parte proporcional, según corresponda", applying the rules of the
  // aguinaldo. Voluntary resignation is not among the cases it names, so it
  // never carries this line. The proportion runs over the calendar year, which
  // is the cycle a payment made every January closes.
  const quincena25Applies = input.termination === "dismissal"
    && salary > 0
    && salary <= QUINCENA25.salaryCeiling
    && isoDate(end) >= QUINCENA25.mandatoryFrom;
  const quincena25 = quincena25Applies
    ? salary * QUINCENA25.rate * Math.min(1, daysInclusive(workStartThisYear, end) / YEAR_DAYS)
    : 0;

  const total = indemnity + pendingSalary + vacation + aguinaldo + quincena25;

  // Whether this case sits inside the article 187 divergence: a resignation
  // that is being paid a part-year of vacation the literal text gives only to
  // dismissal. A dismissal never is, and neither is a resignation that leaves
  // on an anniversary with no fraction to pay.
  const proportionalVacationDisputed = !dismissed
    && proportionalVacationDays > 0
    && !currentValue(vacationProportionalOnExit).literal.includes("resignation");

  /**
   * The rules this case actually applied, in the order the estimate reads.
   *
   * The exported PDF cites these and only these, which is why the list is built
   * here rather than assembled from `RULE_USAGE` by whoever draws the document:
   * only this function knows that a dismissal touched no resignation article,
   * or that the year-end bonus was already paid and its scale never opened. A
   * citation list that names a rule the arithmetic did not use is a claim the
   * document cannot back, and it is exactly the kind nobody checks.
   */
  const appliedRules: RuleId[] = [
    "minimumWage", "dailySalaryDivisor", "accrualYearDays",
    ...(dismissed
      ? ["severanceDaysPerYear", "severanceMinimumDays", "severanceWageCap"] as const
      : ["resignationDaysPerYear", "resignationWageCap", "resignationMinimumService"] as const),
    "vacationDaysPerYear", "vacationSurcharge",
    ...(proportionalVacationDays > 0 ? ["vacationProportionalOnExit"] as const : []),
    "vacationUnmodelled",
    ...(earnedAguinaldoDays > 0
      ? ["aguinaldoScale", "aguinaldoCutoff", "aguinaldoCycleStart"] as const
      : []),
    ...(quincena25Applies
      ? ["quincena25SalaryCeiling", "quincena25Rate", "quincena25MandatoryFrom"] as const
      : []),
  ];

  return {
    invalid: false,
    serviceYears: serviceDays / YEAR_DAYS,
    serviceDays,
    completedYears: service.completedYears,
    minimumWageDecree: wage.table.decree,
    minimumWagePredatesTables: wage.predatesTables,
    /** 30 under article 58, 15 under article 8: what the benefit accrues at. */
    benefitDaysPerYear: daysPerYear,
    /** The sector's daily minimum wage, the cap it produces, and whether it bit. */
    sectorDailyMinimumWage: round2(sectorDailyMinimumWage),
    capMultiplier,
    capDaily: round2(capDaily),
    capApplied,
    appliedRules,
    quincena25: round2(quincena25),
    quincena25Applies,
    // Whole months past the last anniversary. Reported separately because
    // rounding the decimal year to two places shows "2.00" for someone who is
    // still days short of the two years the resignation benefit requires.
    serviceMonths: completedMonths(service.anniversary, end),
    dailySalary: round2(dailySalary),
    indemnityBaseDaily: round2(indemnityBaseDaily),
    indemnity: round2(indemnity),
    eligibleForResignationBenefit,
    pendingSalary: round2(pendingSalary),
    vacationDays,
    vacation: round2(vacation),
    completeVacationPeriods,
    completeVacationDays,
    completeVacation,
    proportionalVacationDays,
    proportionalVacation,
    /** True only where article 187 and the official service disagree. */
    proportionalVacationDisputed,
    aguinaldoDays: earnedAguinaldoDays,
    aguinaldo: round2(aguinaldo),
    /** True only inside the window where the two readings of the scale differ. */
    aguinaldoScaleAmbiguous,
    /** Scale steps being compared, for the interface to quote them. */
    aguinaldoScaleDays: fullAguinaldoDays,
    aguinaldoAlternativeScaleDays: aguinaldoScaleAmbiguous ? alternativeAguinaldoDays : 0,
    aguinaldoAlternativeDays,
    aguinaldoAlternative: round2(dailySalary * aguinaldoAlternativeDays),
    total: round2(total),
    startDate: isoDate(start),
    endDate: isoDate(end),
  };
}

function applyBands(taxable: number, table: WithholdingBand[]) {
  const amount = Math.max(0, round2(taxable));
  const band = table.find((item) => item.to === null || amount <= item.to) ?? table.at(-1)!;
  return {
    band: table.indexOf(band) + 1,
    amount: round2(band.fixed + Math.max(0, amount - band.excess) * band.rate),
    rate: band.rate,
  };
}

export function withholdingForTaxable(taxable: number, frequency: PayFrequency) {
  return applyBands(taxable, WITHHOLDING_TABLES[frequency]);
}

/**
 * Whether the $1,600 fixed deduction applies, and how much of it this period
 * takes. Shared by the payroll calculation and the June/December recalculation,
 * which apply the same two article 29 figures over different spans and used to
 * each carry their own copy of both.
 *
 * `months` is what the span covers: one pay period's share of a year for
 * payroll, the six or twelve accumulated months for a recalculation. The
 * deduction is stored annually precisely so that this is the only place it is
 * ever divided.
 *
 * The band rule is literal e) of Executive Decree 10/2025: "los valores
 * consignados únicamente en el Tramo II [...] no contienen las deducciones", so
 * band II is the only band where the deduction belongs in the periodic
 * withholding rather than only in the annual return. Bands III and IV already
 * carry it — their limits are the article 37 ones displaced by exactly $1,600
 * ($9,142.86 + 1,600 = $10,742.86 = 895.24 x 12) — and subtracting it there
 * deducted it twice. Band I never withholds either way. Literal f) closes by
 * extending that same band II rule to the two recalculation tables by name.
 */
function fixedDeductionFor(input: {
  annualIncome: number;
  bandBeforeFixedDeduction: number;
  months: number;
  applyFixedDeduction?: boolean;
}) {
  const qualifies = input.annualIncome <= FIXED_DEDUCTION_INCOME_LIMIT;
  const amount = input.applyFixedDeduction !== false && qualifies
    && input.bandBeforeFixedDeduction === 2
    ? round2(FIXED_DEDUCTION * input.months / MONTHS_IN_A_YEAR)
    : 0;
  return { qualifiesForFixedDeduction: qualifies, fixedDeduction: amount };
}

export function calculatePayrollWithholding(input: {
  gross: number;
  frequency: PayFrequency;
  includeAfp?: boolean;
  includeIsss?: boolean;
  applyFixedDeduction?: boolean;
  /**
   * Renta obtenida for the year, when the caller knows it. Annualising a single
   * period assumes twelve identical months and ignores the year-end bonus and
   * any other remuneration, so a worker just under the limit per period can sit
   * above it across the year. Left out, the period is annualised as before.
   *
   * Taxable pay only. Legislative Decree 499 of 14 January 2026 declares the
   * Quincena 25 "rentas no gravables, y en consecuencia excluidos del cómputo
   * de la renta obtenida" (art. 4), so it never reaches this figure. Article 1
   * also keeps it out of withholding and out of "la base de cálculo de otras
   * prestaciones", which is why nothing else in this module touches it either.
   */
  annualGross?: number;
}) {
  const gross = round2(Math.max(0, input.gross || 0));
  const periods = PAY_PERIODS[input.frequency];
  /** Months of a year this one pay period covers: 1, a half, or 12/52. */
  const monthsPerPeriod = MONTHS_IN_A_YEAR / periods;
  const afp = input.includeAfp === false ? 0 : round2(gross * AFP_RATE);
  // The monthly ISSS ceiling, spread over whatever period is being paid. That
  // spreading is an approximation and the interface says so: the institute
  // settles contributions on a monthly planilla, so a weekly run can land a few
  // cents away from the monthly settlement.
  const isssCap = ISSS_MONTHLY_CEILING * monthsPerPeriod;
  const isss = input.includeIsss === false ? 0 : round2(Math.min(gross, isssCap) * ISSS_RATE);
  const taxableBeforeFixedDeduction = round2(Math.max(0, gross - afp - isss));
  // Article 29 caps the fixed deduction by "renta obtenida", which article 2
  // defines as the salary and remuneration received — the gross, not the base
  // left after pension and health contributions.
  const declaredAnnual = round2(Math.max(0, input.annualGross || 0));
  const annualIncome = declaredAnnual > 0 ? declaredAnnual : round2(gross * periods);
  // The band is read from the base before the deduction, which is the figure
  // the table's own limits are written in. A base that band II then drops below
  // $550 still withholds nothing, which is what the annual liquidation gives.
  const bandBeforeFixedDeduction = withholdingForTaxable(taxableBeforeFixedDeduction, input.frequency).band;
  const { qualifiesForFixedDeduction, fixedDeduction } = fixedDeductionFor({
    annualIncome, bandBeforeFixedDeduction, months: monthsPerPeriod,
    applyFixedDeduction: input.applyFixedDeduction,
  });
  const taxable = round2(Math.max(0, taxableBeforeFixedDeduction - fixedDeduction));
  const withholding = withholdingForTaxable(taxable, input.frequency);
  const net = round2(gross - afp - isss - withholding.amount);
  return {
    gross, afp, isss, fixedDeduction, qualifiesForFixedDeduction, bandBeforeFixedDeduction,
    annualIncome, annualIncomeDeclared: declaredAnnual > 0,
    taxableBeforeFixedDeduction, taxable, isr: withholding.amount,
    band: withholding.band, marginalRate: withholding.rate, net,
  };
}

/**
 * The June and December recalculation of article 1 literal f) of Executive
 * Decree 10/2025, which derogated Decree 95/2015 with effect from May 2025.
 * (The procedure is not in article 4: articles 2 to 4 are the public-sector
 * filing rule, the derogation and the vigencia clause.)
 *
 * The decree accumulates the taxable remuneration "hayan sido objeto de
 * retención o no", applies the period table, and subtracts what was already
 * withheld — January to May for June, January to November for December. Two
 * consequences the caller has to carry into the interface:
 *
 * - A negative difference withholds nothing. It is not refunded through
 *   payroll; literal i) sends the worker to the annual return or to a refund
 *   request, so this function reports it as `excess`, never as a payment.
 * - On a change of employer the last one in the period runs the recalculation
 *   over both jobs, using the constancia de retención from the previous one.
 *   Nothing here excludes a worker who changed jobs; the accumulated figures
 *   are simply expected to already include the earlier employer.
 *
 * Remuneration under retención definitiva, and the 10% of literal h) that a
 * second employer withholds, are excluded from the accumulation by the decree
 * and so must be left out of `accumulatedTaxable` by the caller.
 */
export function calculateRecalculation(input: {
  period: RecalcPeriod;
  /** Taxable remuneration accumulated over the period, net of contributions. */
  accumulatedTaxable: number;
  /** Withholding already made in the preceding monthly periods. */
  accumulatedWithheld: number;
  applyFixedDeduction?: boolean;
  /** Annual figure for the $9,100 test; estimated from the period when absent. */
  annualGross?: number;
}) {
  const months = RECALC_MONTHS[input.period];
  const table = RECALC_TABLES[input.period];
  const accumulatedTaxable = round2(Math.max(0, input.accumulatedTaxable || 0));
  const accumulatedWithheld = round2(Math.max(0, input.accumulatedWithheld || 0));

  const declaredAnnual = round2(Math.max(0, input.annualGross || 0));
  // Scaling the accumulated base to a year measures the limit on taxable pay
  // rather than on the gross the decree names, so a declared figure is always
  // the better one and the interface asks for it.
  const annualIncome = declaredAnnual > 0
    ? declaredAnnual
    : round2(accumulatedTaxable * MONTHS_IN_A_YEAR / months);

  const bandBeforeFixedDeduction = applyBands(accumulatedTaxable, table).band;
  // The decree writes the deduction as the flat $1,600 with no proration
  // clause, but the June table is the monthly table scaled by six, and the
  // monthly one takes $1,600/12 per period — so six months of it is $800.
  // Deducting the full $1,600 against a half-year table would break the
  // continuity the recalculation exists to provide, leaving band II workers
  // permanently over-withheld until December. December, being the annual
  // settlement, takes the whole $1,600 either way. Passing `months` to the
  // shared helper is what expresses that; the arithmetic is not repeated here.
  const { qualifiesForFixedDeduction, fixedDeduction } = fixedDeductionFor({
    annualIncome, bandBeforeFixedDeduction, months,
    applyFixedDeduction: input.applyFixedDeduction,
  });

  const taxable = round2(Math.max(0, accumulatedTaxable - fixedDeduction));
  const settled = applyBands(taxable, table);
  const difference = round2(settled.amount - accumulatedWithheld);

  return {
    period: input.period, months, accumulatedTaxable, accumulatedWithheld,
    annualIncome, annualIncomeDeclared: declaredAnnual > 0,
    qualifiesForFixedDeduction, bandBeforeFixedDeduction, fixedDeduction,
    taxable, settledTax: settled.amount,
    band: settled.band, marginalRate: settled.rate,
    /** The positive difference, which is what June or December withholds. */
    withholding: difference > 0 ? difference : 0,
    /** Over-withholding. Recoverable only through the annual return. */
    excess: difference < 0 ? round2(-difference) : 0,
  };
}
