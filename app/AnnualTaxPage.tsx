import { useMemo, useState } from "react";
import {
  calculateAnnualReturn, estimateAnnualFromSalary, MAX_ITEMISED_DEDUCTION, receiptsToClose,
} from "./annual";
import { CheckField, MoneyField, NumberField, SegmentedField, SelectField } from "./fields";
import { todayIso } from "./loan";
import { downloadPdf } from "./pdf";
import { reviewedLineFor } from "./reviewed";
import { readShare, type ShareSchema } from "./share";
import { ShareButton, SharedNotice } from "./ShareLink";
import { citationsFor, currentValue, fixedDeductionIncomeLimit, reviewedFor } from "./rules";
import type { Lang } from "./routes";
import { ROUTES } from "./routes";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { OFFICIAL } from "./sources";
import { calculatePayrollWithholding } from "./statutory";
import UtilityHero from "./UtilityHero";

/**
 * The annual return, and the page on this site that sits closest to advice.
 *
 * THREE THINGS IT IS NOT ALLOWED TO DO, and they shape the whole layout:
 *
 * 1. Promise a refund. The balance lands against the reader as often as it
 *    lands in their favour — see the comment above `calculateAnnualReturn` —
 *    so the headline is a balance with a sign, never "you will be paid".
 * 2. Bury the caveat. The estimate-not-advice notice is a band under the hero,
 *    above the calculator, because a reader who acts on this figure without
 *    filing or without an accountant is the failure mode.
 * 3. Leave a balance due without a way out. Where article 33 receipts would
 *    close it, the amount that would close it goes in the same block as the
 *    balance itself. It is the most actionable number on the site.
 */

type Source = "direct" | "salary";

const INCOME_LIMIT = currentValue(fixedDeductionIncomeLimit);
const THIS_YEAR = Number(todayIso().slice(0, 4));
/** The table in the registry starts with the 2025 exercise; older ones are refused. */
const FIRST_EXERCISE = 2025;
const EXERCISES = Array.from({ length: Math.max(1, THIS_YEAR - FIRST_EXERCISE + 1) },
  (_, index) => FIRST_EXERCISE + index).reverse();
/**
 * The year the page opens on: the last exercise that actually closed.
 *
 * The current one is offered too — somebody mid-year can project — but opening
 * on it would answer a question about a year that has not happened yet, and the
 * reader who came to find out about a refund is asking about the closed one.
 */
const DEFAULT_EXERCISE = EXERCISES.find((year) => year < THIS_YEAR) ?? EXERCISES[0];

const copy = {
  es: {
    heroTitle: "Tu renta del año, contra lo que ya te retuvieron.",
    heroLead: "El impuesto que te corresponde por el ejercicio, comparado con lo que la planilla te descontó mes a mes. El saldo puede salir a tu favor o en contra: las dos cosas son normales.",
    noticeTitle: "Esto es una estimación educativa",
    noticeText: "No sustituye tu declaración oficial ante la DGII ni la revisión de un contador. Trabaja con las cifras que escribís y con la tabla del artículo 37; tu declaración real puede diferir por ingresos que esta página no modela, por retenciones definitivas o por deducciones que sí podés comprobar y aquí no aparecen. No tomes decisiones de pago sin contrastarla.",

    data: "Tu año", dataHint: "Asalariado con rentas solo de salarios",
    exercise: "Ejercicio", exerciseHint: "El año que vas a declarar",
    openExercise: "Este ejercicio todavía no cierra: corre hasta el 31 de diciembre, así que esto es una proyección de cómo va el año, no la cuenta final.",
    source: "De dónde salen las cifras", sourceDirect: "Las tengo", sourceSalary: "Estimarlas del salario",
    income: "Ingresos gravados del año", withheld: "Renta retenida en el año",
    afp: "AFP obligatoria aportada en el año", isss: "ISSS aportado en el año",
    salary: "Salario mensual", months: "Meses trabajados en el año",
    estimated: "Estimado del salario", estimatedNote: "Meses iguales entre sí, sin bonos ni cambios de salario, y sin el recálculo de junio y diciembre —que puede mover unos centavos—. Si tu año no fue plano, tomá las cifras de tus boletas y cambiá a «Las tengo».",
    bonus: "Aguinaldo recibido", bonusHint: "Opcional. Solo la parte que pasa del monto exento entra a la renta del año.",
    employers: "Tuve más de un patrono durante el año",

    deductions: "Comprobantes del artículo 33", deductionsHint: "Solo para quien pasa de $9,100 de renta obtenida",
    medical: "Gastos médicos", education: "Colegiatura o escolaridad",
    deductionsLocked: "Con una renta obtenida de $9,100 o menos te corresponde la deducción fija de $1,600, que no se comprueba. Los comprobantes del artículo 33 son la otra rama y no se suman a ella.",
    deductionsNote: "Hasta $800 por cada concepto. No se anexan a la declaración, pero se conservan seis años.",
    donationsGapTitle: "El artículo 32 no está acá",
    donationsGapText: "El numeral 7 del artículo 29 manda a quien pasa de $9,100 a los artículos 32 y 33, y esta página solo modela el 33. Si hiciste donaciones deducibles, el saldo que ves es mayor que el que vas a declarar. No ponemos el tope del artículo 32 porque nadie lo ha leído contra el texto vigente para este proyecto, y una cifra de memoria es justo lo que este sitio no hace.",

    result: "Estimación del saldo",
    balanceFavour: "Saldo estimado a tu favor", balanceDue: "Saldo estimado en contra", balanceZero: "Saldo estimado en cero",
    balanceFavourNote: "Es una estimación del saldo, no un monto confirmado ni una promesa de devolución: la declaración oficial es la que liquida.",
    balanceDueNote: "Es una estimación del saldo, no una liquidación. Contrastala antes de pagar.",
    balanceZeroNote: "Con estas cifras, lo retenido coincide con el impuesto del año.",

    grossPay: "Ingresos gravados", grossIncome: "Renta obtenida",
    afpExcluded: "AFP", afpExcludedNote: "cotización obligatoria: renta no gravable",
    thresholdFigure: "sobre esto se miden $9,100 y $60,000",
    thresholdNote: "El umbral se mide sobre la renta obtenida (ingresos gravados menos la cotización obligatoria de AFP), no sobre el salario bruto. El ISSS no se excluye en este punto: reduce la renta imponible, pero no la renta obtenida.",
    isssDeducted: "ISSS", isssDeductedNote: "deducción",
    contributions: "Cotizaciones (AFP e ISSS)",
    deductionsApplied: "Deducciones aplicadas", taxable: "Renta imponible",
    tax: "Impuesto del año", withheldLabel: "Ya retenido", band: "Tramo",
    fixedApplied: "Deducción fija del art. 29 num. 7", itemisedApplied: "Comprobantes del art. 33",

    receiptsTitle: "Lo que cerraría este saldo",
    receiptsLead: "Con", receiptsMid: "en comprobantes de gastos médicos o colegiatura, el saldo llegaría a cero.",
    receiptsPartialLead: "Los $1,600 completos de comprobantes bajan el saldo hasta",
    receiptsPartialTail: "El resto no se cierra por esta vía.",
    receiptsRoom: "Te queda espacio por",
    receiptsNone: "Aquí no hay comprobantes que agregar: con renta obtenida de $9,100 o menos ya se aplicó la deducción fija de $1,600, y el saldo tiene otra causa.",
    receiptsMaxed: "Ya está aplicado el máximo del artículo 33: $800 de gastos médicos y $800 de colegiatura. Lo que queda del saldo no se cierra por esta vía.",

    bonusHoleTitle: "El aguinaldo entra aquí, aunque no se haya retenido",
    bonusHoleText: "Lo que pasa del monto exento es renta gravada del año. Ningún texto dice con qué tabla se retiene sobre un aguinaldo —por eso /aguinaldo/ no calcula esa retención—, así que si tu patrono no retuvo nada sobre el excedente, ese impuesto no desapareció: aparece acá, en el saldo del año.",
    employersNote: "Con más de un patrono, cada uno retuvo como si su salario fuera el único que tuviste, y los tramos son progresivos. Sumá los ingresos y las retenciones de todas las constancias antes de leer este saldo; y revisá si el último patrono hizo el recálculo de diciembre sobre los dos.",
    predatesNote: "Esta calculadora usa la tabla del artículo 37 vigente desde el 8 de mayo de 2025. Para ejercicios anteriores regía otra tabla que no está en el registro, así que ese año no se puede estimar aquí.",

    filingTitle: "¿Tenés que declarar?", filingHint: "Artículo 38 de la Ley de Impuesto sobre la Renta",
    filingYes: "Sí, según el artículo 38", filingNo: "No estás obligado, pero podés declarar",
    filingNoText: "El asalariado con rentas solo de salarios y con retención no está obligado a declarar. Con estas cifras no se activa ninguna de las tres excepciones del artículo 38.",
    reasonThreshold: "Tu renta obtenida pasa de $60,000 en el año.",
    reasonNothing: "No se te retuvo nada y el año liquida impuesto.",
    reasonMismatch: "Lo retenido no coincide con el impuesto de la tabla del artículo 37.",
    noTolerance: "El artículo 38 no fija un monto mínimo de diferencia: cualquier diferencia es falta de correspondencia. Por eso esta página muestra el saldo aunque sea de centavos, en vez de aplicar un umbral propio.",
    rightToFile: "Quien pasa de $9,100 y no goza de la deducción fija puede declarar para efecto de devolución, aunque no esté obligado.",
    deadline: "Fecha límite para declarar", deadlineHint: "Cuatro meses después del cierre del ejercicio (arts. 13 y 48)",
    refundNote: "El derecho a solicitar la devolución existe. El plazo y la forma del trámite los fija el Código Tributario, que esta página no cita todavía, así que no los afirmamos acá.",

    whyTitle: "Por qué a mucha gente le toca devolución sin haber hecho nada mal",
    whyLead: "La retención mensual es una estimación hecha con la información de un mes. La declaración es la cuenta del año completo, y hay razones estructurales para que no coincidan.",
    why: [
      ["Trabajaste parte del año", "Cinco meses de salario pueden quedar bajo el tramo exento del año, aunque cada uno de esos meses haya retenido como si fueras a trabajar los doce.", "◷"],
      ["El excedente de diciembre no se devuelve por planilla", "Cuando el recálculo de diciembre da negativo, el literal i) no lo devuelve: te manda a la declaración anual. Ese dinero solo se recupera acá.", "−"],
      ["Tuviste más de un patrono", "Cada uno retuvo como si su salario fuera el único. Sumados, los tramos progresivos dan otro número.", "⇄"],
      ["Un mes atípico", "Un bono o unas horas extras empujan la retención de ese mes a un tramo que el año completo no sostiene.", "↑"],
    ],
    whyDueTitle: "Y por qué a otros les sale en contra",
    whyDueText: "Las tablas de retención de los tramos III y IV ya traen incorporados $1,600 de deducciones. El artículo 37 no los regala: se los da a quien gana hasta $9,100 —como deducción fija— o a quien pasa de ahí y tiene comprobantes de médico o colegiatura. Quien pasa de $9,100 y no gastó en eso fue retenido de menos todo el año, y la diferencia aparece en abril. No es un error de nadie: es cómo están construidas las tablas.",

    sources: "Fuentes y reglas aplicadas",
    related: "Seguí con", relatedWithholding: "Retenciones de tu salario",
    relatedWithholdingText: "El descuento mes a mes, las tablas oficiales y el recálculo de junio y diciembre que alimenta esta cuenta.",
    relatedAguinaldo: "Aguinaldo", relatedAguinaldoText: "Los días que te tocan, la porción exenta de renta y la base gravada que entra a este cálculo.",

    exportPdf: "Descargar PDF", exportHint: "Llevate la estimación",
    pdfTitle: "Estimación de renta anual", pdfSubtitle: "Asalariado · Ley de Impuesto sobre la Renta",
    pdfInput: "Dato usado", pdfValue: "Valor", pdfConcept: "Concepto", pdfAmount: "Monto",
    pdfYes: "Sí", pdfNo: "No", pdfSlug: "renta-anual",
    pdfNotAdvice: "Estimación educativa calculada en el navegador de quien la generó. No sustituye la declaración oficial ante la DGII ni la revisión de un contador.",

    guideEyebrow: "LOANPILOT RENTA 101",
    guideTitle: "Cómo se arma la cuenta del año",
    guideLead: "Cuatro piezas, en este orden. Cambiar cualquiera cambia el saldo.",
    guide: [
      ["Renta obtenida", "Todo lo gravado que recibiste en el año, incluido el excedente del aguinaldo. No entra la Quincena 25, que la ley declara renta no gravable.", "$"],
      ["Menos cotizaciones", "AFP e ISSS salen de la base antes de la tabla, pero no de la misma forma: la cotización obligatoria de AFP es renta no gravable y queda fuera de la renta obtenida, mientras que el ISSS solo baja la renta imponible.", "−"],
      ["Menos deducciones", "O los $1,600 fijos si tu renta obtenida no pasa de $9,100, o hasta $800 de médico y $800 de colegiatura si la pasa. Nunca las dos.", "§"],
      ["Tabla del artículo 37", "Sobre lo que queda. El primer tramo, hasta $6,600 al año, es exento desde el D.L. 293 de 2025.", "%"],
    ],

    helpIncome: "Lo gravado que recibiste en el año: sueldo, comisiones, horas extras, bonos. Si tenés la constancia de retención de tu patrono, es la casilla de ingresos gravados.",
    helpWithheld: "El total de renta que te retuvieron en el año, según tus boletas o la constancia. No incluye AFP ni ISSS.",
    helpAfp: "Lo que te descontaron de AFP en el año, sumando los doce meses. Solo la cotización obligatoria: los aportes voluntarios no son renta no gravable y esta página no los modela, así que sumarlos acá dejaría fuera de la renta obtenida más de lo que corresponde.",
    helpIsss: "Lo que te descontaron de ISSS en el año. El descuento se calcula hasta un salario máximo cotizable de $1,000 al mes.",
    helpSalary: "Tu salario mensual ordinario bruto, antes de descuentos.",
    helpMonths: "Cuántos meses del año trabajaste. Si entraste o saliste a mitad de año, esta es la casilla que más mueve el resultado.",
    helpBonus: "El aguinaldo bruto que recibiste. La parte exenta se calcula acá y solo el excedente entra a la renta del año.",
    helpMedical: "Lo pagado en el país por servicios médicos, hospitalarios y medicinas con receta, tuyos o de tu cónyuge, padres e hijos menores de 25 que no sean contribuyentes.",
    helpEducation: "Lo pagado por colegiatura o escolaridad de tus hijos hasta 25 años, o de tus propios estudios, en centros autorizados.",
    helpEmployers: "Marcalo si trabajaste para más de un patrono en el año. Cambia lo que dice el artículo 38 sobre tu obligación de declarar.",
  },
  en: {
    heroTitle: "Your year's tax, against what was already withheld.",
    heroLead: "The tax the exercise leaves you owing, next to what payroll deducted month by month. The balance can land in your favour or against you: both are normal.",
    noticeTitle: "This is an educational estimate",
    noticeText: "It does not replace your official return to the DGII or a review by an accountant. It works from the figures you type and the article 37 table; your real return can differ because of income this page does not model, definitive withholding, or deductions you can prove and that are not here. Do not make a payment decision on it alone.",

    data: "Your year", dataHint: "Employee whose income is only salary",
    exercise: "Tax year", exerciseHint: "The exercise you are filing for",
    openExercise: "This exercise has not closed yet: it runs to 31 December, so this is a projection of how the year is going rather than the final account.",
    source: "Where the figures come from", sourceDirect: "I have them", sourceSalary: "Estimate from salary",
    income: "Taxable income for the year", withheld: "Income tax withheld in the year",
    afp: "Compulsory pension contributions in the year", isss: "ISSS contributions in the year",
    salary: "Monthly salary", months: "Months worked in the year",
    estimated: "Estimated from salary", estimatedNote: "Identical months, no bonuses and no salary changes, and without the June and December recalculation — which can move a few cents. If your year was not flat, take the figures off your payslips and switch to \"I have them\".",
    bonus: "Year-end bonus received", bonusHint: "Optional. Only the part above the exempt amount joins the year's income.",
    employers: "I had more than one employer during the year",

    deductions: "Article 33 receipts", deductionsHint: "Only for those above $9,100 of renta obtenida",
    medical: "Medical expenses", education: "Schooling or tuition",
    deductionsLocked: "At $9,100 or less of renta obtenida you get the flat $1,600 deduction, which needs no proof. The article 33 receipts are the other branch and do not add to it.",
    deductionsNote: "Up to $800 for each concept. They are not attached to the return, but must be kept for six years.",
    donationsGapTitle: "Article 32 is not here",
    donationsGapText: "Article 29 numeral 7 sends anybody above $9,100 to articles 32 and 33, and this page models only 33. If you made deductible donations, the balance you see is larger than the one you will file. We do not print article 32's ceiling because nobody has read it back against the consolidated text for this project, and a figure from memory is exactly what this site does not do.",

    result: "Estimated balance",
    balanceFavour: "Estimated balance in your favour", balanceDue: "Estimated balance against you", balanceZero: "Estimated balance at zero",
    balanceFavourNote: "This is an estimate of the balance, not a confirmed amount and not a promise of a refund: the official return is what settles it.",
    balanceDueNote: "This is an estimate of the balance, not a settlement. Check it before paying.",
    balanceZeroNote: "On these figures, what was withheld matches the year's tax.",

    grossPay: "Taxable pay", grossIncome: "Renta obtenida",
    afpExcluded: "Pension", afpExcludedNote: "compulsory contribution: renta no gravable",
    thresholdFigure: "the $9,100 and $60,000 tests read this",
    thresholdNote: "The threshold is measured on the renta obtenida (taxable pay less the compulsory pension contribution), not on gross pay. The ISSS is not excluded at this point: it reduces the renta imponible, but not the renta obtenida.",
    isssDeducted: "ISSS", isssDeductedNote: "deduction",
    contributions: "Contributions (pension and ISSS)",
    deductionsApplied: "Deductions applied", taxable: "Taxable income",
    tax: "Tax for the year", withheldLabel: "Already withheld", band: "Band",
    fixedApplied: "Flat deduction, article 29 numeral 7", itemisedApplied: "Article 33 receipts",

    receiptsTitle: "What would close this balance",
    receiptsLead: "With", receiptsMid: "in medical or schooling receipts, the balance would reach zero.",
    receiptsPartialLead: "The full $1,600 of receipts brings the balance down to",
    receiptsPartialTail: "The rest does not close this way.",
    receiptsRoom: "You have room left for",
    receiptsNone: "There are no receipts to add here: at $9,100 or less of renta obtenida the flat $1,600 is already applied, and the balance has another cause.",
    receiptsMaxed: "The article 33 maximum is already applied: $800 of medical expenses and $800 of schooling. What is left of the balance does not close this way.",

    bonusHoleTitle: "The bonus lands here, even if nothing was withheld on it",
    bonusHoleText: "Whatever exceeds the exempt amount is taxable income for the year. No text says which table withholds on a bonus — which is why /aguinaldo/ does not work that withholding out — so if your employer withheld nothing on the excess, that tax did not disappear: it shows up here, in the year's balance.",
    employersNote: "With more than one employer, each withheld as if its salary were the only one you had, and the bands are progressive. Add up the income and the withholding from every constancia before reading this balance, and check whether the last employer ran the December recalculation over both.",
    predatesNote: "This calculator uses the article 37 table in force since 8 May 2025. Earlier exercises were governed by a different table that is not in the registry, so that year cannot be estimated here.",

    filingTitle: "Do you have to file?", filingHint: "Article 38 of the Income Tax Law",
    filingYes: "Yes, under article 38", filingNo: "Not required, but you may file",
    filingNoText: "An employee whose income is only salary and who was withheld from is not required to file. On these figures none of article 38's three exceptions is triggered.",
    reasonThreshold: "Your renta obtenida is above $60,000 for the year.",
    reasonNothing: "Nothing was withheld and the year settles tax.",
    reasonMismatch: "What was withheld does not match the tax from the article 37 table.",
    noTolerance: "Article 38 sets no minimum difference: any difference is a failure of correspondence. That is why this page shows the balance even when it is cents, instead of applying a threshold of its own.",
    rightToFile: "Anyone above $9,100 who does not get the flat deduction may file for a refund, even without being required to.",
    deadline: "Filing deadline", deadlineHint: "Four months after the exercise closes (arts. 13 and 48)",
    refundNote: "The right to request a refund exists. Its deadline and procedure are set by the Código Tributario, which this page does not cite yet, so we do not state them here.",

    whyTitle: "Why so many people are owed a refund without doing anything wrong",
    whyLead: "Monthly withholding is an estimate made with one month's information. The return is the whole year's account, and there are structural reasons for the two to differ.",
    why: [
      ["You worked part of the year", "Five months of salary can land under the year's exempt band, even though each of those months withheld as if you were going to work all twelve.", "◷"],
      ["December's excess is not refunded by payroll", "When the December recalculation comes out negative, literal i) does not refund it: it sends you to the annual return. That money is only recovered here.", "−"],
      ["You had more than one employer", "Each withheld as if its salary were the only one. Added together, the progressive bands give another figure.", "⇄"],
      ["One unusual month", "A bonus or some overtime pushes that month's withholding into a band the whole year does not support.", "↑"],
    ],
    whyDueTitle: "And why others end up owing",
    whyDueText: "The withholding tables for bands III and IV already carry $1,600 of deductions inside them. Article 37 does not hand that over: it gives it to whoever earns up to $9,100 — as the flat deduction — or to whoever is above that and has medical or schooling receipts. Someone above $9,100 who spent nothing on those was under-withheld all year, and the difference shows up in April. It is nobody's mistake: it is how the tables are built.",

    sources: "Sources and rules applied",
    related: "Carry on with", relatedWithholding: "Deductions from your pay",
    relatedWithholdingText: "The month-by-month deduction, the official tables and the June and December recalculation that feeds this account.",
    relatedAguinaldo: "Year-end bonus", relatedAguinaldoText: "The days you are owed, the income-tax exempt portion and the taxable base that enters this calculation.",

    exportPdf: "Download PDF", exportHint: "Take the estimate with you",
    pdfTitle: "Annual income tax estimate", pdfSubtitle: "Employee · Income Tax Law of El Salvador",
    pdfInput: "Detail used", pdfValue: "Value", pdfConcept: "Concept", pdfAmount: "Amount",
    pdfYes: "Yes", pdfNo: "No", pdfSlug: "annual-tax-return",
    pdfNotAdvice: "An educational estimate, worked out in the browser of whoever generated it. It does not replace the official return to the DGII or a review by an accountant.",

    guideEyebrow: "LOANPILOT INCOME TAX 101",
    guideTitle: "How the year's account is built",
    guideLead: "Four pieces, in this order. Change any of them and the balance moves.",
    guide: [
      ["Renta obtenida", "Everything taxable you received in the year, including the excess of the bonus. The Quincena 25 stays out: the law declares it non-taxable.", "$"],
      ["Less contributions", "Pension and ISSS both leave the base before the table, but not in the same way: the compulsory pension contribution is renta no gravable and falls outside the renta obtenida, while the ISSS only lowers the renta imponible.", "−"],
      ["Less deductions", "Either the flat $1,600 if your renta obtenida is at or under $9,100, or up to $800 of medical and $800 of schooling if it is above. Never both.", "§"],
      ["The article 37 table", "On what is left. Its first band, up to $6,600 a year, has been exempt since D.L. 293 of 2025.", "%"],
    ],

    helpIncome: "The taxable income you received in the year: salary, commissions, overtime, bonuses. If you have your employer's constancia de retención, it is the taxable income box.",
    helpWithheld: "The total income tax withheld from you over the year, per your payslips or the constancia. It does not include pension or ISSS.",
    helpAfp: "What was deducted for your pension fund over the year, across all twelve months. The compulsory contribution only: voluntary contributions are not renta no gravable and this page does not model them, so adding them here would take more out of the renta obtenida than belongs there.",
    helpIsss: "What was deducted for ISSS over the year. The deduction is worked out up to a maximum contributory salary of $1,000 a month.",
    helpSalary: "Your gross ordinary monthly salary, before deductions.",
    helpMonths: "How many months of the year you worked. If you started or left mid-year, this is the box that moves the result most.",
    helpBonus: "The gross year-end bonus you received. The exempt part is worked out here and only the excess joins the year's income.",
    helpMedical: "What you paid in the country for medical and hospital services and prescribed medicines, for yourself or your spouse, parents and children under 25 who are not taxpayers.",
    helpEducation: "What you paid for schooling of your children up to 25, or for your own studies, at authorised institutions.",
    helpEmployers: "Tick it if you worked for more than one employer during the year. It changes what article 38 says about your duty to file.",
  },
} as const;

const number = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

/**
 * What a shared link for this page may carry: the reader's own answers and
 * nothing computed from them. The balance, the tax and the receipts figure are
 * all absent on purpose — see the header of `share.ts`.
 */
const SHARE_SCHEMA: ShareSchema = {
  ej: { kind: "option", values: EXERCISES.map(String) },
  fu: { kind: "option", values: ["direct", "salary"] },
  in: { kind: "money" },
  re: { kind: "money" },
  afp: { kind: "money" },
  isss: { kind: "money" },
  sal: { kind: "money" },
  ms: { kind: "int", max: 12 },
  ag: { kind: "money" },
  // Bounded at the article 33 ceiling the field itself carries. The engine
  // caps them anyway; a link that arrives with $99,999 of medicine in it is
  // still not something to put in the reader's box and call theirs.
  med: { kind: "money", max: 800 },
  edu: { kind: "money", max: 800 },
  pat: { kind: "flag" },
};

export default function AnnualTaxPage({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const money = useMemo(() => new Intl.NumberFormat(lang === "es" ? "es-SV" : "en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
  }), [lang]);
  const longDate = useMemo(() => new Intl.DateTimeFormat(lang === "es" ? "es-SV" : "en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }), [lang]);
  const date = (iso: string) => longDate.format(new Date(`${iso}T00:00:00Z`));

  // Read once, before the fields are built, so a shared link fills them in on
  // the first render instead of overwriting what the reader has already typed.
  // `useState` with a function runs on the client only, which is where a
  // fragment exists at all.
  const [shared] = useState(() => readShare(SHARE_SCHEMA));
  const fromLink = Object.keys(shared).length > 0;

  const [exercise, setExercise] = useState(shared.ej ?? String(DEFAULT_EXERCISE));
  const [source, setSource] = useState<Source>((shared.fu as Source) ?? "salary");
  const [income, setIncome] = useState(shared.in ?? "12000");
  const [withheld, setWithheld] = useState(shared.re ?? "725.40");
  const [afp, setAfp] = useState(shared.afp ?? "870");
  const [isss, setIsss] = useState(shared.isss ?? "360");
  const [salary, setSalary] = useState(shared.sal ?? "1000");
  const [months, setMonths] = useState(shared.ms ?? "12");
  const [bonus, setBonus] = useState(shared.ag ?? "");
  const [medical, setMedical] = useState(shared.med ?? "");
  const [education, setEducation] = useState(shared.edu ?? "");
  const [employers, setEmployers] = useState(shared.pat === "1");

  const shareValues = {
    ej: exercise, fu: source, in: income, re: withheld, afp, isss,
    sal: salary, ms: months, ag: bonus, med: medical, edu: education,
    pat: employers ? "1" : "0",
  };

  /** The four figures, whichever way the reader chose to give them. */
  const figures = useMemo(() => {
    if (source === "direct") {
      return {
        taxableIncome: number(income), withheld: number(withheld),
        afpPaid: number(afp), isssPaid: number(isss), months: 12, estimated: false,
      };
    }
    const worked = Math.max(0, Math.min(12, number(months)));
    const monthly = calculatePayrollWithholding({
      gross: number(salary), frequency: "monthly", annualGross: number(salary) * worked,
    });
    return {
      ...estimateAnnualFromSalary({
        monthlySalary: number(salary), months: worked, monthlyWithholding: monthly.isr,
      }),
      estimated: true,
    };
  }, [afp, income, isss, months, salary, source, withheld]);

  const result = useMemo(() => calculateAnnualReturn({
    exercise: Number(exercise),
    taxableIncome: figures.taxableIncome,
    withheld: figures.withheld,
    afpPaid: figures.afpPaid,
    isssPaid: figures.isssPaid,
    bonus: number(bonus),
    medicalExpenses: number(medical),
    educationExpenses: number(education),
    multipleEmployers: employers,
  }), [bonus, education, employers, exercise, figures, medical]);

  const receipts = receiptsToClose(result);
  const citations = useMemo(
    () => citationsFor(result.appliedRules, `${result.exercise}-12-31`), [result]);

  const exportPdf = () => {
    const notes: string[] = [t.noticeText];
    if (result.balanceDue > 0 && receipts.possible) {
      notes.push(receipts.closesFully
        ? `${t.receiptsTitle}: ${t.receiptsLead} ${money.format(receipts.needed)} ${t.receiptsMid}`
        : `${t.receiptsPartialLead} ${money.format(receipts.remaining)}. ${t.receiptsPartialTail}`);
    }
    if (result.bonusTaxable > 0) notes.push(`${t.bonusHoleTitle}. ${t.bonusHoleText}`);
    if (result.multipleEmployers) notes.push(t.employersNote);
    if (figures.estimated) notes.push(t.estimatedNote);
    notes.push(t.noTolerance);

    return downloadPdf({
      slug: t.pdfSlug,
      title: t.pdfTitle,
      subtitle: `${t.pdfSubtitle} · ${t.exercise} ${result.exercise}`,
      tables: [
        {
          head: [t.pdfInput, t.pdfValue],
          body: [
            [t.exercise, String(result.exercise)],
            [t.income, money.format(figures.taxableIncome)],
            ...(result.bonusGross > 0 ? [[t.bonus, money.format(result.bonusGross)]] : []),
            [t.withheld, money.format(result.withheld)],
            [t.afp, money.format(figures.afpPaid)],
            [t.isss, money.format(figures.isssPaid)],
            [t.employers, result.multipleEmployers ? t.pdfYes : t.pdfNo],
          ],
        },
        {
          head: [t.pdfConcept, t.pdfAmount],
          body: [
            [t.grossPay, money.format(result.grossPay)],
            [`${t.afpExcluded} (${t.afpExcludedNote})`, money.format(result.afpPaid)],
            [t.grossIncome, money.format(result.rentaObtenida)],
            [`${t.isssDeducted} (${t.isssDeductedNote})`, money.format(result.isssPaid)],
            [t.deductionsApplied, money.format(result.deductions)],
            [t.taxable, money.format(result.taxable)],
            [t.tax, money.format(result.tax)],
            [t.withheldLabel, money.format(result.withheld)],
            [result.balanceDue > 0 ? t.balanceDue : result.balanceInFavour > 0 ? t.balanceFavour : t.balanceZero,
              money.format(result.balanceDue > 0 ? result.balanceDue : result.balanceInFavour)],
          ],
          totalRow: 8,
          numeric: [1],
        },
        {
          head: [t.filingTitle, t.pdfValue],
          body: [
            [t.filingTitle, result.filing.mustFile ? t.filingYes : t.filingNo],
            [t.deadline, date(result.deadline)],
          ],
        },
      ],
      notes,
      citations,
      reviewed: reviewedFor("annualTax"),
      disclaimer: t.pdfNotAdvice,
    }, lang);
  };

  const balanceLabel = result.balanceDue > 0 ? t.balanceDue
    : result.balanceInFavour > 0 ? t.balanceFavour : t.balanceZero;
  const balanceAmount = result.balanceDue > 0 ? result.balanceDue : result.balanceInFavour;
  const balanceNote = result.balanceDue > 0 ? t.balanceDueNote
    : result.balanceInFavour > 0 ? t.balanceFavourNote : t.balanceZeroNote;

  return <main className="legal-page">
    <SiteHeader lang={lang} page="annualTax" />
    <UtilityHero title={t.heroTitle} lead={t.heroLead} trust={reviewedLineFor(lang, "annualTax")} />

    {/* Above the calculator, not under it. A reader who takes this figure to a
        payment decision without filing is the failure this page has to guard
        against, and a notice at the foot is a notice nobody read. */}
    <section className="statutory-tools standalone-tools" id="tools">
      <div className="callout warn advice-notice">
        <span>!</span><p><b>{t.noticeTitle}.</b> {t.noticeText}</p>
      </div>

      {fromLink && <SharedNotice lang={lang} />}

      {!result.predatesRule && <div className="shell-toolbar export-toolbar">
        <div className="export-actions">
          <span>{t.exportHint}</span>
          <button type="button" onClick={exportPdf}><i>PDF</i>{t.exportPdf}</button>
        </div>
        <ShareButton lang={lang} schema={SHARE_SCHEMA} values={shareValues} labels={{
          ej: t.exercise, in: t.income, re: t.withheld, afp: t.afp, isss: t.isss,
          sal: t.salary, ms: t.months, ag: t.bonus, med: t.medical, edu: t.education,
        }} />
      </div>}

      <div className="calculator-grid">
        <div className="form-panel">
          <div className="section-title"><span>01</span><div><h2>{t.data}</h2><p>{t.dataHint}</p></div></div>
          <div className="field-grid">
            <SelectField label={t.exercise} lang={lang} value={exercise} onChange={setExercise}
              note={t.exerciseHint}
              options={EXERCISES.map((year) => ({ value: String(year), label: String(year) }))} />
            <SegmentedField full label={t.source} lang={lang} value={source} onChange={setSource}
              options={[{ value: "salary", label: t.sourceSalary }, { value: "direct", label: t.sourceDirect }] as const} />
            {source === "salary" ? <>
              <MoneyField label={t.salary} lang={lang} value={salary} onChange={setSalary} help={t.helpSalary} />
              <NumberField label={t.months} lang={lang} value={months} onChange={setMonths} min="0" max="12" help={t.helpMonths} />
              <div className="derived-note">
                <span>{t.estimated}</span>
                <b>{money.format(figures.taxableIncome)} · {t.withheld}: {money.format(figures.withheld)}</b>
                <small>{t.estimatedNote}</small>
              </div>
            </> : <>
              <MoneyField label={t.income} lang={lang} value={income} onChange={setIncome} help={t.helpIncome} />
              <MoneyField label={t.withheld} lang={lang} value={withheld} onChange={setWithheld} help={t.helpWithheld} />
              <MoneyField label={t.afp} lang={lang} value={afp} onChange={setAfp} help={t.helpAfp} />
              <MoneyField label={t.isss} lang={lang} value={isss} onChange={setIsss} help={t.helpIsss} />
            </>}
            <MoneyField label={t.bonus} lang={lang} value={bonus} onChange={setBonus}
              note={t.bonusHint} help={t.helpBonus} />
          </div>
          <CheckField label={t.employers} checked={employers} onChange={setEmployers} />

          <div className="section-title second"><span>02</span><div><h2>{t.deductions}</h2><p>{t.deductionsHint}</p></div></div>
          {result.qualifiesForFixedDeduction
            ? <div className="callout"><span>§</span><p>{t.deductionsLocked}</p></div>
            : <div className="field-grid">
              <MoneyField label={t.medical} lang={lang} value={medical} onChange={setMedical}
                max="800" help={t.helpMedical} />
              <MoneyField label={t.education} lang={lang} value={education} onChange={setEducation}
                max="800" note={t.deductionsNote} help={t.helpEducation} />
            </div>}
          {/* Only for the reader it can touch: below the limit the flat
              deduction is the whole story and article 32 is not their branch. */}
          {!result.qualifiesForFixedDeduction && <div className="callout warn"><span>?</span>
            <p><b>{t.donationsGapTitle}.</b> {t.donationsGapText}</p></div>}
        </div>

        <div className="results-panel">
          <div className="results-kicker">{t.result}</div>
          {result.predatesRule ? <div className="warning">! {t.predatesNote}</div> : <>
            <div className="result-headline">
              <span>{balanceLabel}</span>
              <strong>{money.format(balanceAmount)}</strong>
              <small>{balanceNote}</small>
            </div>

            {/* The balance and the way out of it, in one block. Splitting them
                would leave the reader with the number that frightens and not
                the number they can act on. */}
            {result.balanceDue > 0 && <div className="savings-hero receipts-block">
              <span>{t.receiptsTitle}</span>
              {/* The headline is always the receipts to apply. Printing the
                  leftover cents at that size answered a question nobody
                  asked, and read as if three cents were the whole story. */}
              {/* Two different reasons there is nothing to add, and they are
                  not interchangeable: below the limit the flat deduction is
                  already in, and above it the $1,600 of room can simply be
                  spent. Telling the second reader about the $9,100 limit told
                  them about somebody else's case. */}
              {!receipts.possible
                ? <p>{result.qualifiesForFixedDeduction ? t.receiptsNone : t.receiptsMaxed}</p>
                : <><strong>{money.format(receipts.needed)}</strong>
                  {receipts.closesFully
                    ? <p>{t.receiptsLead} <b>{money.format(receipts.needed)}</b> {t.receiptsMid} {t.receiptsRoom} {money.format(receipts.room)}.</p>
                    : <p>{t.receiptsPartialLead} <b>{money.format(receipts.remaining)}</b>. {t.receiptsPartialTail}</p>}</>}
            </div>}

            {/* The chain, with the two contributions on separate lines because
                they leave at different moments and only one of them changes
                which side of $9,100 the reader falls on. */}
            <div className="result-tiles">
              <div><span>{t.grossPay}</span><b>{money.format(result.grossPay)}</b></div>
              <div><span>{t.afpExcluded}</span><b>−{money.format(result.afpPaid)}</b>
                <i>{t.afpExcludedNote}</i></div>
              <div><span>{t.grossIncome}</span><b>{money.format(result.rentaObtenida)}</b>
                <i>{t.thresholdFigure}</i></div>
              <div><span>{t.isssDeducted}</span><b>−{money.format(result.isssPaid)}</b>
                <i>{t.isssDeductedNote}</i></div>
              <div><span>{t.deductionsApplied}</span><b>−{money.format(result.deductions)}</b>
                <i>{result.qualifiesForFixedDeduction ? t.fixedApplied : t.itemisedApplied}</i></div>
              <div className="highlight"><span>{t.taxable}</span><b>{money.format(result.taxable)}</b>
                <i>{t.band} {result.band}</i></div>
              <div><span>{t.tax}</span><b>{money.format(result.tax)}</b></div>
              <div><span>{t.withheldLabel}</span><b>{money.format(result.withheld)}</b></div>
            </div>

            {/* Directly under the chain, because it is about the step the
                chain shows and not about the balance: which of the two
                contributions leaves the renta obtenida and which does not. */}
            <div className="callout"><span>§</span><p>{t.thresholdNote}</p></div>

            {result.bonusTaxable > 0 && <div className="callout warn"><span>?</span>
              <p><b>{t.bonusHoleTitle}.</b> {t.bonusHoleText}</p></div>}
            {result.multipleEmployers && <div className="callout"><span>⇄</span><p>{t.employersNote}</p></div>}
            {result.exercise >= THIS_YEAR && <div className="callout"><span>◷</span><p>{t.openExercise}</p></div>}
          </>}
        </div>
      </div>

      {/* Article 38, answered from the figures above rather than from a quiz. */}
      {!result.predatesRule && <section className="recalc-band">
        <div className="section-title"><span>03</span><div><h2>{t.filingTitle}</h2><p>{t.filingHint}</p></div></div>
        <div className="recalc-outcome">
          <div className="recalc-result">
            <span>{t.filingTitle}</span>
            <strong>{result.filing.mustFile ? t.filingYes : t.filingNo}</strong>
          </div>
          <i aria-hidden="true">→</i>
          <div><span>{t.deadline}</span><b>{date(result.deadline)}</b><small>{t.deadlineHint}</small></div>
        </div>
        <div className="recalc-notes">
          {result.filing.mustFile ? <ul className="filing-reasons">
            {result.filing.overThreshold && <li>{t.reasonThreshold}</li>}
            {result.filing.nothingWithheld && <li>{t.reasonNothing}</li>}
            {result.filing.mismatch && <li>{t.reasonMismatch}</li>}
          </ul> : <div className="callout"><span>i</span><p>{t.filingNoText}</p></div>}
          <div className="callout"><span>§</span><p>{t.noTolerance}</p></div>
          {!result.qualifiesForFixedDeduction && <div className="callout"><span>+</span><p>{t.rightToFile}</p></div>}
          <div className="callout"><span>◷</span><p>{t.refundNote}</p></div>
        </div>
      </section>}

      {/* The explanation the page owes anybody whose balance is not zero. */}
      <section className="recalc-band">
        <div className="section-title"><span>04</span><div><h2>{t.whyTitle}</h2><p>{t.whyLead}</p></div></div>
        <div className="guide-grid why-grid">{t.why.map(([title, text, icon]) => <article key={title}>
          <i>{icon}</i><h3>{title}</h3><p>{text}</p>
        </article>)}</div>
        <div className="recalc-notes">
          <div className="callout warn"><span>!</span><p><b>{t.whyDueTitle}.</b> {t.whyDueText}</p></div>
        </div>
      </section>

      <div className="source-panel"><h2>{t.sources}</h2><div className="source-links">
        {citations.map((citation, index) => <a key={citation.norm} href={OFFICIAL[citation.source]} target="_blank" rel="noreferrer">
          <b>{String(index + 1).padStart(2, "0")}</b>{citation.norm}<span>↗</span>
        </a>)}
      </div></div>

      <div className="source-panel related-panel"><h2>{t.related}</h2><div className="source-links">
        <a href={ROUTES[lang].withholding}><b>→</b>{t.relatedWithholding}: {t.relatedWithholdingText}<span /></a>
        <a href={ROUTES[lang].aguinaldo}><b>→</b>{t.relatedAguinaldo}: {t.relatedAguinaldoText}<span /></a>
      </div></div>
    </section>

    <section className="guide legal-guide">
      <div className="guide-head"><p>{t.guideEyebrow}</p><h2>{t.guideTitle}</h2><span>{t.guideLead}</span></div>
      <div className="guide-grid">{t.guide.map(([title, text, icon], index) => <article key={title}>
        <span>0{index + 1}</span><i>{icon}</i><h3>{title}</h3><p>{text}</p>
      </article>)}</div>
    </section>
    <SiteFooter lang={lang} />
  </main>;
}
