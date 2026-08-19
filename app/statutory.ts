import { calculateAguinaldo } from "./aguinaldo.ts";
import {
  calendarService, completedMonths, DAY_MS, daysInclusive, isoDate, round2, utcDate,
} from "./dates.ts";
import {
  accrualYearDays, afpEmployeeRate, currentValue, dailySalaryDivisor,
  fixedDeduction, fixedDeductionIncomeLimit,
  isssEmployeeRate, isssMonthlyCeiling, minimumWage, quincena25Exempt, quincena25MandatoryFrom,
  quincena25Rate, quincena25SalaryCeiling, quincena25Window, recalcMonths, recalcTables,
  resignationDaysPerYear, resignationMinimumService, resignationWageCap, ruleAt,
  severanceDaysPerYear, severanceMinimumDays, severanceWageCap, vacationDaysPerYear,
  vacationProportionalOnExit, vacationSurcharge, withholdingTables,
} from "./rules.ts";
import type {
  PayFrequency, Quincena25Sector, RecalcPeriod, RuleId, WageSector, WithholdingBand,
} from "./rules.ts";

export type EmploymentEnd = "dismissal" | "resignation";
export type { PayFrequency, Quincena25Sector, RecalcPeriod, RuleId, WageSector, WithholdingBand };

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

// Both fields are free-text `<input type="date">`, so a typo like "0025-01-01"
// is a value the browser happily submits. Anything outside this window is
// treated as a mistake rather than turned into a century of service.
export const EARLIEST_EMPLOYMENT_DATE = "1950-01-01";
export const LATEST_EMPLOYMENT_DATE = "2100-12-31";

const EARLIEST_DATE = utcDate(EARLIEST_EMPLOYMENT_DATE);
const LATEST_DATE = utcDate(LATEST_EMPLOYMENT_DATE);

/** See the `accrualYearDays` rule: 365, inclusive of both first and last day. */
const YEAR_DAYS = currentValue(accrualYearDays);

/**
 * The Quincena 25 as this module applies it: half a monthly salary, an
 * eligibility ceiling, and the day it stops being optional — which article 6 of
 * Decree 499 sets separately for the public and the private sector.
 *
 * `exempt` carries no arithmetic. It is read by the payroll checker, which has
 * to be able to say that a Quincena 25 inside a taxable gross explains a
 * withholding above the table, and it is the reason nothing else here adds the
 * benefit into a base: article 1 keeps it out of every one of them.
 */
export const QUINCENA25 = {
  salaryCeiling: currentValue(quincena25SalaryCeiling),
  rate: currentValue(quincena25Rate),
  mandatoryFrom: currentValue(quincena25MandatoryFrom),
  exempt: currentValue(quincena25Exempt),
  window: currentValue(quincena25Window),
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

  // The bonus is `aguinaldo.ts` now, and the whole of it: the asymmetry between
  // its two branches and the window where the article 198 scale is ambiguous
  // moved there intact. `/aguinaldo/` calls the same function, so the two pages
  // cannot drift on the cases that are actually hard.
  //
  // The October 2025 package also exempted the bonus from income tax up to
  // $1,500, but transitorily and for the 2025 fiscal year alone. Nothing here
  // models it: this line is gross, as the note under the results says.
  const bonus = calculateAguinaldo({
    startDate: input.startDate,
    endDate: input.endDate,
    monthlySalary: salary,
    alreadyPaid: input.aguinaldoPaid,
  });
  const aguinaldo = bonus.unrounded;

  // Decree 499 article 3 grants the Quincena 25 when the contract ends with
  // employer responsibility or the worker is dismissed without legal cause,
  // "o la parte proporcional, según corresponda", applying the rules of the
  // aguinaldo. Voluntary resignation is not among the cases it names, so it
  // never carries this line. The proportion runs over the calendar year, which
  // is the cycle a payment made every January closes.
  //
  // The private-sector date is the one read: this calculator is Labour Code
  // employment throughout, and article 6 leaves 2026 voluntary for those
  // employers, so nothing is owed as of right before the general regime opens.
  // The public date sits beside it in the rule and no case here reaches it.
  //
  // ARTICLE 3 IS READ RESTRICTIVELY, which is the opposite of what article 187
  // gets a few lines above, and the asymmetry is the decision rather than an
  // inconsistency. Article 187 has an MTPS statement paying the wide reading
  // and reconciling to the cent; following the ministry there is following
  // evidence. This law is from January 2026, its first cycle was voluntary for
  // private employers, and there is no practice to follow. See the
  // `quincena25Window` rule for the two readings in full.
  //
  // So the entitlement lives inside the window article 3 names — a termination
  // on or before 25 January, the day article 1 makes the payment fall due — and
  // outside it the line is zero. `quincena25OutsideWindow` is what the page and
  // the PDF use to say so, and to name the reading that would have paid.
  const quincena25Eligible = input.termination === "dismissal"
    && salary > 0
    && salary <= QUINCENA25.salaryCeiling
    && isoDate(end) >= QUINCENA25.mandatoryFrom.private;
  // The window runs to `QUINCENA25.window` from the first of that same month:
  // where it OPENS is this project's bound and not the decree's, so the test is
  // written as one month rather than hidden inside a date comparison.
  const withinQuincena25Window = end.getUTCMonth() + 1 === QUINCENA25.window.month
    && end.getUTCDate() <= QUINCENA25.window.day;
  const quincena25Applies = quincena25Eligible && withinQuincena25Window;
  const quincena25OutsideWindow = quincena25Eligible && !withinQuincena25Window;
  // The proportion still runs over the cycle the bonus uses, which is the only
  // period this project has: article 2 keys the amount to the salary "al
  // momento en que la prestación se materialice" and names no accrual period.
  const quincena25Share = salary * QUINCENA25.rate * Math.min(1, bonus.cycleFraction);
  const quincena25 = quincena25Applies ? quincena25Share : 0;

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
    // The bonus reports the rules its own arithmetic opened, so the settlement
    // does not have to know which of them a given case reached.
    ...bonus.appliedRules.filter((id) => id.startsWith("aguinaldo")),
    ...(quincena25Applies || quincena25OutsideWindow
      ? ["quincena25SalaryCeiling", "quincena25Rate", "quincena25Exempt",
        "quincena25Window", "quincena25MandatoryFrom"] as const
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
    /** Qualified on every count except the date: what the note is shown for. */
    quincena25OutsideWindow,
    /** What the broad reading of article 3 would have paid, for that note. */
    quincena25Alternative: round2(quincena25OutsideWindow ? quincena25Share : 0),
    /** The last day of the window article 3 names, as the page prints it. */
    quincena25WindowCloses: QUINCENA25.window,
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
    aguinaldoDays: bonus.days,
    aguinaldo: bonus.amount,
    /** True only inside the window where the two readings of the scale differ. */
    aguinaldoScaleAmbiguous: bonus.scaleAmbiguous,
    /** Scale steps being compared, for the interface to quote them. */
    aguinaldoScaleDays: bonus.scaleDays,
    aguinaldoAlternativeScaleDays: bonus.alternativeScaleDays,
    aguinaldoAlternativeDays: bonus.alternativeDays,
    aguinaldoAlternative: bonus.alternativeAmount,
    total: round2(total),
    startDate: isoDate(start),
    endDate: isoDate(end),
  };
}

/**
 * Exported for the annual return, which applies the article 37 table with the
 * same arithmetic the withholding tables use. Two implementations of "find the
 * band, add the fixed amount, apply the rate to the excess" is one too many.
 */
export function applyBands(taxable: number, table: WithholdingBand[]) {
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
 * The renta obtenida behind a figure of taxable pay, which is the pay less the
 * pension contribution and nothing else.
 *
 * WHY THE AFP AND NOT THE ISSS. The compulsory pension contribution is a
 * "renta no gravable para efectos de Impuesto sobre la Renta", and article 4 of
 * the Ley de Impuesto sobre la Renta attaches the consequence to that status: a
 * renta no gravable is "excluida del cómputo de la renta obtenida". The health
 * contribution has no statute giving it that character — what carries it is a
 * recital of Executive Decree 10/2025 describing it as deducted from the
 * ingresos brutos — so it leaves the base later, on the way to the renta
 * imponible, and is still inside the renta obtenida when the $9,100 limit is
 * measured. The citation lives on `afpEmployeeRate` and the reasoning on
 * `fixedDeductionIncomeLimit`; neither is restated here on purpose.
 *
 * ONLY THE COMPULSORY PART. This function derives the contribution from the
 * statutory rate, so a voluntary contribution cannot reach it and there is
 * nothing to over-exclude on this path.
 *
 * The rate is applied to the whole figure because the pension law sets no
 * maximum contributory base: the previous ceiling was repealed, so a
 * high salary contributes the same 7.25% as a low one. If a ceiling ever comes
 * back this stops being a multiplication and the rule note is where it lands.
 *
 * WHY A DECLARED FIGURE BEATS THE DERIVED ONE, and why the caller is asked for
 * it. Article 14 defines the ingreso base de cotización and keeps the aguinaldo
 * OUT of it, along with occasional bonuses, viáticos, gastos de representación
 * and statutory prestaciones sociales. The annual figure this function is
 * handed is a TAX figure and does include the bonus — it has to, because the
 * excess above the exempt slice is renta gravada. Multiplying it by the rate
 * therefore charges a contribution on money that does not contribute:
 * it overstates the AFP, understates the renta obtenida, and hands the flat
 * deduction of article 29 numeral 7 to readers who are over the limit. With a
 * thirty-day bonus the wrong answer runs from about $750.21 to $754.71 of
 * monthly salary.
 *
 * So the derivation is the fallback and not the answer. `declaredAfp` is the
 * figure a reader can add up from their payslips, and the interface says what
 * the fallback assumes whenever they have not.
 */
function rentaObtenidaFrom(taxablePay: number, includeAfp?: boolean, declaredAfp?: number) {
  const pay = round2(Math.max(0, taxablePay || 0));
  if (includeAfp === false) return pay;
  const declared = round2(Math.max(0, declaredAfp || 0));
  if (declared > 0) return round2(Math.max(0, pay - declared));
  return round2(Math.max(0, pay - round2(pay * AFP_RATE)));
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
  /** Renta obtenida for the year: taxable pay with the AFP already excluded. */
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
   * Taxable pay only. The Ley Especial Quincena Veinticinco (D.L. 499 of 14
   * January 2026) declares the benefit "rentas no gravables, y en consecuencia
   * excluidos del cómputo de la renta obtenida" (art. 4), so it never reaches
   * this figure. Article 1 also keeps it out of withholding and out of "la base
   * de cálculo de otras prestaciones", which is why nothing else in this module
   * touches it either — see the `quincena25Exempt` rule.
   */
  annualGross?: number;
  /**
   * The compulsory pension contribution for that same year, as the payslips
   * state it. Left out, it is derived from the rate — see `rentaObtenidaFrom`
   * for why that derivation is only an approximation.
   */
  annualAfp?: number;
  /**
   * The part of this period's gross that article 14 keeps OUT of the ingreso
   * base de cotización: the aguinaldo, occasional bonuses, viáticos, gastos de
   * representación and statutory prestaciones sociales. It leaves the pension
   * base and nothing else — it is still pay, so it stays in the income tax
   * base and in the net.
   */
  nonContributoryPay?: number;
}) {
  const gross = round2(Math.max(0, input.gross || 0));
  const periods = PAY_PERIODS[input.frequency];
  /** Months of a year this one pay period covers: 1, a half, or 12/52. */
  const monthsPerPeriod = MONTHS_IN_A_YEAR / periods;
  // THE PENSION BASE IS NOT THE GROSS, and article 14 is where the difference
  // lives: "No forman parte del Ingreso Base de Cotización" the aguinaldo,
  // occasional bonuses and gratifications, viáticos, gastos de representación
  // and the prestaciones sociales the law establishes. A December payslip that
  // carries the year-end bonus therefore contributes on the salary alone, and
  // charging the rate on the whole gross doubles the contribution of somebody
  // whose bonus equals a month of pay.
  //
  // The caller declares the excluded part rather than this module guessing at
  // it: nothing in a single gross figure says which of it was a viático. Left
  // out, the base is the gross, which is right for an ordinary month.
  const nonContributory = round2(Math.min(gross, Math.max(0, input.nonContributoryPay || 0)));
  const contributoryBase = round2(Math.max(0, gross - nonContributory));
  const afp = input.includeAfp === false ? 0 : round2(contributoryBase * AFP_RATE);
  // The monthly ISSS ceiling, spread over whatever period is being paid. That
  // spreading is an approximation and the interface says so: the institute
  // settles contributions on a monthly planilla, so a weekly run can land a few
  // cents away from the monthly settlement.
  const isssCap = ISSS_MONTHLY_CEILING * monthsPerPeriod;
  const isss = input.includeIsss === false ? 0 : round2(Math.min(gross, isssCap) * ISSS_RATE);
  const taxableBeforeFixedDeduction = round2(Math.max(0, gross - afp - isss));
  // Article 29 caps the fixed deduction by "renta obtenida", and the pension
  // contribution is not part of that figure: see `rentaObtenidaFrom`. The
  // health contribution is, so this is the gross less the AFP and nothing else.
  const declaredAnnual = round2(Math.max(0, input.annualGross || 0));
  const annualPay = declaredAnnual > 0 ? declaredAnnual : round2(gross * periods);
  const declaredAfp = round2(Math.max(0, input.annualAfp || 0));
  const annualIncome = rentaObtenidaFrom(annualPay, input.includeAfp, declaredAfp);
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
    /** What the pension rate was applied to, once article 14 took its slice. */
    contributoryBase, nonContributoryPay: nonContributory,
    annualPay, annualIncome, annualIncomeDeclared: declaredAnnual > 0,
    annualAfp: declaredAfp,
    /** False when the AFP behind `annualIncome` was estimated from the rate. */
    annualAfpDeclared: declaredAfp > 0 && input.includeAfp !== false,
    taxableBeforeFixedDeduction, taxable, isr: withholding.amount,
    band: withholding.band, marginalRate: withholding.rate, net,
  };
}

// --- Checking a payslip against the tables ----------------------------------

/**
 * A cent. Every figure on both sides of this comparison has already been
 * rounded to cents twice — once by the payroll that printed the payslip and
 * once by `round2` here — and the two roundings do not have to land on the same
 * side. Anything inside a cent is that, and reporting it as a difference would
 * bury the real ones under noise.
 */
export const PAYSLIP_TOLERANCE = 0.01;

export type PayslipConcept = "afp" | "isss" | "isr" | "net";

/** Not compared, equal within the tolerance, or the payslip is above / below. */
export type PayslipStatus = "unchecked" | "match" | "higher" | "lower";

/**
 * Why a line might differ, as an identifier and never as a sentence.
 *
 * The wording lives in the page, in both languages, the way every other string
 * on this site does. What this module decides is the harder half: which of these
 * readings actually reproduces the number on the payslip. A cause is only
 * attached when the arithmetic of that reading lands on the reported figure
 * within the tolerance — a list of things that *could* explain a difference is
 * something anybody can write, and it is worth nothing to the person holding
 * the payslip.
 */
export type PayslipCauseId =
  /** No pension contribution where one was expected, or one where none was. */
  | "afpNotApplied" | "afpApplied"
  /** The reported contribution is 7.25% of some other base; `amount` is that base. */
  | "afpOtherBase"
  | "isssNotApplied" | "isssApplied"
  /** 3% of the whole gross: the monthly ceiling was not applied. */
  | "isssNoCeiling"
  /** 3% of some other base; `amount` is that base. */
  | "isssOtherBase"
  /** Fortnightly or weekly, where spreading the monthly ceiling is our own approximation. */
  | "isssProration"
  | "isrNotApplied"
  /** The table read on the gross instead of on the base left after contributions. */
  | "isrOnGross"
  /** The pre-2025 reading, where the tables were said to already contain the $1,600. */
  | "isrWithoutFixedDeduction"
  /** The $1,600 subtracted where this reading does not grant it; `amount` is the share. */
  | "isrWithFixedDeduction"
  /** A base inflated by half a monthly salary, which is what a Quincena 25 in the gross does. */
  | "isrQuincena25"
  /** Withheld above the table with nothing else explaining it: a June or December settlement. */
  | "isrRecalc"
  /** The take-home follows deductions that differ, so it differs with them. */
  | "netDeductionsDiffer"
  /** Gross less the three deductions does not reach the net; `amount` is what is missing. */
  | "netUndisclosed"
  /** The line differs and no reading here reproduces it. */
  | "unexplained";

export type PayslipCause = {
  id: PayslipCauseId;
  /** The rule a reader can open to check the cause, where one governs it. */
  rule?: RuleId;
  /** The figure the cause is about: a base, a share, a residual. */
  amount?: number;
};

export type PayslipLine = {
  concept: PayslipConcept;
  /** What the tables give for the pay that was entered. */
  expected: number;
  /** What the payslip says, or null where the field was left empty. */
  reported: number | null;
  /** Payslip minus tables, so a positive number is the larger payslip figure. */
  difference: number;
  status: PayslipStatus;
  causes: PayslipCause[];
};

/**
 * The same pay run as `calculatePayrollWithholding`, read against what a payslip
 * actually says.
 *
 * The other mode answers "how much should be deducted from me". This one
 * answers the question people arrive with instead, which is whether what was
 * deducted is right — and the difference between the two is not arithmetic but
 * evidence: the first only has to be correct, the second has to be able to say
 * where a discrepancy comes from, or admit that it cannot.
 *
 * Every reported figure is optional and an empty one is simply not compared,
 * because payslips in the country itemise different things and a checker that
 * demands all four would be unusable on most of them.
 *
 * What this deliberately does NOT do is decide whether an employer complied.
 * There are lawful deductions no calculator can know about — a payroll loan, a
 * garnishment, a court-ordered discount, an advance — and `netUndisclosed` is
 * the honest shape of that: it reports the residual and names it as
 * unaccounted-for, not as missing.
 */
export function verifyPayslip(input: {
  gross: number;
  frequency: PayFrequency;
  includeAfp?: boolean;
  includeIsss?: boolean;
  applyFixedDeduction?: boolean;
  annualGross?: number;
  /** The year's compulsory pension contribution, when the reader knows it. */
  annualAfp?: number;
  /** The part of the gross that does not contribute — see the calculation. */
  nonContributoryPay?: number;
  /** What the payslip prints. A missing or empty figure is not compared. */
  reported: Partial<Record<PayslipConcept, number | null>>;
}) {
  const expected = calculatePayrollWithholding(input);
  const gross = expected.gross;
  const monthsPerPeriod = MONTHS_IN_A_YEAR / PAY_PERIODS[input.frequency];
  const isssPeriodCeiling = round2(ISSS_MONTHLY_CEILING * monthsPerPeriod);
  const near = (a: number, b: number) => Math.abs(a - b) <= PAYSLIP_TOLERANCE;

  const reportedOf = (concept: PayslipConcept) => {
    const value = input.reported[concept];
    if (value === null || value === undefined || !Number.isFinite(value)) return null;
    return round2(Math.max(0, value));
  };

  const afpCauses = (reported: number): PayslipCause[] => {
    if (near(reported, 0)) return [{ id: "afpNotApplied", rule: "afpEmployeeRate" }];
    if (expected.afp === 0) return [{ id: "afpApplied", rule: "afpEmployeeRate" }];
    // The base the reported contribution implies, rather than a guess at which
    // ceiling produced it. The pension ceiling was repealed and this project
    // does not carry the repealed figure, so naming it would be inventing one;
    // a base the reader can compare against their own gross is checkable.
    //
    // Compared against the CONTRIBUTORY base and not the gross: on a payslip
    // that carries the aguinaldo the two differ, and a payroll that got article
    // 14 right would otherwise be reported as a discrepancy — the worst way for
    // this tool to be wrong, because the reader takes it to human resources.
    const impliedBase = round2(reported / AFP_RATE);
    if (near(impliedBase, expected.contributoryBase)) return [];
    return [{ id: "afpOtherBase", rule: "afpEmployeeRate", amount: impliedBase }];
  };

  const isssCauses = (reported: number): PayslipCause[] => {
    if (near(reported, 0)) return [{ id: "isssNotApplied", rule: "isssEmployeeRate" }];
    if (expected.isss === 0) return [{ id: "isssApplied", rule: "isssEmployeeRate" }];
    const causes: PayslipCause[] = [];
    if (gross > isssPeriodCeiling && near(reported, round2(gross * ISSS_RATE))) {
      causes.push({ id: "isssNoCeiling", rule: "isssMonthlyCeiling", amount: isssPeriodCeiling });
    } else {
      causes.push({ id: "isssOtherBase", rule: "isssEmployeeRate", amount: round2(reported / ISSS_RATE) });
    }
    // Spreading a monthly ceiling over a fortnight or a week is this project's
    // approximation, not the institute's rule, and it only moves the answer
    // once the ceiling is what is biting. Saying so where it cannot matter
    // would turn a real caveat into background noise.
    if (input.frequency !== "monthly" && gross >= isssPeriodCeiling) {
      causes.push({ id: "isssProration", rule: "isssMonthlyCeiling" });
    }
    return causes;
  };

  const isrCauses = (reported: number): PayslipCause[] => {
    if (near(reported, 0)) return [{ id: "isrNotApplied", rule: "withholdingTables" }];
    const causes: PayslipCause[] = [];
    /** A reading counts only if it lands on the payslip and away from the table. */
    const explains = (candidate: number) => near(reported, candidate) && !near(candidate, expected.isr);

    if (explains(withholdingForTaxable(gross, input.frequency).amount)) {
      causes.push({ id: "isrOnGross", rule: "withholdingTables" });
    }
    // The reading Decree 10/2025 replaced, and still the most common one in the
    // country's payrolls: the table applied without subtracting the $1,600.
    if (expected.fixedDeduction > 0
      && explains(withholdingForTaxable(expected.taxableBeforeFixedDeduction, input.frequency).amount)) {
      causes.push({ id: "isrWithoutFixedDeduction", rule: "fixedDeduction" });
    }
    // Its mirror: the deduction taken in a case this reading does not grant it,
    // either because the band already carries it or because the annual income
    // is over the limit — and the rule cited is whichever of the two ruled it out.
    if (expected.fixedDeduction === 0) {
      const periodDeduction = round2(FIXED_DEDUCTION * monthsPerPeriod);
      const base = round2(Math.max(0, expected.taxableBeforeFixedDeduction - periodDeduction));
      if (explains(withholdingForTaxable(base, input.frequency).amount)) {
        causes.push({
          id: "isrWithFixedDeduction",
          rule: expected.qualifiesForFixedDeduction ? "fixedDeduction" : "fixedDeductionIncomeLimit",
          amount: periodDeduction,
        });
      }
    }
    // A Quincena 25 that was left inside the taxable base. Article 1 of Decree
    // 499 bars every kind of withholding on it and article 4 keeps it out of
    // "el cómputo de la renta obtenida", so a payroll that added it to the base
    // withholds on money the law does not tax. It is only worth naming where the
    // arithmetic fits: the benefit is half a MONTHLY salary and only reaches
    // salaries at or below the ceiling, so no other frequency can carry it whole.
    if (input.frequency === "monthly" && gross > 0 && gross <= QUINCENA25.salaryCeiling) {
      const benefit = round2(gross * QUINCENA25.rate);
      if (explains(withholdingForTaxable(round2(expected.taxable + benefit), input.frequency).amount)) {
        causes.push({ id: "isrQuincena25", rule: "quincena25Exempt", amount: benefit });
      }
    }
    // Nothing above reproduces it and the payslip withheld more. June and
    // December are when that is expected rather than surprising: the employer
    // settles the accumulated tax and subtracts what was already withheld, so
    // one month carries the whole catch-up. It is offered last and as a
    // possibility, because unlike the readings above it is not checkable from
    // a single period.
    if (causes.length === 0 && reported > expected.isr) {
      causes.push({ id: "isrRecalc", rule: "recalcTables", amount: round2(reported - expected.isr) });
    }
    return causes;
  };

  const netCauses = (reported: number): PayslipCause[] => {
    const causes: PayslipCause[] = [];
    const deductions = (["afp", "isss", "isr"] as const);
    if (deductions.some((concept) => {
      const value = reportedOf(concept);
      return value !== null && !near(value, expected[concept]);
    })) causes.push({ id: "netDeductionsDiffer" });
    // The payslip read against itself, which is the one check that needs no
    // table at all: its own gross less its own three deductions has to reach
    // its own net. What is left over is the part this calculator knows nothing
    // about, and saying how much it is beats guessing what it was.
    const [afp, isss, isr] = deductions.map((concept) => reportedOf(concept) ?? expected[concept]);
    const residual = round2(gross - afp - isss - isr - reported);
    if (!near(residual, 0)) causes.push({ id: "netUndisclosed", amount: residual });
    return causes;
  };

  const causesFor = (concept: PayslipConcept, reported: number) => {
    const causes = concept === "afp" ? afpCauses(reported)
      : concept === "isss" ? isssCauses(reported)
        : concept === "isr" ? isrCauses(reported)
          : netCauses(reported);
    // A row that differs always says something. An empty explanation reads as a
    // rendering bug, and "we cannot account for this one" is real information.
    return causes.length > 0 ? causes : [{ id: "unexplained" } as PayslipCause];
  };

  const lines: PayslipLine[] = (["afp", "isss", "isr", "net"] as const).map((concept) => {
    const reported = reportedOf(concept);
    const value = expected[concept];
    if (reported === null) {
      return { concept, expected: value, reported: null, difference: 0, status: "unchecked" as const, causes: [] };
    }
    const difference = round2(reported - value);
    if (Math.abs(difference) <= PAYSLIP_TOLERANCE) {
      return { concept, expected: value, reported, difference: 0, status: "match" as const, causes: [] };
    }
    return {
      concept, expected: value, reported, difference,
      status: difference > 0 ? "higher" as const : "lower" as const,
      causes: causesFor(concept, reported),
    };
  });

  /**
   * The rules this check actually leant on, for the exported document.
   *
   * Built the same way `calculateSettlement` builds its own: from what the
   * comparison did, not from the page's full list. A check that never applied
   * the fixed deduction has no business printing article 29 beneath it.
   */
  const appliedRules: RuleId[] = ["withholdingTables"];
  if (input.includeAfp !== false) appliedRules.push("afpEmployeeRate");
  if (input.includeIsss !== false) appliedRules.push("isssEmployeeRate", "isssMonthlyCeiling");
  if (input.applyFixedDeduction !== false) appliedRules.push("fixedDeduction", "fixedDeductionIncomeLimit");
  for (const line of lines) {
    for (const cause of line.causes) {
      if (cause.rule && !appliedRules.includes(cause.rule)) appliedRules.push(cause.rule);
    }
  }

  return {
    expected,
    lines,
    appliedRules,
    /** The ceiling as it applies to this pay period, which the copy quotes. */
    isssPeriodCeiling,
    /** How many lines the payslip actually filled in. */
    compared: lines.filter((line) => line.status !== "unchecked").length,
    /** How many of those fall outside the tolerance. */
    differences: lines.filter((line) => line.status === "higher" || line.status === "lower").length,
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
/**
 * The two accumulated figures the recalculation needs, worked out from a
 * monthly salary that never changed.
 *
 * MOST PEOPLE DO NOT HAVE THESE NUMBERS. The decree's procedure starts from
 * "remuneraciones gravadas acumuladas" and the withholding already made, and
 * both live on a payroll system the worker cannot see; asking for them and
 * nothing else made the panel unusable for exactly the readers it was for. So
 * the interface offers the other direction: a salary, and the same months the
 * period covers.
 *
 * IT IS AN ESTIMATE, AND ITS ASSUMPTION IS THE INTERESTING PART. It multiplies
 * one identical month by six or twelve, so it holds only for a salary that did
 * not move, with no bonus, no year-end pay, no change of employer and no month
 * out. Every one of those is a reason two people on the same monthly salary end
 * the year with different accumulated figures — which is why the recalculation
 * exists at all, and why anybody whose year was not flat should read the two
 * figures off their payslips and type them in instead.
 */
export function estimateAccumulated(input: {
  period: RecalcPeriod;
  monthlySalary: number;
  includeAfp?: boolean;
  includeIsss?: boolean;
  applyFixedDeduction?: boolean;
}) {
  const months = RECALC_MONTHS[input.period];
  const monthly = calculatePayrollWithholding({
    gross: Math.max(0, input.monthlySalary || 0),
    frequency: "monthly",
    includeAfp: input.includeAfp,
    includeIsss: input.includeIsss,
    applyFixedDeduction: input.applyFixedDeduction,
  });
  // THE TWO SPANS ARE NOT THE SAME, and this is the easy thing to get wrong.
  // The base accumulates the whole period — January to June, January to
  // December — but the withholding already made runs to the month BEFORE,
  // because the month being recalculated has not withheld yet: its withholding
  // is the difference this whole procedure produces. Six months on both sides
  // would net out to a couple of cents and tell a reader on a flat salary that
  // June withholds nothing.
  const withheldMonths = months - 1;
  return {
    months,
    withheldMonths,
    /** One month of it, so the interface can show what is being multiplied. */
    monthlyTaxable: monthly.taxableBeforeFixedDeduction,
    monthlyWithholding: monthly.isr,
    // The base BEFORE the fixed deduction, because the recalculation applies
    // that deduction itself against the period table. Accumulating the
    // post-deduction base would subtract it twice.
    accumulatedTaxable: round2(monthly.taxableBeforeFixedDeduction * months),
    accumulatedWithheld: round2(monthly.isr * withheldMonths),
    /** What the $9,100 test should be measured against for this salary. */
    annualGross: round2(monthly.gross * MONTHS_IN_A_YEAR),
  };
}

export function calculateRecalculation(input: {
  period: RecalcPeriod;
  /** Taxable remuneration accumulated over the period, net of contributions. */
  accumulatedTaxable: number;
  /** Withholding already made in the preceding monthly periods. */
  accumulatedWithheld: number;
  applyFixedDeduction?: boolean;
  /**
   * Taxable pay for the year, gross. The $9,100 test is measured on the renta
   * obtenida derived from it, not on the figure itself — the AFP comes out
   * first. Estimated from the period when absent.
   */
  annualGross?: number;
  /** The year's compulsory pension contribution, when the reader knows it. */
  annualAfp?: number;
  /** False when the pay carries no pension contribution to exclude. */
  includeAfp?: boolean;
}) {
  const months = RECALC_MONTHS[input.period];
  const table = RECALC_TABLES[input.period];
  const accumulatedTaxable = round2(Math.max(0, input.accumulatedTaxable || 0));
  const accumulatedWithheld = round2(Math.max(0, input.accumulatedWithheld || 0));

  const declaredAnnual = round2(Math.max(0, input.annualGross || 0));
  // Scaling the accumulated base to a year measures the limit on a figure the
  // ISSS has already left, which the renta obtenida has not, so a declared
  // figure is always the better one and the interface asks for it. The AFP is
  // out of both: out of the declared one by `rentaObtenidaFrom`, and out of the
  // accumulated base before it ever got here.
  const declaredAfp = round2(Math.max(0, input.annualAfp || 0));
  const annualIncome = declaredAnnual > 0
    ? rentaObtenidaFrom(declaredAnnual, input.includeAfp, declaredAfp)
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
    annualPay: declaredAnnual, annualIncome, annualIncomeDeclared: declaredAnnual > 0,
    annualAfp: declaredAfp,
    annualAfpDeclared: declaredAfp > 0 && input.includeAfp !== false,
    qualifiesForFixedDeduction, bandBeforeFixedDeduction, fixedDeduction,
    taxable, settledTax: settled.amount,
    band: settled.band, marginalRate: settled.rate,
    /** The positive difference, which is what June or December withholds. */
    withholding: difference > 0 ? difference : 0,
    /** Over-withholding. Recoverable only through the annual return. */
    excess: difference < 0 ? round2(-difference) : 0,
  };
}
