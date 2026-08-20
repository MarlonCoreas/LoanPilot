import type { Page } from "./routes";
// Extension written out: the test suite loads this through Node's type
// stripping, which resolves specifiers literally. The type-only import above
// was erased before Node saw it; this one is a value and is not.
import { institutionOf, OFFICIAL } from "./sources.ts";

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
 *
 * That first word is now also a field. `status` carries the same shout in a
 * form code can read, because /reglas-en-disputa/ is BUILT FROM IT: every
 * version marked DISPUTED or UNSOURCED appears on that page automatically, and
 * a test fails when one does not. A shout that lived only in English prose
 * could not do that — the page is bilingual, and the reader's half of each
 * disagreement is in `disputes.ts`, keyed by the rule id.
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
  /** Which day a scale is measured at, where two days are defensible. */
  | "seniority-reading"
  /** What a payment is kept out of: withholdings, bases, attachment. */
  | "exclusions"
  /** Not applied by any calculation: recorded so the gap stays under review. */
  | "not-modelled";

/**
 * The words a note shouts, as values. They are spelled the way the note spells
 * them so that the two cannot drift: `tests/rules.test.mjs` asserts that a
 * version carrying a status opens its note with the first one, and that a note
 * opening with one of these words carries the matching status.
 */
export type RuleStatus = "DISPUTED" | "UNSOURCED" | "NOT MODELLED";

export type RuleVersion<T> = {
  /** First day this version applies, inclusive. */
  from: string;
  value: T;
  /** The article or decree that carries it, written so a reader can look it up. */
  norm: string;
  /** Which document in `OFFICIAL` has to be opened to check the value. */
  source: SourceKey;
  /**
   * Why the `norm` names a document that `source` does not carry.
   *
   * Some pairings are deliberate: a value that comes from an institution's
   * practice cites the article the practice interprets, and a reform not yet
   * absorbed into a consolidated text is cited through the decree that recites
   * it. Both are legitimate and both look exactly like the accident this field
   * exists to catch — an article cited over an explainer that never quotes it.
   *
   * So the mismatch is legal only when it is declared here, in words, and
   * `tests/rules.test.mjs` fails when it is not. See `DOCUMENTS` in
   * `sources.ts` for what each link actually carries.
   */
  citedThrough?: string;
  /** The day a human last read this value back against that document. */
  reviewed: string;
  /** What the source does not settle, when it does not settle it. */
  note?: string;
  /**
   * What this version claims beyond a reading of its text, in the order the
   * note says it. More than one applies where more than one is true: the
   * Quincena 25 window is DISPUTED in which terminations it covers AND
   * UNSOURCED in where it opens, and collapsing that to one word would hide
   * half of what a reader has to know before trusting the line.
   */
  status?: [RuleStatus, ...RuleStatus[]];
  /**
   * The single fiscal year a transitory provision governs, when it governs one.
   *
   * A version with no `exercise` is permanent and applies until something
   * replaces it; a version with one displaces the permanent rule for that year
   * and then expires on its own terms, which is not something `from` alone can
   * express. See `aguinaldoTaxExemption`, where a decade of one-year decrees
   * sits above a standing article that none of them repealed.
   */
  exercise?: number;
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
  const year = Number(isoDate.slice(0, 4));
  const version = subject.versions.find((item) =>
    isoDate >= item.from
    // A transitory version governs its own fiscal year and no other. Without
    // this the newest one would keep applying for ever, which is the exact
    // mistake a year-by-year exemption invites: the 2025 decree would still be
    // exempting bonuses in 2027 because nothing told the lookup it had expired.
    && (item.exercise === undefined || item.exercise === year));
  return { version: version ?? subject.versions.at(-1)!, predatesRule: !version };
}

/**
 * The standing value: what a live page shows when no date is in play.
 *
 * Transitory versions are skipped, because "current" cannot mean a provision
 * that expired with its fiscal year. For a rule whose versions are all
 * permanent — every rule here but one — this is the newest version, unchanged.
 * Where a transitory version might govern the day being priced, the caller
 * wants `ruleAt` and the date, not this.
 */
export function currentValue<T>(subject: Rule<T>): T {
  return (subject.versions.find((item) => item.exercise === undefined) ?? subject.versions[0]).value;
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

/**
 * How much of a year-end bonus escapes income tax: either a figure in dollars,
 * which is what every transitory decree has used, or a multiple of the monthly
 * minimum wage, which is what the standing article says. The two shapes are
 * kept apart rather than reduced to a number, because reducing them would hide
 * that one moves with the wage table and the other does not.
 */
export type AguinaldoExemption =
  | { kind: "amount"; amount: number }
  | { kind: "minimumWages"; multiple: number; sector: WageSector };

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
 *
 * UNSOURCED, and the widest-reaching one in the registry. It is not DISPUTED:
 * there are no two readings to set against each other, there is a text that
 * says nothing and an official practice that fixes the figure. That is a
 * different kind of gap and /reglas-en-disputa/ now publishes it in a section of
 * its own rather than leaving it unmarked — which is what it was, on the
 * argument that a silence is not a disagreement. The argument was right about
 * the category and wrong about the consequence: every daily figure the site
 * prints is divided by this number.
 */
export const dailySalaryDivisor = rule<number>({
  id: "dailySalaryDivisor",
  unit: "days/month",
  versions: [{
    from: "1972-10-31",
    value: 30,
    norm: "Código de Trabajo arts. 142 y 183 (ninguno fija el divisor)",
    source: "laborService",
    citedThrough: "El norm nombra los artículos que DEBERÍAN fijar el divisor y ninguno lo hace; el 30 sale de la constancia del servicio del MTPS, que es lo que abre el enlace. Reapuntarlo al Código ofrecería un documento donde el valor no está.",
    reviewed: "2026-08-16",
    status: ["UNSOURCED"],
    note: "UNSOURCED. No text fixes it: article 183 sets the base and article 142 defines the daily wage from the hourly one, so neither settles the divisor. The 30 is anchored empirically to the MTPS calculator — 30.42 stops reconciling with the official statement — and it multiplies into every daily figure the site prints: severance, vacation, the year-end bonus and every overtime hour.",
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
    citedThrough: "El art. 58 dice «proporcionalmente por fracciones de año» y no dice sobre cuántos días ni si se cuentan ambos extremos. Los 365 con día de entrada y de salida incluidos son lo que hace el servicio del MTPS, y es ese documento el que reconcilia al centavo.",
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
    citedThrough: "El art. 187 es la lectura que NO se aplica: el enlace abre el servicio del MTPS porque es la práctica que se sigue y la que la constancia acredita. Es el corazón de la ficha de /reglas-en-disputa/, y el norm nombra el texto del que se diverge.",
    reviewed: "2026-08-16",
    status: ["DISPUTED"],
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
    status: ["NOT MODELLED"],
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
      citedThrough: "El D.L. 433 no está publicado por sí solo en la bóveda y el consolidado del Código todavía trae «doce de diciembre», así que la cita de grado decreto es el considerando V del D.L. 440, que da número, fecha y Diario Oficial. Sustituir en cuanto se publique el 433 o se actualice el consolidado.",
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
 *   1 JANUARY, the calendar year, which is what this module applies. The
 *   backing recorded here USED TO BE OVERSTATED and the correction matters. The
 *   MTPS publication in `aguinaldoReform` says that an early payment is optional
 *   for the employer and that one who chooses to make it "debe darlo completa al
 *   trabajador". It says nothing about the accrual period. Reading "complete" as
 *   "the calendar year" is an inference, and not a compelling one: a complete
 *   bonus of a 12 December cycle is equally complete. So this reading rests on
 *   an institutional statement about the AMOUNT, stretched to cover the PERIOD.
 *
 *   12 DECEMBER, the cycle that closes on the old qualifying date. The MTPS
 *   settlement statement the suite reconciles against prints $21.15 of bonus for
 *   a resignation on 24 December 2025 with the bonus already collected, and that
 *   figure is nineteen days of scale over the thirteen run from 12 December, on
 *   a 937.54/30 daily base. No other whole number of days reaches it. This is
 *   the ministry's own arithmetic in a document, not a press summary of it.
 *
 * SO THE EVIDENCE POINTS AT THE READING THAT IS NOT APPLIED, and saying so is
 * the point of this entry. On article 187 and on `dailySalaryDivisor` the same
 * statement reconciling to the cent is exactly what decides the question, and
 * the criterion is not being applied here. Two reasons, both provisional: the
 * statement is dated December 2025, two months after D.L. 433 moved the
 * qualifying date, so the ministry's own tool may not have been updated; and one
 * document against an inference is thin ground on which to move every
 * proportional bonus the suite pins. PENDING: run the MTPS online calculator on
 * a case built to discriminate — under a year of service, departure between 20
 * October and 31 December — and settle it with a second data point.
 *
 * WHAT DID CHANGE. The alternative is now producible: `calculateAguinaldo`
 * reproduces the $21.15 line under the 12 December cycle and zero under the
 * calendar one, because a collected bonus no longer zeroes every case. That was
 * a bug in its own right, and it is fixed independently of this value.
 */
export const aguinaldoCycleStart = rule<YearDay>({
  id: "aguinaldoCycleStart",
  unit: "day-of-year",
  versions: [{
    from: "1972-10-31",
    value: { month: 1, day: 1 },
    norm: "Sin norma que lo fije: arts. 196-202 no definen el período de devengo",
    // The MTPS publication on early payment, not the Labour Code. The chapter
    // is silent by this rule's own norm, so linking it offered the reader a
    // document that cannot settle the question; this one at least backs the
    // reading applied, as far as it goes. See the note.
    source: "aguinaldoReform",
    reviewed: "2026-08-19",
    status: ["DISPUTED"],
    note: "DISPUTED. Two readings are in use and no text settles either. The calendar year is applied; its backing is an MTPS publication saying an early payment must be handed over complete, which speaks to the AMOUNT and is stretched here to cover the PERIOD. The 12 December cycle is the only reading that reproduces the bonus line of the MTPS settlement statement — $21.15, nineteen days over thirteen from 12 December — which is the ministry's own arithmetic in a document. The evidence therefore points at the reading NOT applied, and the same criterion decides article 187 and `dailySalaryDivisor` the other way. Not moved yet on two provisional grounds: the statement post-dates D.L. 433 by two months and the ministry's tool may be stale, and one document against an inference is thin ground for moving every proportional bonus the suite pins. Pending a second data point from the MTPS online calculator on a discriminating case. Both readings are EXPRESSIBLE and the alternative is now produced on that exact case: the cycle opens on the most recent occurrence of this day on or before the last day read, and a collected bonus settles only the cycle it discharged.",
  }],
});

/**
 * Which day an early leaver's seniority is read at, and therefore which step of
 * the article 198 scale they take.
 *
 * DISPUTED. The scale itself is not: `aguinaldoScale` is 15/19/21 days and the
 * 2025 reform did not touch it. What no text settles is the day it is measured
 * at for someone whose contract ends BEFORE the qualifying date and who would
 * have crossed a step by reaching it. Article 197 reads seniority at the
 * qualifying date; article 202 grants the leaver a part "proporcional al tiempo
 * trabajado" and says nothing about which scale that proportion is a proportion
 * of. Both are readings of the same two articles:
 *
 *   LAST DAY WORKED, applied. The step the worker had actually completed. It
 *   never pays for a seniority step nobody reached, which is the reading that
 *   cannot over-state the line.
 *
 *   QUALIFYING DATE, named. The step they would have held on 20 October. It is
 *   always the larger of the two — the cutoff is later than the departure in
 *   every case this touches, so seniority there is never lower.
 *
 * Declared rather than computed, like `vacationProportionalOnExit`: nothing
 * multiplies this value. `calculateAguinaldo` applies the first reading and
 * returns the second beside it whenever the two differ, and the rule is here so
 * the divergence has a norm, a source and a review date like every other figure.
 */
export const aguinaldoScaleOnExit = rule<{
  appliedAt: "lastDayWorked";
  alternativeAt: "cutoff";
}>({
  id: "aguinaldoScaleOnExit",
  unit: "seniority-reading",
  versions: [{
    from: "1972-10-31",
    value: { appliedAt: "lastDayWorked", alternativeAt: "cutoff" },
    norm: "Código de Trabajo arts. 197, 198 y 202",
    source: "laborCode",
    reviewed: "2026-08-16",
    status: ["DISPUTED"],
    note: "DISPUTED. Nothing in chapter VII says which day the scale is read at for a contract that ends before the qualifying date. The conservative reading is the figure and the other one is shown beside it on screen and in the exported PDF, with neither claimed to govern.",
  }],
});

/**
 * The window article 202 gives the employer to pay, which is not the same thing
 * as the qualifying date the scale is read at.
 *
 * `aguinaldoCutoff` is when the bonus is EARNED; this is when it must be HANDED
 * OVER. They were the same article before the 2025 reform moved both, and the
 * calculator needs the second one on screen because it is the only figure here
 * a reader can act on: a bonus not paid by 20 December is a complaint they can
 * take to the MTPS, and no arithmetic tells them that.
 */
export const aguinaldoPaymentWindow = rule<{ opens: YearDay; closes: YearDay }>({
  id: "aguinaldoPaymentWindow",
  unit: "day-of-year",
  versions: [
    {
      from: "2025-10-20",
      value: { opens: { month: 10, day: 20 }, closes: { month: 12, day: 20 } },
      norm: "D.L. 433 del 15 de octubre de 2025 (D.O. 194, Tomo 449), que reforma el art. 200 del Código de Trabajo",
      source: "aguinaldoDecree",
      citedThrough: "Igual que `aguinaldoCutoff`: el considerando V del D.L. 440 enuncia la ventana con todas sus letras —«entre el 20 de octubre y el 20 diciembre de cada año»— y el consolidado del Código aún no absorbe la reforma.",
      reviewed: "2026-08-16",
      note: "Cited through the fifth recital of D.L. 440, which states the window the reform opened in so many words: the payment falls \"entre el 20 de octubre y el 20 diciembre de cada año\". The Asamblea's consolidated Labour Code still carried the pre-reform article when this was last read.",
    },
    {
      from: "1972-10-31",
      value: { opens: { month: 12, day: 12 }, closes: { month: 12, day: 20 } },
      norm: "Código de Trabajo art. 200, texto anterior a la reforma de 2025",
      source: "laborCode",
      reviewed: "2026-08-16",
      note: "Recorded for the record only, the way the pre-reform cutoff is. Nothing prices a pre-2025 bonus with it.",
    },
  ],
});

// --- Income tax on the year-end bonus ---------------------------------------
//
// A PERMANENT FLOOR WITH A DECADE OF ONE-YEAR DECREES STACKED ON TOP OF IT, and
// the shape is the whole point. This was read for a while as two candidates with
// nothing to choose between them, and that reading was wrong: it treated a
// standing article and an expired transitory decree as equals.
//
// LISR article 4 numeral 16), added by D.L. 458 of 31 October 2019, exempts the
// bonus up to two monthly minimum wages of the commerce and services sector and
// taxes the excess after deducting them. It has never been repealed. D.L. 432
// opens by saying so in as many words — "No obstante lo dispuesto en el numeral
// 16) del artículo 4 de la Ley de Impuesto sobre la Renta" — which is the
// grammar of a provision that DISPLACES another for a year, not one that
// replaces it. Each such decree names its own fiscal year and expires with it.
//
// So there is no vacuum. With no decree in force for an exercise, the floor is
// what governs it, and the floor is sourced, dated and never repealed. That is
// why the fiscal panel of /aguinaldo/ is now on.
//
// WHAT IS STILL COMING. In each of the last five years a transitory decree
// raised the figure, the last of them to $1,500 for 2025, and they are passed in
// the closing weeks of the year: 7 December 2021, 7 December 2022, 29 November
// 2023, 26 November 2024, and 15 October 2025 only because the payment window
// had just moved. As of 16 August 2026 the Assembly's 2026 list carries none, so
// a 2026 decree — if it comes — would be expected between late October and early
// December. Adding it is one entry in `versions` with its own `exercise`, and no
// code changes: that is what the field is for. Check the decree list from
// October.

export const aguinaldoTaxExemption = rule<AguinaldoExemption>({
  id: "aguinaldoTaxExemption",
  unit: "usd/year",
  versions: [
    {
      from: "2025-10-15",
      exercise: 2025,
      value: { kind: "amount", amount: 1500 },
      norm: "D.L. 432 del 15 de octubre de 2025 (D.O. 194, Tomo 449) art. 1",
      source: "aguinaldoTax2025",
      reviewed: "2026-08-16",
      note: "TRANSITORY, for the 2025 fiscal year alone: \"para el corriente ejercicio fiscal de dos mil veinticinco\". It expired with that year and does not reach 2026. The excess above the figure is withheld \"deduciendo el valor no gravable regulado en este artículo\", so the exemption is a deductible slice and not a cliff.",
    },
    // The four before it. They govern nothing anybody can still calculate here
    // and they are not read from their own decrees — they are the consolidated
    // text's own list of related provisions, which is why they share its source
    // and its review date. They are in the registry because the pattern IS the
    // finding: /aguinaldo/ tells a reader that a 2026 decree is likely and
    // roughly when, and that claim has to be made of data rather than of prose.
    {
      from: "2024-11-26",
      exercise: 2024,
      value: { kind: "amount", amount: 1500 },
      norm: "D.L. 159 del 26 de noviembre de 2024",
      source: "incomeTax",
      reviewed: "2026-08-16",
      note: "TRANSITORY, for the 2024 fiscal year. Read from the list of related provisions of the consolidated Income Tax Law, not from the decree itself.",
    },
    {
      from: "2023-11-29",
      exercise: 2023,
      value: { kind: "amount", amount: 1500 },
      norm: "D.L. 900 del 29 de noviembre de 2023",
      source: "incomeTax",
      reviewed: "2026-08-16",
      note: "TRANSITORY, for the 2023 fiscal year. Read from the consolidated text's list of related provisions.",
    },
    {
      from: "2022-12-07",
      exercise: 2022,
      value: { kind: "amount", amount: 1500 },
      norm: "D.L. 596 del 7 de diciembre de 2022",
      source: "incomeTax",
      reviewed: "2026-08-16",
      note: "TRANSITORY, for the 2022 fiscal year. Read from the consolidated text's list of related provisions.",
    },
    {
      from: "2021-12-07",
      exercise: 2021,
      value: { kind: "amount", amount: 1100 },
      norm: "D.L. 229 del 7 de diciembre de 2021",
      source: "incomeTax",
      reviewed: "2026-08-16",
      note: "TRANSITORY, for the 2021 fiscal year, and the last one at a figure other than $1,500. Read from the consolidated text's list of related provisions.",
    },
    {
      from: "2019-11-14",
      value: { kind: "minimumWages", multiple: 2, sector: "commerce" },
      norm: "Ley de Impuesto sobre la Renta art. 4 numeral 16), incorporado por el D.L. 458 del 31 de octubre de 2019 (D.O. 215, Tomo 425)",
      source: "incomeTax",
      reviewed: "2026-08-16",
      note: "The standing rule, never repealed, and the one that governs any exercise no decree displaces: \"hasta un monto no mayor de dos salarios mínimos mensuales del sector comercio y servicios\", with the excess taxed \"deduciendo los dos salarios mínimos aludidos\". It carries marker (23) in the consolidated text's reform table, which is the D.L. 458 named here, and D.L. 432's second recital gives the same reference independently. The monthly minimum wage it multiplies is the daily rate times 365/12 — see the note on `minimumWage`.",
    },
  ],
});

/**
 * The exemption that governs a fiscal year, and whether a decree set it.
 *
 * The page needs both halves. A figure alone would let the standing floor and a
 * one-year decree print identically, and the difference is the reader's whole
 * risk: a decree for the year is settled, while the floor is what applies
 * BECAUSE NOBODY HAS LEGISLATED YET, and one may still arrive in November and
 * change the answer.
 */
export function aguinaldoExemptionFor(year: number) {
  const transitory = aguinaldoTaxExemption.versions.find((item) => item.exercise === year);
  const standing = aguinaldoTaxExemption.versions.find((item) => item.exercise === undefined)!;
  return { version: transitory ?? standing, byDecree: transitory !== undefined };
}

/** Every year a transitory decree has raised the figure, newest first. */
export const AGUINALDO_EXEMPTION_HISTORY = aguinaldoTaxExemption.versions
  .filter((version) => version.exercise !== undefined);

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
/**
 * The day article 3 anchors a terminated worker's entitlement to, and the one
 * decision on this page that moves real money.
 *
 * DISPUTED, and now resolved in the restrictive direction — the opposite of
 * what `vacationProportionalOnExit` does with article 187, which is the point
 * worth writing down. There the literal text is narrow and the official service
 * pays wide, and an MTPS statement reconciles to the cent; following the
 * ministry is following evidence. Here there is no evidence to follow. The law
 * is from January 2026, its first cycle was voluntary for private employers,
 * and no practice has formed. The two readings are:
 *
 *   RESTRICTIVE, applied. Article 3 grants the benefit to someone whose
 *   contract ends "antes del veinticinco de enero o en esa misma fecha" — the
 *   day article 1 makes the payment fall due. It is a protection against being
 *   let go days before payday, and outside that window nothing is owed. It is
 *   the same shape as article 202, which anchors the year-end bonus to its own
 *   qualifying date rather than granting it all year round.
 *
 *   BROAD, named and not applied. The sentence that follows sends the reader to
 *   "las disposiciones establecidas para el goce de la prima anual en concepto
 *   de aguinaldo […] o la parte proporcional, según corresponda", which reads
 *   like article 202 paying a proportional share on any dismissal.
 *
 * What settles it against the broad reading is that paying a proportion outside
 * the window requires an accrual cycle, and the decree fixes none: article 2
 * keys the amount to the salary "al momento en que la prestación se
 * materialice", not to a period. And the error runs one way. Over-stating this
 * line is hundreds of dollars in a figure somebody carries into a negotiation.
 *
 * UNSOURCED, the lower bound, and this is the half to be honest about. The
 * value below is the 25 January of article 3, which is in the text. ANY LOWER
 * BOUND IS THIS PROJECT'S INVENTION, INCLUDING THE ONE IT USES: read literally,
 * a termination in December is also "antes del veinticinco de enero", and so is
 * one in March of the year before. The window is bounded at the first of the
 * same January because the payment article 1 fixes is a January payment and
 * that is the month article 3 is about — a reading, not a citation. Only the
 * 25th comes from the text. A decree or a ministry criterion that states
 * otherwise replaces this, and until one does the bound is named on
 * /reglas-en-disputa/ rather than presented as part of the law.
 */
export const quincena25Window = rule<YearDay>({
  id: "quincena25Window",
  unit: "day-of-year",
  versions: [{
    from: "2026-01-14",
    value: { month: 1, day: 25 },
    norm: "Ley Especial Quincena Veinticinco (D.L. 499 del 14 de enero de 2026) arts. 1 y 3",
    source: "quincena25",
    reviewed: "2026-08-16",
    status: ["DISPUTED", "UNSOURCED"],
    note: "DISPUTED, applied restrictively, and UNSOURCED at the other end. The 25th is article 3's own \"antes del veinticinco de enero o en esa misma fecha\". The day the window OPENS is not in any text: the first of that same January is this project's bound, and so would be any other lower bound anybody proposed. The broad reading — a proportional share on any dismissal — is named on screen and in the exported PDF rather than silently discarded.",
  }],
});

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
    norm: "Ley Integral del Sistema de Pensiones arts. 14, 16 y 26",
    source: "pensions",
    reviewed: "2026-08-18",
    note: "Of the monthly contributory salary, with no maximum base: the previous ceiling was repealed, so a high salary is not capped. Article 16 sets the split in words as well as figures — 16% of the ingreso base de cotización, \"correspondiendo el siete punto veinticinco por ciento (7.25%) al trabajador y el ocho punto setenta y cinco por ciento (8.75%) al empleador\" — which is where this value comes from.\n\nARTICLE 26 IS WHY THE CONTRIBUTION LEAVES THE INCOME TAX BASE AT ALL, and it is worth having in full because every threshold on /renta-anual/ hangs off one word in it: \"Los rendimientos por inversiones de los Fondos de Pensiones, las cotizaciones OBLIGATORIAS de los afiliados al Sistema, el excedente de libre disponibilidad cuando estos existan, así como los ingresos provenientes de los incentivos por permanencia serán considerados rentas no gravables para efectos de Impuesto sobre la Renta.\" (Emphasis added; the article is headed \"Tratamiento Tributario\".) An express exemption, not an inference from the withholding tables, which is what makes the contribution an EXCLUSION from the renta obtenida rather than a deduction from the renta imponible — article 4 of the Ley de Impuesto sobre la Renta supplies the consequence. And \"obligatorias\" is the word: voluntary saving has its own article and its own, weaker treatment. See `voluntaryPensionUnmodelled`.\n\nIN THE REPEALED LEY SAP THIS WAS ARTICLE 22, and it is worth knowing: anything written before the 2022 Ley Integral del Sistema de Pensiones — an older commentary, a resolution, case law — cites article 22 SAP for the same text. The renumbering runs four articles apart, and the neighbour confirms the pairing in this very PDF: LISP article 27 opens Chapter IV, \"DE LAS ADMINISTRADORAS DE FONDOS DE PENSIONES\", as SAP article 23 did. The SAP itself is not in this source, so that half rests on the maintainer's reading rather than on this document.\n\nTHIS RULE IS THE ONLY PLACE THE EXEMPTING ARTICLE IS NAMED. Everything downstream (`fixedDeductionIncomeLimit`, `annualFilingThreshold`, `contributionsExcludedFromBase`, and the copy on /renta-anual/ and /retenciones/) points here instead of repeating the citation, so a correction is one edit and cannot drift into seven. No user-facing string names an article at all.\n\nTHE RATE IS NOT APPLIED TO THE GROSS. Article 14 builds the ingreso base de cotización and then takes concepts back out of it, and it sets a floor under what is left. Both live in rules of their own — `contributoryBaseExclusions`, which the withholding page now applies, and `contributoryBaseFloor`, which it does not — so neither is a paragraph here that nobody re-reads.",
  }],
});

export const isssEmployeeRate = rule<number>({
  id: "isssEmployeeRate",
  unit: "ratio",
  versions: [{
    from: "2015-01-01",
    value: 0.03,
    // The Reglamento was the wrong citation and the linked document says so
    // itself: its "BASE LEGAL" quotes the first paragraph of article 29 of the
    // LEY del Seguro Social for the split — "el patrono aportará el siete punto
    // cincuenta por ciento (7.5%) y el trabajador el tres por ciento (3%)" —
    // and reaches for the Reglamento only for article 3, the remuneración
    // afecta. The rate was being attributed to a text that does not carry it.
    norm: "Ley del Seguro Social art. 29 inciso primero",
    source: "isss",
    reviewed: "2026-08-19",
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
    reviewed: "2026-08-18",
    note: "Read back against the consolidated text, which writes it as a \"DEDUCCIÓN FIJA DE US$1,600.00, LA CUAL NO ESTARÁ SUJETA A COMPROBACIÓN\". An annual figure. The payroll calculation divides it by the pay periods in a year and the recalculation scales it to the months each period covers, which is why it is stored annually and never per period.",
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
    reviewed: "2026-08-18",
    note: "Read back against the consolidated text: numeral 7 grants the flat deduction to those \"CUYA RENTA OBTENIDA PROVENGA EXCLUSIVAMENTE DE SALARIOS Y CUYO MONTO SEA IGUAL O INFERIOR A US$9,100.00\" — \"igual o inferior\", so exactly $9,100 is inside — and sends those \"CON RENTAS MAYORES DE US$9,100.00\" to articles 32 and 33. Article 33 says the same from its side: the receipts are for \"LOS ASALARIADOS CUYA RENTA OBTENIDA EXCEDA A US$9,100.00\".\n\nTHE BASE FOR BOTH INCOME THRESHOLDS OF THIS PROJECT, and the note the other one points at.\n\nrenta obtenida = taxable pay - COMPULSORY pension contribution.\n\nArticle 29 numeral 7 caps the flat deduction by \"renta obtenida\", and article 4 of this law opens by excluding every renta no gravable \"del cómputo de la renta obtenida\". The compulsory pension contribution is one of those: THE STATUTORY BASIS IS ON `afpEmployeeRate`, which is the single place in this registry that names the exempting article, and reading it is the first step before changing anything here. So the pension money is not subtracted from the renta obtenida: it was never in it. That is an exclusion, and calling it a deduction puts it in the wrong place by one step, which is invisible in the renta imponible and decisive at this limit.\n\nTHE ISSS IS NOT EXCLUDED HERE, AND THE ASYMMETRY IS DELIBERATE. No statute makes the health contribution a renta no gravable; what carries it is a recital of Executive Decree 10/2025 describing it as deducted from the ingresos brutos when the base is built. A deduction reduces the renta imponible and leaves the renta obtenida untouched, so the ISSS is still inside the figure this limit is read against. See `contributionsExcludedFromBase`, which holds the two citations side by side.\n\nONLY THE COMPULSORY PART IS EXCLUDED — article 26 says \"obligatorias\" — and voluntary saving is a deduction under article 138 rather than an exclusion, which lands one step further down and is not modelled either way: see `voluntaryPensionUnmodelled`.\n\nThe limit therefore bites at $9,811.32 of taxable pay, not at $9,100 of it: a gross of $9,400 is renta obtenida of $8,718.50 and is inside the limit.",
  }],
});

// --- The annual return ------------------------------------------------------
//
// THE TABLE THE WITHHOLDING TABLES ARE AN APPROXIMATION OF. Everything in the
// block above settles tax inside a payroll; this is the settlement the payroll
// was estimating, and the two only agree under a condition that is worth
// writing down because the whole /renta-anual/ page is about the cases where it
// does not hold.
//
// Article 37 is applied to the renta imponible (arts. 34 and 37). The December
// recalculation table is the same function evaluated at (base - 1,600):
//
//   band III of December: 20% x (base - 10,742.86) + 720
//   article 37 at base - 1,600: 20% x (base - 1,600 - 9,142.86) + 720
//
// which are the same expression, and `tests/annual.test.mjs` checks it over the
// whole range rather than at a point. So the withholding tables hand every band
// III and IV taxpayer a $1,600 deduction, and article 37 grants it only to
// somebody who is entitled to it: the $1,600 of article 29 numeral 7 below
// $9,100 of renta obtenida, or the article 33 receipts above it. A worker over
// $9,100 with no receipts is therefore under-withheld by 20% or 30% of $1,600 —
// which is a balance DUE at the annual return, not a refund, and the reason the
// page is not written as a refund calculator.
//
// A CHECK THAT LOOKS LIKE A BUG AND IS NOT. Comparing the two tables band by
// band shows the $1,600 displacement in three places and none in the first:
// band I of the December table closes at $6,600 and not at $8,200. That is the
// decree's own design. D.L. 293 set the exempt base at "$6,600.00 de ingresos
// anuales, equivalente a un ingreso mensual de hasta $550.00", and literal e)
// of Executive Decree 10/2025 says the values of band II "no contienen las
// deducciones" — so bands I and II carry the raw article 37 limits and only
// bands III and IV carry them displaced.

export const annualTaxTable = rule<WithholdingBand[]>({
  id: "annualTaxTable",
  unit: "usd-bands",
  versions: [{
    // Eight days after publication in Diario Oficial 79, Tomo 447, of 30 April
    // 2025, per article 3 of the decree itself. The exercise is priced at its
    // close — article 13 letter c) presumes the renta obtained at midnight on
    // the last day of the period — so this version governs exercise 2025
    // onward, and a return for 2024 resolves through `predatesRule`.
    from: "2025-05-08",
    value: [
      { from: 0.01, to: 6600, rate: 0, excess: 0, fixed: 0 },
      { from: 6600.01, to: 9142.86, rate: 0.10, excess: 6600, fixed: 212.12 },
      { from: 9142.87, to: 22857.14, rate: 0.20, excess: 9142.86, fixed: 720 },
      { from: 22857.15, to: null, rate: 0.30, excess: 22857.14, fixed: 3462.86 },
    ],
    norm: "Ley de Impuesto sobre la Renta arts. 34 y 37 (tabla reformada por el D.L. 293 del 30 de abril de 2025)",
    source: "incomeTax",
    reviewed: "2026-08-18",
    note: "Re-read against the consolidated text on 18 August 2026: the four bands transcribe exactly, and the reform marker (25) beside the table resolves in the law's own index to \"D. L. No. 293, 30 DE ABRIL DE 2025\". Read back against the consolidated text and against D.L. 293 itself, whose article 1 reprints the whole table. Only bands I and II changed — the first recital of Executive Decree 10/2025 says so in as many words — and bands III and IV still carry the figures D.L. 957 of 14 December 2011 gave them. The $212.12 fixed amount of band II is a step, not a slope: the tax jumps by that much at $6,600.01, and it is in the published table.",
  }],
});

/**
 * The two gaps of /renta-anual/, written down instead of left silent.
 *
 * Neither has a value this project applies, and that is the point: article 460
 * of nothing says a calculator must model everything, but a calculator that
 * quietly omits a deduction is telling the reader their balance is bigger than
 * it is. They are rules in the registry so that the staleness check keeps them
 * under review with the ones that are applied, and so that a reader looking for
 * either one finds out it is missing on purpose — the same contract
 * `vacationUnmodelled` gives the settlement.
 */
export const voluntaryPensionUnmodelled = rule<string[]>({
  id: "voluntaryPensionUnmodelled",
  unit: "not-modelled",
  versions: [{
    from: "2023-01-01",
    value: ["ahorro previsional voluntario"],
    norm: "Ley Integral del Sistema de Pensiones art. 138",
    source: "pensions",
    reviewed: "2026-08-18",
    status: ["NOT MODELLED"],
    note: "NOT MODELLED. Article 26 makes the COMPULSORY contribution a renta no gravable — see `afpEmployeeRate` — and voluntary saving is not covered by it. Article 138, also headed \"Tratamiento Tributario\", gives it a different and weaker treatment, and the difference is the whole reason this rule exists: an exclusion leaves the renta obtenida, a deduction only reduces the renta imponible.\n\nWHAT ARTICLE 138 ACTUALLY SAYS, in three parts, because only the first is what a secondary source usually reports. The RETURNS of a Fondo de Ahorro Previsional Voluntario are \"rentas no gravables para efectos de Impuestos sobre la Renta\". The CONTRIBUTIONS are not: the aportes that employers and afiliados make \"serán considerados como gastos deducibles de la renta imponible hasta por el diez por ciento del ingreso base de cotización del afiliado\". And there is a SECOND ceiling on a different base for a different taxpayer — \"Otras personas naturales no afiliadas que realicen aportes a los mismos, podrán deducir hasta un diez por ciento de la renta imponible declarada en el ejercicio fiscal inmediato anterior\". Two ceilings, both ten per cent, measured on two different things. Anybody modelling this has to pick the right one per reader, which is a question the form does not currently ask.\n\nWHERE IT CAN ACTUALLY BITE, which is one field. Every calculation that derives the contribution from the statutory rate is unaffected by definition — /retenciones/ in both its payroll and recalculation panels, and the salary estimate of /renta-anual/. The exposure is the direct mode of /renta-anual/, where the reader types the year's contribution: money that is voluntary would be excluded from the renta obtenida along with the compulsory part, which is both too much and the wrong mechanism, and it moves the $9,100 and $60,000 tests. The field therefore asks for the compulsory contribution by name and its help text says why, so the wrong figure is unlikely to be entered rather than silently mishandled.\n\nWHY IT IS STILL NOT MODELLED NOW THAT THE TEXT IS READ. It is a larger piece of work than the missing number made it look: voluntary saving is a deduction against the renta imponible, so it needs its own input, its own ceiling — chosen between the two above — and its own line in the chain on screen, below the renta obtenida rather than above it. The ingreso base de cotización it is measured against is itself defined by article 14, which excludes the aguinaldo and occasional bonuses, so the ceiling is not simply ten per cent of the salary this page already knows."
  }],
});

export const annualDonationsUnmodelled = rule<string[]>({
  id: "annualDonationsUnmodelled",
  unit: "not-modelled",
  versions: [{
    // The date of the neighbouring articles of this law, not a reading of this
    // article's own history: nothing here depends on the date, because there is
    // no value to pick a version of.
    from: "2011-12-30",
    value: ["donaciones del artículo 32"],
    norm: "Ley de Impuesto sobre la Renta art. 32 numeral 4",
    source: "incomeTax",
    reviewed: "2026-08-18",
    status: ["NOT MODELLED"],
    note: "NOT MODELLED, and now read rather than assumed. Article 29 numeral 7 sends everyone above $9,100 of renta obtenida to articles 32 AND 33, and /renta-anual/ models only 33.\n\nWHAT ARTICLE 32 TURNS OUT TO CONTAIN. Its first three numerals are employer-side and cannot reach a salaried filer: erogaciones for workers' housing, schools, hospitals and medical services provided free and across the workforce; sanitation works; and employer contributions to workers' associations and cooperatives. THE ONE THAT REACHES THIS PAGE'S READER IS NUMERAL 4, donations to the entities of article 6, deductible \"HASTA UN LÍMITE MÁXIMO DEL VEINTE POR CIENTO DEL VALOR RESULTANTE DE RESTAR A LA RENTA NETA DEL DONANTE EN EL PERIODO O EJERCICIO DE IMPOSICIÓN RESPECTIVO, EL VALOR DE LA DONACIÓN\" — a ceiling defined on the net of the donation itself, not a flat share of income, and one that would need its own solve.\n\nSo the gap is narrower than the article number suggests and still real: a reader who donated is shown a balance larger than the one they will file. The error flatters the page on screen and costs the reader at the window, which is precisely why it is easy to leave unwritten. Modelling it needs an input, the article 6 qualification the page cannot check, and the circular ceiling above."
  }],
});

export const annualTablePriorExercises = rule<{ firstExercise: number }>({
  id: "annualTablePriorExercises",
  unit: "not-modelled",
  versions: [{
    from: "2011-12-30",
    value: { firstExercise: 2025 },
    norm: "Ley de Impuesto sobre la Renta art. 37 (texto anterior al D.L. 293 del 30 de abril de 2025)",
    source: "incomeTax",
    reviewed: "2026-08-18",
    status: ["NOT MODELLED"],
    note: "NOT MODELLED, and the search for the missing figures has now been done. D.L. 293 changed bands I and II of article 37, and this registry carries only the table that resulted, so an exercise that closed before 2025 cannot be priced: /renta-anual/ offers 2025 as its first year rather than applying today's table to a year it did not govern, and `annualTableFor` reports `predatesRule` for anything earlier.\n\nTHE CONSOLIDATED TEXT CANNOT CLOSE THIS, which is the useful finding. A consolidated text carries the law as it stands, so `sources.incomeTax` prints the post-reform table and nothing else; the superseded band I and II figures are simply not in it, and the reform index only names the decree that replaced them. Closing the gap therefore needs a different document — the pre-2025 consolidated text, or whichever decree last set those two bands before D.L. 293 — and not another reading of the one this rule points at.\n\nThe code is ready for it either way: the older figures would be one more entry in `annualTaxTable.versions`, and the exercise close of article 13 letter c) already picks the right one."
  }],
});

/**
 * Above this, a salaried worker files whatever the withholding did.
 *
 * Article 38 exempts the salaried from filing, and then names three cases that
 * put the obligation back: renta above this figure, no withholding made at all,
 * and withholding that "no guarda correspondencia" with the article 37 table.
 * The third one is the page's own result, which is why the calculator can tell
 * a reader they have to file without asking them anything else.
 */
export const annualFilingThreshold = rule<number>({
  id: "annualFilingThreshold",
  unit: "usd/year",
  versions: [{
    from: "2011-12-30",
    value: 60000,
    norm: "Ley de Impuesto sobre la Renta art. 38",
    source: "incomeTax",
    reviewed: "2026-08-18",
    note: "Read back against the consolidated text: article 38 exempts the salaried from filing \"SALVO AQUELLAS PERSONAS CON RENTAS MAYORES A US$60,000.00 ANUALES\", plus the two other cases it names. Measured on the same renta obtenida as the $9,100 test of article 29 numeral 7. The reasoning is written once, on `fixedDeductionIncomeLimit`, and this note deliberately does not restate it: two copies of a legal argument drift apart, and the one that drifts is always the one nobody is looking at. Read that note before changing anything here.\n\nOne thing that IS specific to this article: the threshold is \"mayores a\", so a renta obtenida of exactly $60,000 does not trigger the filing obligation.",
  }],
});

/**
 * The article 33 deductions, which no withholding table can know about.
 *
 * $800 for each of two concepts, so $1,600 at most — the same figure as the
 * fixed deduction, and not by accident: the two are alternatives. Article 33
 * excludes "la comprendida en el numeral 7) del artículo 29", and article 29
 * numeral 7 sends everyone above $9,100 to articles 32 and 33. Below that
 * limit, the flat $1,600 with no receipts; above it, up to $1,600 but only for
 * money actually spent, "sujetas a comprobación".
 */
export const annualDeductionLimit = rule<number>({
  id: "annualDeductionLimit",
  unit: "usd/year",
  versions: [{
    from: "2011-12-30",
    value: 800,
    norm: "Ley de Impuesto sobre la Renta art. 33 literales a) y b)",
    source: "incomeTax",
    reviewed: "2026-08-18",
    note: "Read back against the consolidated text, where the figure is spelled out in words and not digits — \"UN MONTO MÁXIMO DE OCHOCIENTOS DÓLARES DE LOS ESTADOS UNIDOS DE AMÉRICA, EN CADA EJERCICIO O PERÍODO IMPOSITIVO, POR CADA UNO DE LOS CONCEPTOS SIGUIENTES\" — which is why searching the PDF for \"800\" finds nothing. The same sentence excludes \"LA COMPRENDIDA EN EL NUMERAL 7) DEL ARTÍCULO 29\", which is what makes the two branches alternatives. Per concept and per exercise: medical and hospital services under literal a), schooling of children under 25 or the taxpayer's own studies under literal b). The receipts are not attached to the return and have to be kept for six years.",
  }],
});

/**
 * How long after the exercise the return is due.
 *
 * Stored as the months article 48 grants rather than as "30 April", because the
 * date is a derivation: article 13 letter a) closes the exercise on 31 December
 * and four months from there is the deadline. Writing the date down would be
 * writing down an answer instead of the rule that produces it.
 */
export const annualFilingWindowMonths = rule<number>({
  id: "annualFilingWindowMonths",
  unit: "months",
  versions: [{
    from: "1991-12-21",
    value: 4,
    norm: "Ley de Impuesto sobre la Renta arts. 13 literal a) y 48",
    source: "incomeTax",
    reviewed: "2026-08-17",
    note: "Article 48: the return is filed \"dentro de los cuatro meses siguientes al vencimiento del ejercicio o período de imposición\". Article 13 letter a) fixes that exercise at 1 January to 31 December for natural persons.",
  }],
});

/**
 * The ingreso base de cotización, which is not the gross and is not the income
 * tax base either.
 *
 * THREE BASES, AND THIS IS THE ONE NOBODY EXPECTS. Article 14 of the pension
 * law builds the contributory base out of "el salario mensual que devenguen"
 * and then takes things back out of it: "No forman parte del Ingreso Base de
 * Cotización" the occasional gratifications and bonuses, THE AGUINALDO,
 * viáticos, gastos de representación and the prestaciones sociales the law
 * establishes. So a December payslip that carries the year-end bonus
 * contributes on the salary alone.
 *
 * It matters because the money is still pay. The excluded concepts leave the
 * pension base and nothing else: they stay in the income tax base and they stay
 * in the net, so this cannot be modelled by simply lowering the gross.
 * `calculatePayrollWithholding` takes the excluded part as its own input for
 * that reason.
 *
 * The list is what a caller has to be able to recognise, so it is the value.
 */
export const contributoryBaseExclusions = rule<string[]>({
  id: "contributoryBaseExclusions",
  unit: "exclusions",
  versions: [{
    from: "2023-01-01",
    value: [
      "gratificaciones y bonificaciones ocasionales",
      "aguinaldo",
      "viáticos",
      "gastos de representación",
      "prestaciones sociales establecidas por la ley",
    ],
    norm: "Ley Integral del Sistema de Pensiones art. 14",
    source: "pensions",
    reviewed: "2026-08-18",
    note: "Read straight out of the SSF PDF. Charging the rate on a gross that includes the aguinaldo doubles the contribution of somebody whose bonus equals a month of pay — $130.50 instead of $65.25 on a $900 salary — which is what this rule exists to stop.\n\nWHAT THE PAGE STILL DOES NOT DO WITH THAT MONEY. Taking the bonus out of the pension base does not give it its own income tax treatment: the exempt slice of article 4 numeral 16 and the transitory decrees is worked out on /aguinaldo/ and in the annual return, not inside a pay period, because no text names the table that withholds on a bonus. A period priced here with the aguinaldo inside it therefore has the right AFP and an income tax figure that taxes the whole bonus. The interface says so where the field is.",
  }],
});

/**
 * The floor of that same base, which this project does not apply.
 */
export const contributoryBaseFloor = rule<string[]>({
  id: "contributoryBaseFloor",
  unit: "not-modelled",
  versions: [{
    from: "2023-01-01",
    value: ["salario mínimo legal mensual en vigencia"],
    norm: "Ley Integral del Sistema de Pensiones art. 14",
    source: "pensions",
    reviewed: "2026-08-18",
    status: ["NOT MODELLED"],
    note: "NOT MODELLED. The same article that lists the exclusions of `contributoryBaseExclusions` sets a floor under the base: it \"no podrá ser inferior al salario mínimo legal mensual en vigencia\", with exceptions for apprentices, agricultural and domestic workers and others whose income falls below it, determined by technical rules the Banco Central issues. This project applies the rate to whatever base it is given, so for pay under the minimum wage it reports a contribution smaller than the one the law asks for — the opposite direction from the exclusions above, and a case /retenciones/ can reach whenever somebody prices a part-time or partial month.\n\nModelling it needs the sector, which the withholding page does not ask for — `minimumWage` is per sector — and the Banco Central's technical rules for the exceptions, which are not in this registry. Neither is a reading of the article; both are documents nobody here has opened.",
  }],
});

/**
 * What leaves the gross before the table is applied.
 *
 * The pension contribution is settled by statute: the COMPULSORY contribution
 * is a "renta no gravable para efectos del Impuesto sobre la Renta", so it
 * never enters the base in the first place. The exempting article is named in
 * exactly one place, `afpEmployeeRate` — read it there rather than copying the
 * number into this file, which is what keeps one citation from becoming seven.
 *
 * THE TWO ARE NOT INTERCHANGEABLE, which is the whole reason this rule names
 * them separately: article 4 of the Ley de Impuesto sobre la Renta excludes a
 * renta no gravable "del cómputo de la renta obtenida", so the pension money is
 * out of the figure the $9,100 and $60,000 thresholds are read against, while
 * the health contribution is only a subtraction on the way to the renta
 * imponible and is still inside it. The renta imponible comes out the same
 * either way; the thresholds do not.
 *
 * WHAT THIS LIST DOES NOT SPLIT: compulsory from voluntary. Only the compulsory
 * contribution is renta no gravable, and the gap is declared as a rule of its
 * own — `voluntaryPensionUnmodelled` — rather than described here, because a
 * limitation that lives only in a comment is one nobody re-reads. The health contribution has no article of its own
 * saying that, and what carries it is the third recital of Executive Decree
 * 10/2025, which describes the withholding tables as built on the renta neta
 * "una vez deducidos de los ingresos brutos [...] las cotizaciones
 * previsionales, remuneraciones no gravadas y las deducciones legales de
 * seguridad social, educación y salud, reguladas en los artículos 29, numeral
 * 7) y 33". That is the tax administration stating how the base is built, in a
 * decree, and it is the citation this project prints — a recital rather than an
 * article, which is why it is named here instead of being left implicit in the
 * arithmetic of two calculators.
 */
export const contributionsExcludedFromBase = rule<string[]>({
  id: "contributionsExcludedFromBase",
  unit: "exclusions",
  versions: [{
    from: "2025-05-01",
    value: ["cotización previsional (AFP)", "cotización de seguridad social (ISSS)"],
    norm: "Decreto Ejecutivo 10/2025, considerando III",
    source: "withholding",
    reviewed: "2026-08-17",
    note: "The employer's share is not in this list and never was: only what is withheld from the worker leaves the worker's base. The pension entry means the COMPULSORY contribution alone; voluntary saving is not renta no gravable and is not modelled, per `voluntaryPensionUnmodelled`.",
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
    // The Code itself, not the MTPS explainer that paraphrases it. The note
    // below is a verbatim quotation, so the document that carries it is the one
    // to open; the explainer named an article it does not print.
    source: "laborCode",
    reviewed: "2026-08-20",
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
    // Read back against the consolidated Code on 20 August 2026: article 161
    // gives 8/44 diurnal and 7/39 nocturnal and the four-hour test, article 162
    // gives 7/39 and 6/36 for dangerous work and the three-and-a-half-hour
    // test, article 116 gives 6/34 for under-sixteens. Every figure below is in
    // those three articles; none of them is in the MTPS page this used to cite.
    source: "laborCode",
    reviewed: "2026-08-20",
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
    source: "laborCode",
    reviewed: "2026-08-20",
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
    citedThrough: "Los factores nocturnos no están en ningún artículo suelto: los arts. 175 y 192 mandan calcular los recargos sobre el salario extraordinario del día y el 168 pone el 25%, pero el ORDEN de las dos operaciones solo lo fija el ejemplo numérico que publica el MTPS. El enlace abre ese ejemplo porque es lo único que sostiene el 2.5.",
    reviewed: "2026-08-11",
  }],
});

// --- The registry -----------------------------------------------------------

export const RULES = {
  minimumWage, severanceDaysPerYear, severanceMinimumDays, severanceWageCap,
  resignationDaysPerYear, resignationWageCap, resignationMinimumService,
  dailySalaryDivisor, accrualYearDays,
  vacationDaysPerYear, vacationSurcharge, vacationProportionalOnExit, vacationUnmodelled,
  aguinaldoScale, aguinaldoScaleOnExit, aguinaldoCutoff, aguinaldoCycleStart,
  aguinaldoPaymentWindow, aguinaldoTaxExemption,
  quincena25SalaryCeiling, quincena25Rate, quincena25Exempt, quincena25Window,
  quincena25MandatoryFrom,
  withholdingTables, recalcTables, recalcMonths,
  afpEmployeeRate, isssEmployeeRate, isssMonthlyCeiling,
  contributoryBaseExclusions, contributoryBaseFloor,
  fixedDeduction, fixedDeductionIncomeLimit,
  annualTaxTable, annualFilingThreshold, annualDeductionLimit, annualFilingWindowMonths,
  annualDonationsUnmodelled, annualTablePriorExercises, voluntaryPensionUnmodelled,
  contributionsExcludedFromBase,
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
 * `loans` and `creditCard` are empty on purpose: nothing in either calculator
 * comes from Salvadoran statute — the arithmetic is interest on a balance —
 * which is why neither makes a freshness claim at all. An empty list here is a
 * statement, not an omission, and the test suite asserts it stays one.
 */
export const RULE_USAGE: Record<Page, RuleId[]> = {
  home: Object.keys(RULES) as RuleId[],
  loans: [],
  creditCard: [],
  // The annual return applies the article 37 table itself, not the withholding
  // tables: it settles the year, it does not estimate a payroll. What it shares
  // with /retenciones/ are the two article 29 figures, the contribution rates
  // that leave the base, and — through the bonus — the exemption of article 4
  // numeral 16 and the minimum wage it is measured in.
  annualTax: [
    "annualTaxTable", "annualFilingThreshold", "annualDeductionLimit",
    "annualFilingWindowMonths", "contributionsExcludedFromBase",
    "annualDonationsUnmodelled", "annualTablePriorExercises", "voluntaryPensionUnmodelled",
    "fixedDeduction", "fixedDeductionIncomeLimit",
    "afpEmployeeRate", "isssEmployeeRate", "isssMonthlyCeiling",
    "aguinaldoTaxExemption", "minimumWage",
  ],
  settlement: [
    "minimumWage", "severanceDaysPerYear", "severanceMinimumDays", "severanceWageCap",
    "resignationDaysPerYear", "resignationWageCap", "resignationMinimumService",
    "dailySalaryDivisor", "accrualYearDays",
    "vacationDaysPerYear", "vacationSurcharge", "vacationProportionalOnExit", "vacationUnmodelled",
    "aguinaldoScale", "aguinaldoScaleOnExit", "aguinaldoCutoff", "aguinaldoCycleStart",
    "quincena25SalaryCeiling", "quincena25Rate", "quincena25Exempt", "quincena25Window",
    "quincena25MandatoryFrom",
  ],
  // `aguinaldoTaxExemption` is listed now that the page shows the exempt slice.
  // It was absent while the fiscal panel was off, because a review date in a
  // freshness badge has to be about a figure the page actually prints.
  aguinaldo: [
    "dailySalaryDivisor", "accrualYearDays",
    "aguinaldoScale", "aguinaldoScaleOnExit", "aguinaldoCutoff", "aguinaldoCycleStart",
    "aguinaldoPaymentWindow", "aguinaldoTaxExemption",
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
    // The page subtracts both contributions from every base it prints and
    // measures the $9,100 limit on the renta obtenida the AFP has left, so the
    // rule that says which of the two is an exclusion is one this page applies.
    "contributionsExcludedFromBase", "contributoryBaseExclusions", "contributoryBaseFloor",
  ],
  // Whatever is in dispute, and nothing else. Written as a derivation rather
  // than a list because the page is one too: a rule marked DISPUTED that this
  // entry forgot would be published with somebody else's review date under it.
  disputed: [...new Set(disputedVersions().map(({ rule }) => rule.id as RuleId))],
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

/**
 * The two halves of /reglas-en-disputa/, which are not the same kind of thing.
 *
 *   disputed   a text and a practice, or two articles, say different things.
 *              There are two readings and this project applies one of them.
 *   unsourced  nothing says anything. No two readings to set against each
 *              other: a silence, and a figure somebody had to choose.
 *
 * Publishing both under one heading was the mistake this splits. A reader shown
 * "two readings" for a rule that has none is being handed a manufactured
 * counter-argument, and a silence filed under "disputes" reads as the weaker
 * problem of the two when it is usually the stronger one.
 *
 * A version flagged both ways is disputed: `quincena25Window` has two live
 * readings of article 3 AND an invented lower bound, and the disagreement is
 * the part a reader has to decide about first.
 */
export type ContestedSection = "disputed" | "unsourced";

export function sectionFor(version: RuleVersion<unknown>): ContestedSection {
  return version.status?.includes("DISPUTED") ? "disputed" : "unsourced";
}

/**
 * Every version of every rule that claims something beyond a reading of its
 * text, in registry order, optionally narrowed to one section.
 *
 * This is what /reglas-en-disputa/ is built from. Marking a rule DISPUTED or
 * UNSOURCED is therefore the only step needed to publish it: there is no second
 * list to remember, which is exactly the failure this replaces — a divergence
 * recorded in a comment nobody outside the repository will ever read.
 *
 * `NOT MODELLED` is neither a disagreement about what the law says nor a
 * silence this project filled; it is a gap in what it computes, and it belongs
 * in the limitations a calculator states rather than on this page.
 */
export function disputedVersions(section?: ContestedSection) {
  const contested: { rule: AnyRule; version: RuleVersion<unknown> }[] = [];
  for (const rule of ALL_RULES) {
    for (const version of rule.versions) {
      if (!version.status?.some((flag) => flag === "DISPUTED" || flag === "UNSOURCED")) continue;
      if (section !== undefined && sectionFor(version) !== section) continue;
      contested.push({ rule, version });
    }
  }
  return contested;
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
    const key = `${version.norm}\u0000${version.source}`;
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

/**
 * The institutions this site's figures actually come from, most-cited first,
 * each with the document of theirs the registry leans on hardest.
 *
 * For the home page's row of sources, which used to be four names typed into a
 * component. A front door that names four documents while the calculators
 * behind it cite fifteen is not a summary; it is a claim that has fallen
 * behind, and it is the half of the site a first-time reader judges the rest
 * by. Derived, so it cannot happen again.
 */
export function institutionsCited(): { name: string; href: string }[] {
  const tally = new Map<string, { name: string; source: SourceKey; rules: number }>();
  for (const rule of ALL_RULES) {
    // One rule counts once for a document however many versions cite it: five
    // transitory decrees in one rule are not five reasons to trust the LISR.
    for (const source of new Set(rule.versions.map((version) => version.source))) {
      const name = institutionOf(source);
      if (!name) continue;
      const seen = tally.get(name);
      if (seen === undefined) tally.set(name, { name, source, rules: 1 });
      else seen.rules += 1;
    }
  }
  return [...tally.values()]
    .sort((a, b) => b.rules - a.rules || a.name.localeCompare(b.name))
    .map(({ name, source }) => ({ name, href: OFFICIAL[source] }));
}
