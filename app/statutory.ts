export type EmploymentEnd = "dismissal" | "resignation";
export type WageSector = "commerce" | "maquila" | "coffee" | "agriculture";
export type PayFrequency = "monthly" | "fortnightly" | "weekly";

// The day every figure in this file was last read back against the official
// texts linked in the interface. The badge the user sees repeats this date, so
// a stale value is a claim the site cannot back: change it only in the same
// commit that re-checks the sources, never as a routine bump.
export const RULES_REVIEWED = "2026-08-10";

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
 * Only the table this project has read back against its decree is listed.
 * Earlier terminations are priced with the oldest entry and flagged, which is
 * visible guesswork rather than the silent kind.
 */
export const MINIMUM_WAGE_TABLES: WageTable[] = [
  {
    // Executive Decree 12/2025, which replaced articles 2, 3(a) and 6 of Decree
    // 11/2025 with a single table broken down by sector. The decree states the
    // monthly equivalent as the daily rate times 365/12, not times 30.
    from: "2025-06-01",
    decree: "D.E. 12/2025",
    daily: {
      commerce: 13.44,   // comercio, servicios, industria, ingenios, agroindustria
      maquila: 13.227,   // maquila textil y confección
      coffee: 10.035,    // beneficios de café y recolección de caña de azúcar
      agriculture: 8.96, // agropecuario, pesca y recolección de café
    },
  },
];

/** The table in force today, and the sector list the interface iterates. */
export const DAILY_MINIMUM_WAGE: Record<WageSector, number> = MINIMUM_WAGE_TABLES[0].daily;

export function minimumWageAt(isoDate: string) {
  const table = MINIMUM_WAGE_TABLES.find((item) => isoDate >= item.from);
  const oldest = MINIMUM_WAGE_TABLES[MINIMUM_WAGE_TABLES.length - 1];
  return { table: table ?? oldest, predatesTables: !table };
}

export const PAY_PERIODS: Record<PayFrequency, number> = {
  monthly: 12,
  fortnightly: 24,
  weekly: 52,
};

export type WithholdingBand = {
  from: number;
  to: number | null;
  rate: number;
  excess: number;
  fixed: number;
};

export const WITHHOLDING_TABLES: Record<PayFrequency, WithholdingBand[]> = {
  monthly: [
    { from: 0.01, to: 550, rate: 0, excess: 0, fixed: 0 },
    { from: 550.01, to: 895.24, rate: 0.10, excess: 550, fixed: 17.67 },
    { from: 895.25, to: 2038.10, rate: 0.20, excess: 895.24, fixed: 60 },
    { from: 2038.11, to: null, rate: 0.30, excess: 2038.10, fixed: 288.57 },
  ],
  fortnightly: [
    { from: 0.01, to: 275, rate: 0, excess: 0, fixed: 0 },
    { from: 275.01, to: 447.62, rate: 0.10, excess: 275, fixed: 8.83 },
    { from: 447.63, to: 1019.05, rate: 0.20, excess: 447.62, fixed: 30 },
    { from: 1019.06, to: null, rate: 0.30, excess: 1019.05, fixed: 144.28 },
  ],
  weekly: [
    { from: 0.01, to: 137.50, rate: 0, excess: 0, fixed: 0 },
    { from: 137.51, to: 223.81, rate: 0.10, excess: 137.50, fixed: 4.42 },
    { from: 223.82, to: 509.52, rate: 0.20, excess: 223.81, fixed: 15 },
    { from: 509.53, to: null, rate: 0.30, excess: 509.52, fixed: 72.14 },
  ],
};

// Transcribed literally from the decree. The $106.20 fixed amount does not line
// up with half the December figure ($106.06) or six monthly ones ($106.02); the
// official table says $106.20, so it stays as published. Do not "correct" it.
export const JUNE_RECALC_TABLE: WithholdingBand[] = [
  { from: 0.01, to: 3300, rate: 0, excess: 0, fixed: 0 },
  { from: 3300.01, to: 5371.44, rate: 0.10, excess: 3300, fixed: 106.20 },
  { from: 5371.45, to: 12228.60, rate: 0.20, excess: 5371.44, fixed: 360 },
  { from: 12228.61, to: null, rate: 0.30, excess: 12228.60, fixed: 1731.42 },
];

export const DECEMBER_RECALC_TABLE: WithholdingBand[] = [
  { from: 0.01, to: 6600, rate: 0, excess: 0, fixed: 0 },
  { from: 6600.01, to: 10742.86, rate: 0.10, excess: 6600, fixed: 212.12 },
  { from: 10742.87, to: 24457.14, rate: 0.20, excess: 10742.86, fixed: 720 },
  { from: 24457.15, to: null, rate: 0.30, excess: 24457.14, fixed: 3462.86 },
];

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

// Labor Code article 198: one year and under three, 15 days; three and under
// ten, 19 days; ten or more, 21 days. The October 2025 reform amended articles
// 197, 200 and 202 — the dates — and left this scale untouched. Under a year
// the caller prorates these 15 days, which is what reformed article 197 grants.
// Takes completed years: with service measured in days, 1,095 days divides into
// exactly 3.0 while the third anniversary is still a day away.
function aguinaldoDays(completedYears: number) {
  if (completedYears >= 10) return 21;
  if (completedYears >= 3) return 19;
  return 15;
}

/**
 * Every accrual in a settlement is priced as days over 365, counting both the
 * first and the last day worked. That is what the MTPS calculator does, and it
 * differs from counting whole anniversaries in two ways worth keeping: a leap
 * day inside a year of service is paid, and the day of departure is paid.
 */
const YEAR_DAYS = 365;

export const QUINCENA25 = {
  /** Article 2: only salaries at or below this monthly figure. */
  salaryCeiling: 1500,
  /** Article 2: half the monthly nominal salary. */
  rate: 0.5,
  /**
   * Article 1 starts the general regime in 2027; article 6 leaves 2026
   * voluntary for private employers, so nothing is owed as of right before
   * then and the estimate stays silent.
   */
  mandatoryFrom: "2027-01-01",
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
    indemnity: 0, eligibleForResignationBenefit: false, pendingSalary: 0,
    vacationDays: 0, vacation: 0, aguinaldoDays: 0, aguinaldo: 0,
    quincena25: 0, quincena25Applies: false, total: 0,
  };

  const salary = Math.max(0, input.monthlySalary || 0);
  const dailySalary = salary / 30;
  const service = calendarService(start, end);

  // Split the way the MTPS statement does — complete years, then the days past
  // the last anniversary — because each line is rounded on its own and summing
  // the rounded parts is what reproduces the official figure to the cent.
  const yearsDays = Math.round((service.anniversary.getTime() - start.getTime()) / DAY_MS);
  const fractionDays = Math.round((end.getTime() - service.anniversary.getTime()) / DAY_MS) + 1;
  const serviceDays = yearsDays + fractionDays;

  const wage = minimumWageAt(isoDate(end));
  const capMultiplier = input.termination === "dismissal" ? 4 : 2;
  const indemnityBaseDaily = Math.min(dailySalary, wage.table.daily[input.sector] * capMultiplier);
  const eligibleForResignationBenefit = service.completedYears >= 2;

  // Article 58 grants 30 days per year "y proporcionalmente por fracciones de
  // año", with a 15-day floor. Article 8 of the Voluntary Resignation Law says
  // 15 days "por cada año de servicio"; this estimator used to read that as
  // complete years only, but the MTPS calculator — the official service this
  // site links to — pays the fraction as a separate line, so it is paid here.
  const daysPerYear = input.termination === "dismissal" ? 30 : 15;
  const accrue = (days: number) => round2(indemnityBaseDaily * daysPerYear * days / YEAR_DAYS);
  const earned = input.termination === "dismissal" || eligibleForResignationBenefit
    ? accrue(yearsDays) + accrue(fractionDays)
    : 0;
  const indemnity = input.termination === "dismissal"
    ? Math.max(earned, indemnityBaseDaily * 15)
    : earned;

  const pendingSalary = dailySalary * Math.max(0, input.pendingSalaryDays || 0);
  const proportionalVacationDays = 15 * fractionDays / YEAR_DAYS;
  const vacationDays = 15 * Math.max(0, input.unusedVacationPeriods || 0) + proportionalVacationDays;
  const vacation = dailySalary * vacationDays * 1.30;

  const year = end.getUTCFullYear();
  // The 2025 reform moved the qualifying date and the article 202 payment window
  // to 20 October, so an employee who reaches that date has already earned the
  // whole bonus. Month index 9 is October on purpose.
  // https://www.mtps.gob.sv/2025/10/27/entrega-anticipada-de-aguinaldo-es-opcional-de-empresarios/
  const cutoff = new Date(Date.UTC(year, 9, 20));
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const workStartThisYear = start > yearStart ? start : yearStart;
  // Share of the year's bonus already earned, 0 to 1, kept separate from the
  // day scale so the Quincena 25 can reuse it without repeating the rules.
  let aguinaldoFraction = 0;
  let fullAguinaldoDays = aguinaldoDays(service.completedYears);
  if (workStartThisYear <= end) {
    if (end < cutoff) {
      aguinaldoFraction = daysInclusive(workStartThisYear, end) / YEAR_DAYS;
    } else {
      const atCutoff = calendarService(start, cutoff);
      fullAguinaldoDays = aguinaldoDays(atCutoff.completedYears);
      aguinaldoFraction = atCutoff.completedYears >= 1
        ? 1
        : daysInclusive(workStartThisYear, cutoff) / YEAR_DAYS;
    }
  }
  const earnedAguinaldoDays = input.aguinaldoPaid ? 0 : fullAguinaldoDays * Math.min(1, aguinaldoFraction);
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

  return {
    invalid: false,
    serviceYears: serviceDays / YEAR_DAYS,
    serviceDays,
    completedYears: service.completedYears,
    minimumWageDecree: wage.table.decree,
    minimumWagePredatesTables: wage.predatesTables,
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
    aguinaldoDays: earnedAguinaldoDays,
    aguinaldo: round2(aguinaldo),
    total: round2(total),
    startDate: isoDate(start),
    endDate: isoDate(end),
  };
}

export function withholdingForTaxable(taxable: number, frequency: PayFrequency) {
  const amount = Math.max(0, round2(taxable));
  const table = WITHHOLDING_TABLES[frequency];
  const band = table.find((item) => item.to === null || amount <= item.to) ?? table.at(-1)!;
  return {
    band: table.indexOf(band) + 1,
    amount: round2(band.fixed + Math.max(0, amount - band.excess) * band.rate),
    rate: band.rate,
  };
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
  // The Integral Pension System Law (arts. 14 and 16) sets the employee rate at
  // 7.25% of the monthly contributory salary, with no maximum base.
  const afp = input.includeAfp === false ? 0 : round2(gross * 0.0725);
  // ISSS caps the contributory salary at $1,000 per month. Payrolls that are not
  // monthly get that ceiling spread over the period, which is an approximation:
  // the institute settles contributions on a monthly planilla, so a weekly run
  // can land a few cents away from the monthly settlement.
  const isssCap = 12000 / periods;
  const isss = input.includeIsss === false ? 0 : round2(Math.min(gross, isssCap) * 0.03);
  const taxableBeforeFixedDeduction = round2(Math.max(0, gross - afp - isss));
  // Article 29 caps the $1,600 fixed deduction by "renta obtenida", which
  // article 2 defines as the salary and remuneration received — the gross, not
  // the base left after pension and health contributions.
  const declaredAnnual = round2(Math.max(0, input.annualGross || 0));
  const annualIncome = declaredAnnual > 0 ? declaredAnnual : round2(gross * periods);
  const qualifiesForFixedDeduction = annualIncome <= 9100;
  // Executive Decree 10/2025 states that band II does not build the $1,600
  // deduction into its fixed amount, so it belongs in the periodic withholding
  // and not only in the annual return.
  const fixedDeduction = input.applyFixedDeduction !== false && qualifiesForFixedDeduction
    ? round2(1600 / periods)
    : 0;
  const taxable = round2(Math.max(0, taxableBeforeFixedDeduction - fixedDeduction));
  const withholding = withholdingForTaxable(taxable, input.frequency);
  const net = round2(gross - afp - isss - withholding.amount);
  return {
    gross, afp, isss, fixedDeduction, qualifiesForFixedDeduction,
    annualIncome, annualIncomeDeclared: declaredAnnual > 0,
    taxableBeforeFixedDeduction, taxable, isr: withholding.amount,
    band: withholding.band, marginalRate: withholding.rate, net,
  };
}
