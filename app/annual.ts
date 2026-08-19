// Extensions written out: the test suite imports this module through Node's
// type stripping, which resolves specifiers literally. See tsconfig.json.
import { aguinaldoTax } from "./aguinaldo.ts";
import { round2 } from "./dates.ts";
import {
  afpEmployeeRate, aguinaldoExemptionFor, annualDeductionLimit, annualFilingThreshold,
  annualFilingWindowMonths, annualTaxTable, currentValue, fixedDeduction,
  fixedDeductionIncomeLimit, isssEmployeeRate, isssMonthlyCeiling, ruleAt,
  type RuleId, type WithholdingBand,
} from "./rules.ts";
import { applyBands } from "./statutory.ts";

/**
 * The annual settlement of income tax for somebody whose income is a salary.
 *
 * WHAT THIS IS NOT: a refund calculator. The balance lands against the reader
 * about as often as it lands in their favour, and for a reason that is
 * structural rather than anybody's mistake. The withholding tables of Executive
 * Decree 10/2025 are built with $1,600 of deductions already inside bands III
 * and IV — see the comment above `annualTaxTable` — while article 37 grants that
 * $1,600 only to somebody entitled to it: the flat deduction of article 29
 * numeral 7 below $9,100 of renta obtenida, or article 33 receipts above it. A
 * worker over $9,100 who spent nothing on medicine or schooling was therefore
 * under-withheld all year, by 20% or 30% of $1,600, and owes it in April.
 *
 * That is why `receiptsToClose` exists and why the page treats it as the
 * headline rather than as a footnote: for the reader with a balance due, the
 * one actionable number on the screen is how many dollars of article 33
 * receipts would take it to zero.
 *
 * WHAT IT DOES NOT MODEL, on purpose: any income that is not a salary, article
 * 32 donations, and the withholding on a year-end bonus above the exempt slice
 * — no text names the table for that one, which is exactly why the excess
 * surfaces here as a balance instead.
 */

const AFP_RATE = currentValue(afpEmployeeRate);
const ISSS_RATE = currentValue(isssEmployeeRate);
const ISSS_MONTHLY_CEILING = currentValue(isssMonthlyCeiling);
const FIXED_DEDUCTION = currentValue(fixedDeduction);
const FIXED_DEDUCTION_INCOME_LIMIT = currentValue(fixedDeductionIncomeLimit);
const FILING_THRESHOLD = currentValue(annualFilingThreshold);
const DEDUCTION_LIMIT = currentValue(annualDeductionLimit);
const FILING_WINDOW_MONTHS = currentValue(annualFilingWindowMonths);
const MONTHS_IN_A_YEAR = 12;

/** The two article 33 concepts, each with its own $800 ceiling. */
export const DEDUCTION_CONCEPTS = 2;
/** The most article 33 can ever reach: $800 medical plus $800 schooling. */
export const MAX_ITEMISED_DEDUCTION = round2(DEDUCTION_LIMIT * DEDUCTION_CONCEPTS);

/**
 * The day the exercise closes, which is the day the table is read at.
 *
 * Article 13 letter c) presumes the renta obtained "a la medianoche del día en
 * que termine el ejercicio", so a return for 2025 is priced with whatever
 * governed on 31 December 2025 — not with what governed when the salary was
 * paid, and not with today's table.
 */
export const exerciseClose = (exercise: number) => `${exercise}-12-31`;

/** The article 37 table for an exercise, and whether it predates every version. */
export function annualTableFor(exercise: number) {
  const { version, predatesRule } = ruleAt(annualTaxTable, exerciseClose(exercise));
  return { table: version.value as WithholdingBand[], version, predatesRule };
}

/** The filing deadline: four months after the close of the exercise. */
export function filingDeadline(exercise: number) {
  const month = FILING_WINDOW_MONTHS;
  // The exercise closes on 31 December, so four months lands on the last day of
  // April. Built from the rule rather than written as a date — see the note on
  // `annualFilingWindowMonths`.
  const close = new Date(Date.UTC(exercise, 11, 31));
  const deadline = new Date(Date.UTC(close.getUTCFullYear(), close.getUTCMonth() + month + 1, 0));
  return deadline.toISOString().slice(0, 10);
}

export type AnnualInput = {
  exercise: number;
  /** Renta obtenida gravada of the year, bonus excess apart. */
  taxableIncome: number;
  /** Income tax withheld from the payslips over the year. */
  withheld: number;
  afpPaid: number;
  isssPaid: number;
  /** The year-end bonus received, gross. Its exempt slice is worked out here. */
  bonus?: number;
  medicalExpenses?: number;
  educationExpenses?: number;
  /** Declared by the reader: more than one employer during the exercise. */
  multipleEmployers?: boolean;
};

/**
 * The four figures of a flat year, for a reader who has a salary and not a set
 * of payroll totals.
 *
 * Same assumption and same warning as `estimateAccumulated` in the withholding
 * module: twelve identical months, no bonus, no month out, one employer. It is
 * offered because most people cannot see their payroll totals, and it is an
 * estimate of an estimate — which is why the interface says so beside it and
 * asks for the real figures whenever the reader has a payslip in hand.
 *
 * The withholding it estimates is the payroll one, month by month, WITHOUT the
 * June and December recalculations: a reader whose employer ran those has a
 * different accumulated figure and should type it.
 */
export function estimateAnnualFromSalary(input: {
  monthlySalary: number;
  months?: number;
  monthlyWithholding: number;
}) {
  const months = Math.max(0, Math.min(MONTHS_IN_A_YEAR, input.months ?? MONTHS_IN_A_YEAR));
  const salary = Math.max(0, input.monthlySalary || 0);
  const afp = round2(salary * AFP_RATE * months);
  const isss = round2(Math.min(salary, ISSS_MONTHLY_CEILING) * ISSS_RATE * months);
  return {
    months,
    taxableIncome: round2(salary * months),
    afpPaid: afp,
    isssPaid: isss,
    withheld: round2(Math.max(0, input.monthlyWithholding || 0) * months),
  };
}

export type AnnualResult = ReturnType<typeof calculateAnnualReturn>;

export function calculateAnnualReturn(input: AnnualInput) {
  const { table, predatesRule } = annualTableFor(input.exercise);

  // The bonus, split into its exempt slice and the part that is renta gravada.
  // `withhold` is deliberately not passed: no text names the table that
  // withholds on a bonus, and this module does not invent one either. The
  // excess simply joins the year's taxable income, where article 37 reaches it.
  const exemption = aguinaldoExemptionFor(input.exercise);
  const bonus = aguinaldoTax({
    bonus: Math.max(0, input.bonus || 0),
    exemption: exemption.version.value as Parameters<typeof aguinaldoTax>[0]["exemption"],
  });

  const salaryIncome = round2(Math.max(0, input.taxableIncome || 0));
  /** The taxable pay of the year, before anything leaves it. */
  const grossPay = round2(salaryIncome + bonus.taxable);
  const withheld = round2(Math.max(0, input.withheld || 0));
  const afpPaid = round2(Math.max(0, input.afpPaid || 0));
  const isssPaid = round2(Math.max(0, input.isssPaid || 0));
  const contributions = round2(afpPaid + isssPaid);

  // RENTA OBTENIDA, AND WHY THE PENSION CONTRIBUTION IS NOT IN IT. The
  // compulsory contribution is a renta no gravable, and article 4 of the Ley de
  // Impuesto sobre la Renta says what that status does: such income is "en
  // consecuencia excluida del cómputo de la renta obtenida". So the AFP never
  // enters the figure the two thresholds below are measured on — it is an
  // exclusion, not a deduction. The reasoning and the citation live in
  // `fixedDeductionIncomeLimit` and `afpEmployeeRate`; this comment does not
  // repeat an article number, because a number repeated is a number that drifts.
  //
  // The health contribution is NOT in the same position and this module does
  // not put it there. No statute gives the ISSS that character; what carries it
  // is the third recital of Executive Decree 10/2025, which describes it as
  // deducted from the ingresos brutos when the base is built. That makes it a
  // subtraction on the way to the renta imponible and nothing more, which is
  // why it comes out one line below and not here.
  //
  // The renta imponible is the same either way — the two contributions both
  // leave before the table — so the only thing riding on this distinction is
  // the two thresholds, and they are exactly where it bites: a gross of $9,400
  // is renta obtenida of $8,718.50, which is under the limit and gets the flat
  // deduction that measuring on the gross would have denied it.
  //
  // `afpPaid` IS THE READER'S OWN FIGURE, which is the one place in this
  // project where a voluntary contribution could get excluded along with the
  // compulsory one — only the compulsory part is renta no gravable. The field
  // asks for the compulsory contribution and says so; the gap is declared in
  // `voluntaryPensionUnmodelled`.
  const rentaObtenida = round2(Math.max(0, grossPay - afpPaid));

  // The bifurcation of article 29 numeral 7. Below the limit, the flat $1,600
  // with nothing to prove; above it, articles 32 and 33 — of which this page
  // models 33 — and only for money actually spent.
  const qualifiesForFixedDeduction = rentaObtenida <= FIXED_DEDUCTION_INCOME_LIMIT;
  const cap = (value: number | undefined) => round2(Math.min(Math.max(0, value || 0), DEDUCTION_LIMIT));
  const medical = qualifiesForFixedDeduction ? 0 : cap(input.medicalExpenses);
  const education = qualifiesForFixedDeduction ? 0 : cap(input.educationExpenses);
  const itemised = round2(medical + education);
  const flat = qualifiesForFixedDeduction ? FIXED_DEDUCTION : 0;
  const deductions = round2(flat + itemised);

  // Renta imponible: the renta obtenida less what article 33 and the recital
  // take out of it. The AFP is already gone — it was never in `rentaObtenida`.
  const taxable = round2(Math.max(0, rentaObtenida - isssPaid - deductions));
  const settled = applyBands(taxable, table);
  const balance = round2(settled.amount - withheld);

  // Article 38's three exceptions, and the reader only has to answer one
  // question for all three: everything else is already on the screen.
  // Measured on the same renta obtenida as the $9,100 test, and for the same
  // reason: article 38 speaks of "rentas", and a renta no gravable is not one.
  const overThreshold = rentaObtenida > FILING_THRESHOLD;
  const nothingWithheld = withheld === 0 && settled.amount > 0;
  // "Las retenciones efectuadas no guardan correspondencia con el impuesto".
  // The text sets no minimum, so neither does this: any difference counts, and
  // the page says the law fixes no threshold rather than inventing one.
  const mismatch = balance !== 0;

  return {
    exercise: input.exercise,
    predatesRule,
    table,
    bonusGross: bonus.gross,
    bonusExempt: bonus.exempt,
    bonusTaxable: bonus.taxable,
    exemptionByDecree: exemption.byDecree,
    exemptionNorm: exemption.version.norm,
    salaryIncome,
    /** Taxable pay of the year, contributions still inside. */
    grossPay,
    /** What the two thresholds are measured on: the pay less the AFP. */
    rentaObtenida,
    afpPaid,
    isssPaid,
    contributions,
    qualifiesForFixedDeduction,
    fixedDeduction: flat,
    medicalDeduction: medical,
    educationDeduction: education,
    itemisedDeduction: itemised,
    deductions,
    taxable,
    tax: settled.amount,
    band: settled.band,
    marginalRate: settled.rate,
    withheld,
    /** Positive: owed to the treasury. Negative: withheld in excess. */
    balance,
    balanceDue: balance > 0 ? balance : 0,
    balanceInFavour: balance < 0 ? round2(-balance) : 0,
    filing: { overThreshold, nothingWithheld, mismatch, mustFile: overThreshold || nothingWithheld || mismatch },
    multipleEmployers: input.multipleEmployers === true,
    deadline: filingDeadline(input.exercise),
    appliedRules: appliedRulesFor({ qualifiesForFixedDeduction, itemised, bonus: bonus.gross }),
  };
}

/**
 * The receipts that would close a balance due, which is the one number on this
 * page a reader can act on.
 *
 * Only for the case it exists in: somebody above $9,100 who has article 33 room
 * left. Below that limit the flat deduction is already applied and there are no
 * receipts to add; the balance, if any, has another cause.
 *
 * Solved rather than divided. Dividing the balance by the marginal rate is
 * right only while the deduction stays inside one band, and the interesting
 * cases sit near a boundary, where a dollar of receipts stops being worth 30
 * cents and starts being worth 20. Bisection over `applyBands` cannot get that
 * wrong, and it is the same table the tax came from.
 */
export function receiptsToClose(result: AnnualResult) {
  const room = round2(MAX_ITEMISED_DEDUCTION - result.itemisedDeduction);
  if (result.balanceDue <= 0 || result.qualifiesForFixedDeduction || room <= 0) {
    return { possible: false as const, needed: 0, room, closesFully: false, remaining: result.balanceDue };
  }
  const taxAfter = (extra: number) =>
    applyBands(round2(Math.max(0, result.taxable - extra)), result.table).amount;
  // Nothing to solve when the whole room is not enough: report what it does.
  if (round2(taxAfter(room) - result.withheld) > 0) {
    return {
      possible: true as const, needed: room, room, closesFully: false,
      remaining: round2(taxAfter(room) - result.withheld),
    };
  }
  let low = 0;
  let high = room;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (taxAfter(mid) - result.withheld > 0) low = mid; else high = mid;
  }
  return { possible: true as const, needed: round2(high), room, closesFully: true, remaining: 0 };
}

/**
 * The rules a particular return actually leant on, for the exported document.
 * Built from what the calculation did, the way the settlement builds its own: a
 * reader with no bonus should not be handed the bonus exemption as a citation.
 */
function appliedRulesFor(input: {
  qualifiesForFixedDeduction: boolean; itemised: number; bonus: number;
}): RuleId[] {
  const ids: RuleId[] = [
    "annualTaxTable", "contributionsExcludedFromBase",
    "afpEmployeeRate", "isssEmployeeRate", "isssMonthlyCeiling",
    "fixedDeductionIncomeLimit", "annualFilingThreshold", "annualFilingWindowMonths",
    // The gaps travel with the citation list, the way the settlement carries
    // `vacationUnmodelled`: an exported return that names article 33 and stays
    // silent about article 32 has told the reader the list is complete. The
    // voluntary-saving gap rides along for the same reason — it is the one that
    // can move this page's thresholds if the reader put the wrong figure in the
    // AFP box, so a printed return should not hide it either.
    "annualDonationsUnmodelled", "voluntaryPensionUnmodelled",
  ];
  if (input.qualifiesForFixedDeduction) ids.push("fixedDeduction");
  else ids.push("annualDeductionLimit");
  if (input.bonus > 0) ids.push("aguinaldoTaxExemption", "minimumWage");
  return ids;
}
