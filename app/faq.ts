import type { Lang } from "./routes";

/**
 * The home page's questions, and the only copy of them.
 *
 * The section a reader sees and the FAQPage structured data a search engine
 * reads are generated from this list, because a rich result that answers
 * something the page does not actually say is the kind of mismatch Google
 * penalises — and the kind that is invisible until it is.
 *
 * Every figure quoted here comes from `statutory.ts` or `overtime.ts`, each of
 * which records the day it was last read back against the official texts. Do
 * not restate a number in this file that the calculators do not already apply.
 */
export type FaqEntry = { question: string; answer: string };

export const FAQ: Record<Lang, FaqEntry[]> = {
  es: [
    {
      question: "¿Cómo se calcula la indemnización por despido injustificado?",
      answer: "El artículo 58 del Código de Trabajo reconoce 30 días de salario por cada año de servicio, y la parte proporcional por las fracciones de año, con un mínimo de 15 días. El salario diario que sirve de base tiene un tope de cuatro veces el salario mínimo diario del sector del empleador.",
    },
    {
      question: "¿Cuánto corresponde por renuncia voluntaria?",
      answer: "La Ley Reguladora de la Prestación Económica por Renuncia Voluntaria reconoce 15 días de salario por año trabajado y exige al menos dos años continuos con el mismo patrono. En este caso el tope del salario base es de dos salarios mínimos diarios, no de cuatro.",
    },
    {
      question: "¿Cuántos días de aguinaldo me tocan?",
      answer: "Según la antigüedad alcanzada al 20 de octubre: 15 días de salario de uno a menos de tres años, 19 días de tres a menos de diez, y 21 días a partir de los diez años. Con menos de un año se paga la parte proporcional al tiempo trabajado.",
    },
    {
      question: "¿Qué es la Quincena 25 y desde cuándo se paga?",
      answer: "Es un pago equivalente a medio salario mensual creado por el Decreto Legislativo 499, dirigido a salarios de hasta $1,500. El régimen general empieza en 2027; durante 2026 es voluntario para el empleador privado. La ley lo declara renta no gravable, así que no paga retención.",
    },
    {
      question: "¿Cuánto me descuentan de AFP e ISSS cada mes?",
      answer: "El aporte del trabajador a la AFP es 7.25% del salario cotizable, sin techo. El del ISSS es 3%, aplicado sobre un salario máximo de $1,000 mensuales: la parte del salario que supera ese monto no aumenta el descuento.",
    },
    {
      question: "¿Desde qué salario se retiene el impuesto sobre la renta?",
      answer: "Con la tabla mensual vigente, la retención comienza cuando la remuneración gravada del mes pasa de $550.00. Esa base se obtiene después de restar AFP e ISSS, y quien obtiene hasta $9,100 al año descuenta además la deducción fija de $1,600 prorrateada en el período.",
    },
    {
      question: "¿Por qué el costo efectivo de un préstamo es mayor que la tasa de interés?",
      answer: "La tasa nominal solo cubre el interés. El costo efectivo incorpora además seguros, comisiones y la forma en que se amortiza la deuda, y por eso es la cifra que permite comparar de verdad dos ofertas de instituciones distintas.",
    },
    {
      question: "¿Guardan los datos que escribo en las calculadoras?",
      answer: "No. Los cálculos se ejecutan dentro de tu navegador: ninguna cifra que escribas viaja a un servidor. El sitio no pide cuentas, no usa rastreo y funciona igual con la pestaña sin conexión una vez cargada.",
    },
    {
      question: "¿Cómo se pagan las horas extras en El Salvador?",
      answer: "La hora extraordinaria diurna lleva un recargo del 100%, así que vale el doble de la hora básica. Si además es nocturna, sobre esa hora ya recargada se aplica un 25% adicional, con lo que llega a dos veces y media la hora ordinaria.",
    },
    {
      question: "¿Cuánto me toca si trabajo un domingo o un día de asueto?",
      answer: "Trabajar el día de descanso semanal da derecho al salario básico de ese día, un recargo mínimo del 50% por las horas trabajadas y un día de descanso compensatorio remunerado. El día de asueto trabajado se paga doble: salario ordinario más un recargo del 100%.",
    },
  ],
  en: [
    {
      question: "How is severance for unjustified dismissal calculated?",
      answer: "Article 58 of the Labour Code grants 30 days of salary for each year of service, plus the proportional share for part years, with a floor of 15 days. The daily salary used as the base is capped at four times the sector's daily minimum wage.",
    },
    {
      question: "What is owed on voluntary resignation?",
      answer: "The Voluntary Resignation Benefit Law grants 15 days of salary per year worked and requires at least two continuous years with the same employer. Here the base salary is capped at two daily minimum wages rather than four.",
    },
    {
      question: "How many days of year-end bonus apply?",
      answer: "It depends on length of service at 20 October: 15 days of salary from one to under three years, 19 days from three to under ten, and 21 days from ten years onward. Under a year, the proportional share is paid.",
    },
    {
      question: "What is the Quincena 25 and when is it paid?",
      answer: "It is a payment equal to half a monthly salary created by Legislative Decree 499, aimed at salaries up to $1,500. The general regime starts in 2027; through 2026 it is voluntary for private employers. The law declares it non-taxable, so no withholding applies.",
    },
    {
      question: "How much is deducted for pension and ISSS each month?",
      answer: "The employee pension contribution is 7.25% of contributory salary, with no ceiling. The ISSS contribution is 3%, applied to a maximum salary of $1,000 per month: pay above that ceiling does not increase the deduction.",
    },
    {
      question: "At what salary does income tax withholding start?",
      answer: "Under the monthly table in force, withholding starts once taxable remuneration for the month passes $550.00. That base is what remains after pension and ISSS, and anyone earning up to $9,100 a year also applies the $1,600 fixed deduction spread across the period.",
    },
    {
      question: "Why is a loan's effective cost higher than its interest rate?",
      answer: "The nominal rate only covers interest. Effective cost also takes in insurance, fees and the way the debt amortises, which is what makes it the figure that genuinely compares two offers from different institutions.",
    },
    {
      question: "Is the data I type into the calculators stored?",
      answer: "No. The calculations run inside your browser: no figure you type travels to a server. The site asks for no account, uses no tracking and keeps working with the tab offline once it has loaded.",
    },
    {
      question: "How is overtime paid in El Salvador?",
      answer: "A daytime overtime hour carries a 100% surcharge, so it is worth double the basic hour. If it also falls at night, a further 25% applies to that already doubled hour, bringing it to two and a half times the ordinary hour.",
    },
    {
      question: "What am I owed for working a Sunday or a public holiday?",
      answer: "Working the weekly rest day entitles you to that day's basic salary, a surcharge of at least 50% for the hours worked and a paid compensatory rest day. A public holiday worked is paid double: ordinary salary plus a 100% surcharge.",
    },
  ],
};
