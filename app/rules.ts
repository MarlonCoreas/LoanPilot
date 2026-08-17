import type { Page } from "./routes";
import type { OFFICIAL } from "./sources";

/**
 * Every statutory figure the calculators apply, with the document behind it.
 *
 * The constants used to sit inline in `statutory.ts` and `overtime.ts`, each
 * explained by a comment, and the whole site made one freshness claim from a
 * single hand-edited `RULES_REVIEWED` string. That string could not be wrong in
 * a way anything would catch: a decree could change and the badge would keep
 * saying the sources had been checked.
 *
 * `MINIMUM_WAGE_TABLES` already solved this for one figure — versions newest
 * first, resolved by the date the calculation is priced at. This file is that
 * same shape applied to the rest, so that every number carries:
 *
 *   value     what the calculation multiplies by
 *   unit      what the value counts, written out, so a magnitude error shows
 *   norm      the article or decree a reader can look up
 *   source    which official document has to be opened to check it
 *   from      the first day the version applies
 *   reviewed  the day a human last read it back against that document
 *
 * Nothing here is derived from anything else. A figure that only exists as
 * "the monthly one times twelve" is written as the monthly one and multiplied
 * at the point of use, because the annualised form is what hides an error.
 *
 * WHERE A FIGURE MAY COME FROM. A decree, a consolidated text, or a publication
 * of the institution that administers the rule — nothing else. A number never
 * enters this file from the press, however widely a reform was reported: a
 * newspaper is evidence that something changed, not evidence of what it now
 * says, and the two are indistinguishable once the article is a year old. When
 * only the press has the text, the rule stays on its previous version and the
 * gap is written down rather than filled in.
 *
 * WHAT A NOTE SHOUTS. Some values are not readings of a text, and the note says
 * so in its first word, so that nobody later mistakes a decision for a citation:
 *
 *   UNSOURCED     no document fixes it; the value is this project's own choice
 *   DISPUTED      the sources conflict, or a text and the official practice do
 *   NOT MODELLED  the rule exists and this project does not apply it
 */

export type SourceKey = keyof typeof OFFICIAL;

/**
 * What a value counts. It exists to be read, not to be computed with: the
 * ISSS ceiling was stored as the annual 12,000 next to a comment describing a
 * $1,000 monthly ceiling, and only a unit written down beside the number makes
 * that kind of mismatch visible without re-deriving the arithmetic.
 */
export type RuleUnit =
  | "usd/month" | "usd/year" | "usd/day-by-sector"
  | "ratio" | "multiple-of-daily-minimum-wage" | "multiple-of-hourly-wage"
  | "days" | "days/year" | "days/month" | "years" | "months"
  | "hours/day" | "hour-of-day" | "hours-by-shift"
  | "date" | "date-by-sector" | "day-of-year"
  | "usd-bands" | "days-by-seniority"
  /** Which ways of ending a contract a line is paid on. */
  | "terminations"
  /** What a payment is kept out of: withholdings, bases, attachment. */
  | "exclusions"
  /** Not applied by any calculation: recorded so the gap stays under review. */
  | "not-modelled";

export type RuleVersion<T> = {
  /** First day this version applies, inclusive. */
  from: string;
  value: T;
  /** The article or decree that carries it, written so a reader can look it up. */
  norm: string;
  /** Which document in `OFFICIAL` has to be opened to check the value. */
  source: SourceKey;
  /** The day a human last read this value back against that document. */
  reviewed: string;
  /** What the source does not settle, when it does not settle it. */
  note?: string;
};

export type Rule<T> = {
  id: string;
  unit: RuleUnit;
  /** Newest first, the way `ruleAt` walks them. */
  versions: [RuleVersion<T>, ...RuleVersion<T>[]];
};

/** A rule of any value type, for the code that only reads the metadata. */
export type AnyRule = Rule<unknown>;

const rule = <T>(spec: Rule<T>): Rule<T> => spec;

/**
 * The version in force on a given day, and whether that day predates every
 * version this project has actually verified.
 *
 * `predatesRule` is the honest half. A settlement dated before the oldest
 * table gets priced with that table anyway — there is nothing else to price it
 * with — but the caller has to be able to say so on screen rather than let a
 * stand-in pass for the rate of the day.
 */
export function ruleAt<T>(subject: Rule<T>, isoDate: string) {
  const version = subject.versions.find((item) => isoDate >= item.from);
  return { version: version ?? subject.versions.at(-1)!, predatesRule: !version };
}

/** The newest version's value: what "in force today" means for a live page. */
export function currentValue<T>(subject: Rule<T>): T {
  return subject.versions[0].value;
}

// --- Shapes the rules carry ------------------------------------------------

export type WageSector = "commerce" | "maquila" | "coffee" | "agriculture";
/** The two halves article 6 of Decree 499 puts on different timetables. */
export type Quincena25Sector = "public" | "private";
export type PayFrequency = "monthly" | "fortnightly" | "weekly";
export type RecalcPeriod = "june" | "december";
export type ShiftKind =
  | "diurnal" | "nocturnal" | "dangerousDiurnal" | "dangerousNocturnal"
  | "minorUnder16" | "minor16to17";

export type WithholdingBand = {
  from: number;
  to: number | null;
  rate: number;
  excess: number;
  fixed: number;
};

/** A step of the article 198 scale, read at whatever date the caller decides. */
export type AguinaldoStep = { fromCompletedYears: number; days: number };

/** A day of the year that does not move with the calendar year. */
export type YearDay = { month: number; day: number };

export type ShiftLimit = { day: number; week: number; nocturnalFrom: number };

// --- Employment settlement --------------------------------------------------

export const minimumWage = rule<Record<WageSector, number>>({
  id: "minimumWage",
  unit: "usd/day-by-sector",
  versions: [
    {
      // Executive Decree 12/2025, which replaced articles 2, 3(a) and 6 of
      // Decree 11/2025 with a single table broken down by sector. The decree
      // states the monthly equivalent as the daily rate times 365/12, not 30.
      //
      // Only tables this project has read back against their decree are listed;
      // an earlier termination is priced with the oldest one and flagged, which
      // is visible guesswork rather than the silent kind.
      from: "2025-06-01",
      value: {
        commerce: 13.44,   // comercio, servicios, industria, ingenios, agroindustria
        maquila: 13.227,   // maquila textil y confección
        coffee: 10.035,    // beneficios de café y recolección de caña de azúcar
        agriculture: 8.96, // agropecuario, pesca y recolección de café
      },
      norm: "D.E. 12/2025",
      source: "minimumWage",
      reviewed: "2026-08-14",
    },
  ],
});

export const severanceDaysPerYear = rule<number>({
  id: "severanceDaysPerYear",
  unit: "days/year",
  versions: [{
    from: "1972-10-31",
    value: 30,
    norm: "Código de Trabajo art. 58",
    source: "laborCode",
    reviewed: "2026-08-14",
    note: "Article 58 grants these 30 days per year \"y proporcionalmente por fracciones de año\".",
  }],
});

export const severanceMinimumDays = rule<number>({
  id: "severanceMinimumDays",
  unit: "days",
  versions: [{
    from: "1972-10-31",
    value: 15,
    norm: "Código de Trabajo art. 58",
    source: "laborCode",
    reviewed: "2026-08-14",
  }],
});

export const severanceWageCap = rule<number>({
  id: "severanceWageCap",
  unit: "multiple-of-daily-minimum-wage",
  versions: [{
    from: "1972-10-31",
    value: 4,
    norm: "Código de Trabajo art. 58",
    source: "laborCode",
    reviewed: "2026-08-14",
    note: "The cap is on the \"salario mínimo diario legal vigente\", so it moves with the wage table rather than with this multiple.",
  }],
});

export const resignationDaysPerYear = rule<number>({
  id: "resignationDaysPerYear",
  unit: "days/year",
  versions: [{
    from: "2015-01-01",
    value: 15,
    norm: "Ley Reguladora de la Prestación Económica por Renuncia Voluntaria (D.L. 592) art. 8",
    source: "resignation",
    reviewed: "2026-08-14",
    note: "Article 8 says \"por cada año de servicio\" and, unlike article 58, does not name fractions. The MTPS calculator pays the fraction as its own line, and this project follows the official service.",
  }],
});

export const resignationWageCap = rule<number>({
  id: "resignationWageCap",
  unit: "multiple-of-daily-minimum-wage",
  versions: [{
    from: "2015-01-01",
    value: 2,
    norm: "Ley Reguladora de la Prestación Económica por Renuncia Voluntaria (D.L. 592) art. 8",
    source: "resignation",
    reviewed: "2026-08-14",
  }],
});

export const resignationMinimumService = rule<number>({
  id: "resignationMinimumService",
  unit: "years",
  versions: [{
    from: "2015-01-01",
    value: 2,
    norm: "Ley Reguladora de la Prestación Económica por Renuncia Voluntaria (D.L. 592) art. 2",
    source: "resignation",
    reviewed: "2026-08-14",
    note: "Continuous years with the same employer. Entitlement also requires statutory notice and the resignation formalities, which this estimate cannot check.",
  }],
});

/**
 * The divisor that turns a monthly salary into a daily one.
 *
 * Deliberately not the 365/12 ≈ 30.42 that the wage decree uses for its own
 * monthly equivalent. Article 183 fixes the *base* — "el salario básico que
 * devengue", for salaries stipulated by unit of time — but names no divisor,
 * and neither does article 142, which defines the daily wage in the other
 * direction (hourly rate times the hours of the ordinary shift). The law does
 * not resolve it.
 *
 * What resolves it is the MTPS constancia reproduced in the tests:
 * 937.54/30 x (15 x 54/365) x 1.30 gives the $90.16 the statement prints, where
 * 30.42 would give $88.92. So the 30 is anchored empirically, to the official
 * service, and not to a text. Changing it breaks that reconciliation.
 */
export const dailySalaryDivisor = rule<number>({
  id: "dailySalaryDivisor",
  unit: "days/month",
  versions: [{
    from: "1972-10-31",
    value: 30,
    norm: "Código de Trabajo arts. 142 y 183 (ninguno fija el divisor)",
    source: "laborService",
    reviewed: "2026-08-16",
    note: "Anchored empirically to the MTPS calculator, not to a statutory text: article 183 sets the base and article 142 defines the daily wage from the hourly one, so neither settles the divisor.",
  }],
});

/**
 * Days a year of accrual is spread over.
 *
 * Every accrual in a settlement is priced as days over 365, counting both the
 * first and the last day worked, which is what the MTPS calculator does. It
 * differs from counting whole anniversaries in two ways worth keeping: a leap
 * day inside a year of service is paid, and the day of departure is paid.
 */
export const accrualYearDays = rule<number>({
  id: "accrualYearDays",
  unit: "days/year",
  versions: [{
    from: "1972-10-31",
    value: 365,
    norm: "Código de Trabajo art. 58 (\"proporcionalmente por fracciones de año\")",
    source: "laborService",
    reviewed: "2026-08-16",
    note: "Leap years are not given a 366th day: the MTPS calculator prorates over 365 and pays the leap day as an extra day of service instead.",
  }],
});

// --- Vacation ---------------------------------------------------------------

export const vacationDaysPerYear = rule<number>({
  id: "vacationDaysPerYear",
  unit: "days/year",
  versions: [{
    from: "1972-10-31",
    value: 15,
    norm: "Código de Trabajo art. 177",
    source: "vacation",
    reviewed: "2026-08-16",
    note: "Article 177: fifteen days after one continuous year with the same employer. Article 179 counts those years from the hire date, expiring on the corresponding date of each later year, which is the anniversary this module measures from.",
  }],
});

export const vacationSurcharge = rule<number>({
  id: "vacationSurcharge",
  unit: "ratio",
  versions: [{
    from: "1972-10-31",
    value: 0.30,
    norm: "Código de Trabajo art. 177",
    source: "vacation",
    reviewed: "2026-08-16",
    note: "\"El salario ordinario correspondiente a dicho lapso más un 30% del mismo\": the surcharge is on the ordinary salary of the period, and it does not compound across periods.",
  }],
});

/**
 * Who is owed the part-year of vacation still running when the job ends.
 *
 * DISPUTED, and the divergence is the point. Article 187 grants that
 * proportional part in one sentence and takes it back in the next:
 *
 *   "Cuando se declare terminado un contrato de trabajo con responsabilidad
 *   para el patrono, o cuando el trabajador fuere despedido de hecho sin causa
 *   legal, tendrá derecho a que se le pague la remuneración de los días que, de
 *   manera proporcional al tiempo trabajado, le correspondan en concepto de
 *   vacaciones. Pero si ya hubiere terminado el año continuo de servicio,
 *   aunque el contrato terminare sin responsabilidad para el patrono, éste
 *   deberá pagar al trabajador la retribución a que tiene derecho en concepto
 *   de vacaciones."
 *
 * Read literally: the proportional part belongs to dismissal, and a contract
 * that ends without employer responsibility — a voluntary resignation — carries
 * only the vacation of years already completed. The second sentence exists
 * precisely to name what the resigning worker does keep, and the part-year is
 * not in it.
 *
 * The official service does not apply that reading. The MTPS statement the test
 * suite reconciles against is a VOLUNTARY RESIGNATION — its $26.88 daily base
 * is two daily minimum wages, the resignation cap of article 8, and its benefit
 * runs at 15 days a year — and it still prints $90.16 of proportional vacation
 * for the 54 days past the last anniversary. `calculateSettlement` reproduces
 * that figure to the cent, which it could only do by paying the fraction on a
 * resignation.
 *
 * So this module pays it on both, following the ministry rather than the
 * sentence. The rule is recorded rather than resolved: what is in front of us
 * is a text and a practice that disagree, and the honest thing a calculator can
 * do is apply one, name the other, and say which is which. The settlement page
 * and the vacation entry in `faq.ts` carry the same divergence in the reader's
 * language.
 */
export const vacationProportionalOnExit = rule<{
  literal: ("dismissal" | "resignation")[];
  applied: ("dismissal" | "resignation")[];
}>({
  id: "vacationProportionalOnExit",
  unit: "terminations",
  versions: [{
    from: "1972-10-31",
    value: { literal: ["dismissal"], applied: ["dismissal", "resignation"] },
    norm: "Código de Trabajo art. 187",
    source: "laborService",
    reviewed: "2026-08-16",
    note: "DISPUTED. Article 187 reads as dismissal only; the MTPS calculator pays the fraction on resignation too, and that statement is what this module reconciles against. Applying the literal text would drop the $90.16 line from the reconciliation and change the answer for every resignation on the site.",
  }],
});

/**
 * Two vacation rules the calculator does not model, recorded so the omission is
 * a stated limitation rather than a silence.
 *
 * They have no `value` to apply because nothing applies them; they are here so
 * the staleness check keeps them under review with everything else, and so a
 * reader looking for them finds out they are missing on purpose.
 */
export const vacationUnmodelled = rule<{ qualifyingDaysWorked: number; boardAndLodgingSurcharge: number }>({
  id: "vacationUnmodelled",
  unit: "not-modelled",
  versions: [{
    from: "1972-10-31",
    value: { qualifyingDaysWorked: 200, boardAndLodgingSurcharge: 0.25 },
    norm: "Código de Trabajo arts. 180 y 184",
    source: "vacation",
    reviewed: "2026-08-16",
    note: "NOT MODELLED. Article 180 requires 200 days worked in the year to earn vacation at all, and this calculator never asks how many days were actually worked. Article 184 adds 25% for each of lodging and board provided by the employer, which the form has no field for. Both make the vacation line an over-estimate for the workers they touch.",
  }],
});

// --- Year-end bonus (aguinaldo) --------------------------------------------

export const aguinaldoScale = rule<AguinaldoStep[]>({
  id: "aguinaldoScale",
  unit: "days-by-seniority",
  versions: [{
    // Ordered highest step first, the way the lookup walks it. The 0-year step
    // is the same 15 days as the 1-year one: under a year the caller prorates
    // them, which is what reformed article 197 grants.
    from: "1972-10-31",
    value: [
      { fromCompletedYears: 10, days: 21 },
      { fromCompletedYears: 3, days: 19 },
      { fromCompletedYears: 0, days: 15 },
    ],
    norm: "Código de Trabajo art. 198",
    source: "laborCode",
    reviewed: "2026-08-16",
    note: "Legislative Decree 433 of 15 October 2025 amended articles 197, 200 and 202 — the dates — and did not touch article 198. The scale still carries its pre-reform amendment markers (4) and (14) in the consolidated text.",
  }],
});

/**
 * The day seniority is read at, and by which the bonus is fully earned.
 *
 * Articles 197, 200 and 202 all keyed on 12 December until Legislative Decree
 * 433 moved them to 20 October. Both versions are listed because a settlement is
 * priced with the rule in force on the last day worked, and a termination in
 * 2024 was governed by the December date.
 *
 * The decree is cited at one remove, and the reason is worth keeping. The
 * Asamblea's consolidated Labour Code has not absorbed the reform: as of
 * 16 August 2026 its articles 197, 200 and 202 still read "doce de diciembre",
 * so the text `laborCode` points at contradicts the value in force. The
 * decree-grade citation is instead the fifth recital of Legislative Decree 440,
 * which names D.L. 433 and 434 of 15 October 2025, published in Diario Oficial
 * 194, Tomo 449, of that same day, and states the window they opened. That is
 * why `aguinaldoDecree` and not a news report: see the note at the top of
 * `sources.ts`.
 *
 * FOR THE AGUINALDO PASS, NOT ACTED ON HERE. Reformed article 202 carries the
 * same restrictive formula as article 187 — it grants the proportional bonus
 * "cuando se declare terminado un contrato de trabajo con responsabilidad para
 * el patrono, o cuando el trabajador fuere despedido de hecho sin causa legal",
 * and names no other case. `calculateSettlement` pays the proportional bonus on
 * resignation as well, exactly as it pays proportional vacation, and on the same
 * unexamined footing: see `vacationProportionalOnExit`, where the divergence for
 * vacation is at least reconciled against an MTPS statement. The bonus has no
 * such reconciliation — the statement's aguinaldo line is the one figure the
 * suite leaves uncompared — so the parallel is recorded and not resolved.
 *
 * Also for that pass: the same October 2025 package exempted the bonus from
 * income tax up to $1,500, but as a TRANSITORY provision for the 2025 fiscal
 * year alone. It is not modelled, and it must not be carried into a later year
 * without a decree that re-enacts it.
 */
export const aguinaldoCutoff = rule<YearDay>({
  id: "aguinaldoCutoff",
  unit: "day-of-year",
  versions: [
    {
      from: "2025-10-20",
      value: { month: 10, day: 20 },
      norm: "D.L. 433 del 15 de octubre de 2025 (D.O. 194, Tomo 449), que reforma los arts. 197, 200 y 202 del Código de Trabajo",
      source: "aguinaldoDecree",
      reviewed: "2026-08-16",
      note: "Cited through the fifth recital of D.L. 440, which gives the decree number, date and Diario Oficial. The Asamblea's consolidated Labour Code still carried the pre-reform \"doce de diciembre\" when this was last read; swap the source for D.L. 433 itself, or for the updated consolidation, as soon as either is published.",
    },
    {
      from: "1972-10-31",
      value: { month: 12, day: 12 },
      norm: "Código de Trabajo arts. 197, 200 y 202, texto anterior a la reforma de 2025",
      source: "laborCode",
      reviewed: "2026-08-16",
      note: "Recorded for the record only. `calculateSettlement` applies the current cutoff to every year; wiring this version in would move every pre-2025 bonus this suite pins, and needs its own decision.",
    },
  ],
});

/**
 * The day the bonus year starts accruing.
 *
 * DISPUTED. Articles 196 to 202 name the qualifying date and the payment window
 * and say the leaver is owed the part "proporcional al tiempo trabajado" — but
 * no article in the chapter says what period that proportion runs over. What
 * used to be recorded here as simply unsourced is now known to be a live
 * disagreement, with two readings in the field and neither one written down in
 * a text:
 *
 *   1 JANUARY, the calendar year, which is what this module applies and what
 *   the MTPS told this project when asked how an early payment is worked out:
 *   the anticipated bonus is calculated AS IF it were being paid in December,
 *   so moving the payment forward does not shorten the period it covers.
 *
 *   12 DECEMBER, the cycle that closes on the old qualifying date. The MTPS
 *   statement reproduced in the tests only reconciles on this reading, which is
 *   why that statement's aguinaldo line is the one figure the reconciliation
 *   leaves uncompared. Accounting practice has not converged either: both the
 *   12 December date and the reformed 20 October one are in current use.
 *
 * The value does not move on this note. Naming the second reading is not a
 * reason to adopt it, and switching cycles would silently change every
 * proportional bonus the suite pins. What settles it is a document that states
 * the accrual period, and no article in chapter VII does.
 */
export const aguinaldoCycleStart = rule<YearDay>({
  id: "aguinaldoCycleStart",
  unit: "day-of-year",
  versions: [{
    from: "1972-10-31",
    value: { month: 1, day: 1 },
    norm: "Sin norma que lo fije: arts. 196-202 no definen el período de devengo",
    source: "laborCode",
    reviewed: "2026-08-16",
    note: "DISPUTED. Two readings are in use and no text settles either: the calendar year, which the MTPS supports by treating an early payment as if made in December, and a 12 December cycle, which is the only reading that reconciles the MTPS statement in the tests. Practice also still mixes the 12 December and 20 October dates. The value stays on the calendar year until a source states the accrual period.",
  }],
});

// --- Quincena 25 ------------------------------------------------------------
//
// The document these four rules read is the Ley Especial Quincena Veinticinco,
// Legislative Decree 499 of 14 January 2026, published in Diario Oficial 8, Tomo
// 450, of that same day. It is a nine-article law of its own, not an amendment
// to the Labour Code, and `sources.ts` carries it as `quincena25`.
//
// They used to point at `laborCode`, which does not contain it and does carry
// its own "D. L. No. 499, 8 DE ABRIL DE 1976" in the amendment table at the end.
// Two different decrees share the number, and the citation sent a reader to the
// one from the wrong half-century. The values below were read back against the
// decree's own text on the day in `reviewed`, and the quotations in the notes
// are verbatim from it.

export const quincena25SalaryCeiling = rule<number>({
  id: "quincena25SalaryCeiling",
  unit: "usd/month",
  versions: [{
    from: "2026-01-14",
    value: 1500,
    norm: "Ley Especial Quincena Veinticinco (D.L. 499 del 14 de enero de 2026) art. 2",
    source: "quincena25",
    reviewed: "2026-08-16",
    note: "A ceiling on eligibility, not on the amount: article 2 applies the benefit \"solo […] para aquellos trabajadores cuyo salario básico o nominal mensual sea igual o inferior a mil quinientos dólares\", so a salary a cent above it carries no benefit at all rather than a capped one.",
  }],
});

export const quincena25Rate = rule<number>({
  id: "quincena25Rate",
  unit: "ratio",
  versions: [{
    from: "2026-01-14",
    value: 0.5,
    norm: "Ley Especial Quincena Veinticinco (D.L. 499 del 14 de enero de 2026) art. 2",
    source: "quincena25",
    reviewed: "2026-08-16",
    note: "\"El cincuenta por ciento (50%) sobre el salario básico o nominal mensual\" being earned when the payment falls due — the monthly salary, not the pay period, which is why a fortnightly payroll does not halve it.",
  }],
});

/**
 * What the decree keeps the benefit out of, which is everything.
 *
 * Declared rather than computed, in the shape of `vacationProportionalOnExit`:
 * nothing here is multiplied by anything. It exists because two calculators owe
 * the reader an explanation they cannot give from a rate and a ceiling — the
 * settlement, for why the benefit sits on its own line instead of raising the
 * base of the others, and the payroll checker, for why a Quincena 25 inside the
 * taxable gross is a reason for a withholding to come out too high.
 *
 * Article 1, second paragraph, is the whole of it: the benefit is paid "de forma
 * íntegra y sin ningún descuento", is "independiente del salario ordinario,
 * aguinaldo, compensación adicional en efectivo y de otras prestaciones", "no
 * formará parte de la base de cálculo de otras prestaciones, por lo que no será
 * objeto de ninguna clase de retención", and "en ningún caso deberá ser objeto
 * de retención ni descuento alguno por concepto de aportes u otras obligaciones
 * de Seguridad Social o del Régimen Previsional". Article 4 adds the tax side:
 * "se declara como rentas no gravables, y en consecuencia excluidos del cómputo
 * de la renta obtenida", not subject to income tax withholding, and unattachable.
 */
export const quincena25Exempt = rule<{
  withholdings: ("isr" | "isss" | "afp")[];
  inBenefitBase: boolean;
  attachable: boolean;
}>({
  id: "quincena25Exempt",
  unit: "exclusions",
  versions: [{
    from: "2026-01-14",
    value: { withholdings: [], inBenefitBase: false, attachable: false },
    norm: "Ley Especial Quincena Veinticinco (D.L. 499 del 14 de enero de 2026) arts. 1 y 4",
    source: "quincena25",
    reviewed: "2026-08-16",
    note: "`withholdings` is empty because no deduction of any kind may be made: article 1 rules out social security and pension contributions and article 4 rules out income tax withholding. `inBenefitBase` is false, so the figure never enters the base of the settlement or of the year-end bonus.",
  }],
});

/**
 * The day the benefit stops being optional, which is not the same day for
 * everyone.
 *
 * Article 1 opens the general regime "a partir del año dos mil veintisiete" for
 * public servants, municipal employees and private-sector workers alike, and
 * article 6 then carves 2026 out of it in two different directions: the public
 * sector "gozará" of the benefit in the 2026 fiscal year, with institutions
 * ordered to move budget for it, while for the private sector that same year the
 * payment "tendrá carácter voluntario para los patronos" against a tax credit.
 *
 * A single date could not say that, and the one that used to be here — 1 January
 * 2027 — said the private half and silently made the same claim about the
 * public one. The public date is the day the decree took effect under article 9,
 * because that is when the article 6 obligation for the 2026 fiscal year exists;
 * there is no separate commencement for it.
 */
export const quincena25MandatoryFrom = rule<Record<Quincena25Sector, string>>({
  id: "quincena25MandatoryFrom",
  unit: "date-by-sector",
  versions: [{
    from: "2026-01-14",
    value: { public: "2026-01-14", private: "2027-01-01" },
    norm: "Ley Especial Quincena Veinticinco (D.L. 499 del 14 de enero de 2026) arts. 1, 6 y 9",
    source: "quincena25",
    reviewed: "2026-08-16",
    note: "The settlement calculator is private-sector only — it is governed by the Labour Code throughout — so it reads the private date and nothing is owed as of right before 2027. The public date is recorded so the distinction is declared rather than assumed away.",
  }],
});

// --- Payroll withholding ----------------------------------------------------

export const withholdingTables = rule<Record<PayFrequency, WithholdingBand[]>>({
  id: "withholdingTables",
  unit: "usd-bands",
  versions: [{
    from: "2025-05-01",
    value: {
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
    },
    norm: "Decreto Ejecutivo 10/2025 art. 1 literales a), b) y c)",
    source: "withholding",
    reviewed: "2026-08-14",
    note: "Decree 10/2025 derogated Decree 95/2015 with effect from May 2025. Literal e) leaves the $1,600 out of band II alone; bands III and IV already carry it inside their limits.",
  }],
});

export const recalcTables = rule<Record<RecalcPeriod, WithholdingBand[]>>({
  id: "recalcTables",
  unit: "usd-bands",
  versions: [{
    from: "2025-05-01",
    value: {
      june: [
        { from: 0.01, to: 3300, rate: 0, excess: 0, fixed: 0 },
        { from: 3300.01, to: 5371.44, rate: 0.10, excess: 3300, fixed: 106.20 },
        { from: 5371.45, to: 12228.60, rate: 0.20, excess: 5371.44, fixed: 360 },
        { from: 12228.61, to: null, rate: 0.30, excess: 12228.60, fixed: 1731.42 },
      ],
      december: [
        { from: 0.01, to: 6600, rate: 0, excess: 0, fixed: 0 },
        { from: 6600.01, to: 10742.86, rate: 0.10, excess: 6600, fixed: 212.12 },
        { from: 10742.87, to: 24457.14, rate: 0.20, excess: 10742.86, fixed: 720 },
        { from: 24457.15, to: null, rate: 0.30, excess: 24457.14, fixed: 3462.86 },
      ],
    },
    norm: "Decreto Ejecutivo 10/2025 art. 1 literal f), numerales 1) y 2)",
    source: "withholding",
    reviewed: "2026-08-14",
    note: "Transcribed literally. The June $106.20 does not line up with half the December figure ($106.06) or six monthly ones ($106.02); it is inherited unchanged from Decree 95/2015, whose June band started at $2,832 instead of $3,300, and the official table still says $106.20. It stays as published — do not \"correct\" it.",
  }],
});

export const recalcMonths = rule<Record<RecalcPeriod, number>>({
  id: "recalcMonths",
  unit: "months",
  versions: [{
    from: "2025-05-01",
    value: { june: 6, december: 12 },
    norm: "Decreto Ejecutivo 10/2025 art. 1 literal f)",
    source: "withholding",
    reviewed: "2026-08-14",
    note: "Literal f) accumulates January to June for the first recalculation and the whole \"ejercicio o período de imposición\" for the second. Both tables are the periodic ones scaled by exactly these months: June band I ends at 550 x 6 and December's at 550 x 12.",
  }],
});

export const afpEmployeeRate = rule<number>({
  id: "afpEmployeeRate",
  unit: "ratio",
  versions: [{
    from: "2023-01-01",
    value: 0.0725,
    norm: "Ley Integral del Sistema de Pensiones arts. 14 y 16",
    source: "pensions",
    reviewed: "2026-08-14",
    note: "Of the monthly contributory salary, with no maximum base: the previous ceiling was repealed, so a high salary is not capped.",
  }],
});

export const isssEmployeeRate = rule<number>({
  id: "isssEmployeeRate",
  unit: "ratio",
  versions: [{
    from: "2015-01-01",
    value: 0.03,
    norm: "Reglamento para la Aplicación del Régimen del Seguro Social",
    source: "isss",
    reviewed: "2026-08-14",
  }],
});

/**
 * The ISSS contributory ceiling, stored the way the institute states it.
 *
 * It used to live in the code as `12000 / periods` beside a comment about a
 * $1,000 monthly ceiling. That was arithmetically right — 12,000/12 is exactly
 * 1,000 — but the stored number was the annualised form, so the file asserted
 * one magnitude and documented another, and nothing but the division reconciled
 * them. The monthly figure is the one the ISSS publishes; annualising it is a
 * step `calculatePayrollWithholding` takes and shows.
 */
export const isssMonthlyCeiling = rule<number>({
  id: "isssMonthlyCeiling",
  unit: "usd/month",
  versions: [{
    from: "2015-01-01",
    value: 1000,
    norm: "Lineamiento de modificación del salario máximo cotizable del ISSS",
    source: "isss",
    reviewed: "2026-08-14",
    note: "The institute settles contributions on a monthly planilla. Spreading this ceiling over a fortnightly or weekly period is this project's approximation and can land a few cents from the monthly settlement.",
  }],
});

export const fixedDeduction = rule<number>({
  id: "fixedDeduction",
  unit: "usd/year",
  versions: [{
    from: "2011-12-30",
    value: 1600,
    norm: "Ley de Impuesto sobre la Renta art. 29 numeral 7",
    source: "incomeTax",
    reviewed: "2026-08-14",
    note: "An annual figure. The payroll calculation divides it by the pay periods in a year and the recalculation scales it to the months each period covers, which is why it is stored annually and never per period.",
  }],
});

export const fixedDeductionIncomeLimit = rule<number>({
  id: "fixedDeductionIncomeLimit",
  unit: "usd/year",
  versions: [{
    from: "2011-12-30",
    value: 9100,
    norm: "Ley de Impuesto sobre la Renta art. 29 numeral 7",
    source: "incomeTax",
    reviewed: "2026-08-14",
    note: "Measured on \"renta obtenida\", which article 2 defines as the salary and remuneration received — the gross, not the base left after pension and health contributions.",
  }],
});

// --- Overtime ---------------------------------------------------------------

export const nightWindow = rule<{ startsAt: number; endsAt: number }>({
  id: "nightWindow",
  unit: "hour-of-day",
  versions: [{
    from: "1972-10-31",
    value: { startsAt: 19, endsAt: 6 },
    norm: "Código de Trabajo art. 161",
    source: "nightShift",
    reviewed: "2026-08-11",
    note: "\"Las diurnas están comprendidas entre las seis horas y las diecinueve horas de un mismo día; y las nocturnas, entre las diecinueve horas de un día y las seis horas del día siguiente.\"",
  }],
});

export const shiftLimits = rule<Record<ShiftKind, ShiftLimit>>({
  id: "shiftLimits",
  unit: "hours-by-shift",
  versions: [{
    from: "1972-10-31",
    value: {
      diurnal: { day: 8, week: 44, nocturnalFrom: 4 },
      nocturnal: { day: 7, week: 39, nocturnalFrom: 4 },
      dangerousDiurnal: { day: 7, week: 39, nocturnalFrom: 3.5 },
      dangerousNocturnal: { day: 6, week: 36, nocturnalFrom: 3.5 },
      // Art. 116 caps the under-16 shift and bars night work for anyone under
      // 18, so `nocturnalFrom` never gets used for either minor shift.
      minorUnder16: { day: 6, week: 34, nocturnalFrom: 4 },
      // Article 116 only constrains under-16s, so 16- and 17-year-olds take the
      // general limits of article 161.
      minor16to17: { day: 8, week: 44, nocturnalFrom: 4 },
    },
    norm: "Código de Trabajo arts. 116, 161 y 162",
    source: "workingHours",
    reviewed: "2026-08-11",
    note: "`nocturnalFrom` is the count of night hours above which a shift is nocturnal for the purpose of its duration: more than four under article 161, more than three and a half in dangerous or unhealthy work under article 162. `week` is displayed beside the shift picker and enters no calculation.",
  }],
});

export const minorOvertimeLimit = rule<number>({
  id: "minorOvertimeLimit",
  unit: "hours/day",
  versions: [{
    from: "1972-10-31",
    value: 2,
    norm: "Código de Trabajo art. 116",
    source: "workingHours",
    reviewed: "2026-08-11",
    note: "\"No podrán trabajar más de dos horas extraordinarias en un día\", for workers under sixteen.",
  }],
});

/**
 * Factors on the basic hourly wage; each expresses the total pay of that hour.
 *
 * The four night factors come from one rule worth writing down, because it is
 * in no single article. Articles 175 and 192 say that on a rest day or public
 * holiday "el cálculo para el pago de los recargos respectivos" is made on the
 * extraordinary salary of that day. The 25% night premium of article 168 is one
 * of those recargos, and the worked example the MTPS publishes fixes the order:
 * on an hour worth $1.50 the daytime overtime hour pays $3.00 and the night one
 * $3.74, so the 25% falls on the hour already surcharged by 100%, not on the
 * basic one. Applying that same order to the bases of 3 and 4 is what produces
 * 3.75 and 5.
 */
export const overtimeFactors = rule<{
  overtimeDiurnal: number; overtimeNocturnal: number; nightSurcharge: number;
  restDaySurcharge: number; restDayOvertimeDiurnal: number; restDayOvertimeNocturnal: number;
  holidaySurcharge: number; holidayOvertimeDiurnal: number; holidayOvertimeNocturnal: number;
}>({
  id: "overtimeFactors",
  unit: "multiple-of-hourly-wage",
  versions: [{
    from: "1972-10-31",
    value: {
      /** Art. 169: basic hour plus a 100% surcharge. */
      overtimeDiurnal: 2,
      /** Arts. 168-169, in the order of the MTPS example: 2 x 1.25. */
      overtimeNocturnal: 2.5,
      /** Art. 168: night premium on the ordinary hour. */
      nightSurcharge: 0.25,
      /** Art. 175: "más una remuneración del 50% como mínimo, por las horas que trabajen". */
      restDaySurcharge: 0.5,
      /** Art. 175: the base is that day's extraordinary salary (150%), plus 100%. */
      restDayOvertimeDiurnal: 3,
      restDayOvertimeNocturnal: 3.75,
      /**
       * Art. 192: a worked public holiday is worth double, and it is paid by the
       * DAY, not by the hour — the article says "salario ordinario más un
       * recargo del ciento por ciento de éste" without the "por las horas que
       * trabajen" that article 175 does carry. The contrast between the two
       * texts is deliberate, so a half-worked holiday is paid in full. This one
       * factor multiplies the daily wage; the other eight multiply the hourly.
       */
      holidaySurcharge: 1,
      /** Art. 192: the base is the holiday's extraordinary salary (200%), plus 100%. */
      holidayOvertimeDiurnal: 4,
      holidayOvertimeNocturnal: 5,
    },
    norm: "Código de Trabajo arts. 168, 169, 175 y 192",
    source: "overtimePay",
    reviewed: "2026-08-11",
  }],
});

// --- The registry -----------------------------------------------------------

export const RULES = {
  minimumWage, severanceDaysPerYear, severanceMinimumDays, severanceWageCap,
  resignationDaysPerYear, resignationWageCap, resignationMinimumService,
  dailySalaryDivisor, accrualYearDays,
  vacationDaysPerYear, vacationSurcharge, vacationProportionalOnExit, vacationUnmodelled,
  aguinaldoScale, aguinaldoCutoff, aguinaldoCycleStart,
  quincena25SalaryCeiling, quincena25Rate, quincena25Exempt, quincena25MandatoryFrom,
  withholdingTables, recalcTables, recalcMonths,
  afpEmployeeRate, isssEmployeeRate, isssMonthlyCeiling,
  fixedDeduction, fixedDeductionIncomeLimit,
  nightWindow, shiftLimits, minorOvertimeLimit, overtimeFactors,
} satisfies Record<string, AnyRule>;

export type RuleId = keyof typeof RULES;

export const ALL_RULES: AnyRule[] = Object.values(RULES);

/**
 * Which rules each page actually applies.
 *
 * This is the list that decides what a page's freshness badge is allowed to
 * claim: a page shows the oldest review date among the rules it uses, so
 * letting a stale rule sit here unused would make the claim worse than it is,
 * and forgetting to list one it does use would make the claim better than it
 * is. Both are wrong, and the second is the dangerous one.
 *
 * `loans` is empty on purpose: nothing in the loan calculator comes from
 * Salvadoran statute, which is why it makes no freshness claim at all.
 */
export const RULE_USAGE: Record<Page, RuleId[]> = {
  home: Object.keys(RULES) as RuleId[],
  loans: [],
  settlement: [
    "minimumWage", "severanceDaysPerYear", "severanceMinimumDays", "severanceWageCap",
    "resignationDaysPerYear", "resignationWageCap", "resignationMinimumService",
    "dailySalaryDivisor", "accrualYearDays",
    "vacationDaysPerYear", "vacationSurcharge", "vacationProportionalOnExit", "vacationUnmodelled",
    "aguinaldoScale", "aguinaldoCutoff", "aguinaldoCycleStart",
    "quincena25SalaryCeiling", "quincena25Rate", "quincena25Exempt", "quincena25MandatoryFrom",
  ],
  overtime: [
    "dailySalaryDivisor", "nightWindow", "shiftLimits", "minorOvertimeLimit", "overtimeFactors",
  ],
  // `quincena25Exempt` is here for the payslip checker, which names a Quincena
  // 25 left inside the taxable gross as one reason a withholding can come out
  // above the table — a rule the page applies by excluding a figure, not by
  // multiplying one, and which the reader still has to be able to look up.
  withholding: [
    "withholdingTables", "recalcTables", "recalcMonths",
    "afpEmployeeRate", "isssEmployeeRate", "isssMonthlyCeiling",
    "fixedDeduction", "fixedDeductionIncomeLimit", "quincena25Exempt",
  ],
};

/**
 * The day the least recently checked of a set of rules was last verified.
 *
 * A page quoting ten rules is only as fresh as its stalest one, so the badge
 * takes the minimum rather than the newest — the opposite choice would let one
 * same-day edit refresh a claim about figures nobody has looked at in a year.
 * Every version is considered, not just the one in force: a superseded table
 * is still on screen in the settlement history and still has to be right.
 */
export function oldestReviewed(rules: AnyRule[]): string | undefined {
  const dates = rules.flatMap((item) => item.versions.map((version) => version.reviewed));
  return dates.length === 0 ? undefined : dates.reduce((a, b) => (a < b ? a : b));
}

/** The review date a page is entitled to show, or undefined if it cites none. */
export function reviewedFor(page: Page): string | undefined {
  return oldestReviewed(RULE_USAGE[page].map((id) => RULES[id]));
}

export type Citation = { norm: string; source: SourceKey };

/**
 * The articles behind a set of rules, as of a date, ready to be printed.
 *
 * This exists so an exported document can carry its own legal basis without
 * anybody retyping article numbers into a copy dictionary. The strings a PDF
 * prints are the same `norm` fields the calculation reads, which means a
 * citation cannot drift from the figure it is a citation for — the failure mode
 * of every hand-written "Base legal:" line, and one that only shows up when a
 * reader takes the document to the ministry.
 *
 * `isoDate` picks the version, so a settlement dated 2024 cites the 12 December
 * articles it was actually priced with rather than today's reform. Identical
 * norms collapse: three rules all reading article 58 are one line to a reader.
 *
 * The caller passes the ids rather than a page, because the honest citation
 * list is the rules a case ACTUALLY applied — a dismissal cites no resignation
 * article — and only the calculation knows which those were.
 */
export function citationsFor(ids: RuleId[], isoDate: string): Citation[] {
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const id of ids) {
    // Widened to `AnyRule`: only the metadata is read here, and the value types
    // across the registry have nothing in common to unify on.
    const { version } = ruleAt(RULES[id] as AnyRule, isoDate);
    const key = `${version.norm} ${version.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push({ norm: version.norm, source: version.source });
  }
  return citations;
}

/**
 * The site-wide claim: the oldest review date of every rule in the registry.
 *
 * Used where the freshness statement is not attached to one calculator — the
 * sitemap's `lastmod` and the structured data's `dateModified`. It replaces the
 * hand-edited constant of the same name, which could drift from the figures it
 * spoke for because nothing tied the two together.
 */
export const RULES_REVIEWED: string = oldestReviewed(ALL_RULES)!;
