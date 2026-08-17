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
      question: "Si renuncio, ¿me pagan la vacación del año que llevo corrido?",
      answer: "Aquí el texto y la práctica no dicen lo mismo. El artículo 187 del Código de Trabajo reconoce la vacación proporcional al tiempo trabajado cuando el contrato termina con responsabilidad patronal o hay despido de hecho sin causa legal, y enseguida agrega que, si ya se cumplió el año continuo de servicio, la vacación se paga aunque el contrato termine sin responsabilidad para el patrono. Leído al pie de la letra, quien renuncia se lleva la vacación de los períodos completos y no la fracción del año en curso. El servicio oficial de cálculo del MTPS sí paga esa fracción en renuncia: la constancia con la que contrastamos nuestros resultados es precisamente una renuncia voluntaria y trae la vacación proporcional en su propia línea. Nuestra calculadora sigue al ministerio y te la muestra, y te lo advierte en pantalla cuando tu caso cae en esa diferencia, para que sepas que el texto admite la otra lectura antes de reclamarla.",
    },
    {
      question: "¿Cuántos días de aguinaldo me tocan?",
      answer: "Para quien sigue laborando, según la antigüedad alcanzada al 20 de octubre: 15 días de salario de uno a menos de tres años, 19 días de tres a menos de diez, y 21 días a partir de los diez años. Con menos de un año se paga la parte proporcional al tiempo trabajado. Si el contrato terminó antes del 20 de octubre, la norma no define expresamente qué escala rige: esa persona nunca llegó a la fecha del corte. Nuestra calculadora usa la antigüedad del último día trabajado, que es la lectura que no presupone tiempo no trabajado, y cuando las dos fechas caen en escalones distintos te muestra también la otra cifra para que la consultes con el MTPS.",
    },
    {
      question: "¿Qué es la Quincena 25 y desde cuándo se paga?",
      answer: "Es un ingreso complementario equivalente al 50% del salario básico o nominal mensual, creado por la Ley Especial Quincena Veinticinco, Decreto Legislativo 499 del 14 de enero de 2026. Solo alcanza a quienes ganan $1,500 mensuales o menos, y se paga entre el 15 y el 25 de enero. El régimen general empieza en 2027; durante 2026 el sector público lo recibe de forma obligatoria y para el patrono privado es voluntario. La ley lo declara renta no gravable y prohíbe todo descuento sobre él —ni renta, ni ISSS, ni AFP—, lo hace inembargable y lo deja fuera de la base de cálculo de otras prestaciones, así que tampoco entra en tu finiquito ni en tu aguinaldo.",
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
      question: "If I resign, am I paid the vacation for the year in progress?",
      answer: "Here the text and the practice do not say the same thing. Article 187 of the Labour Code grants vacation in proportion to time worked when the contract ends with employer responsibility or the worker is dismissed without legal cause, and then adds that where the continuous year of service is already complete, vacation is paid even if the contract ends without employer responsibility. Read literally, someone who resigns takes the vacation of complete periods and not the fraction of the year in progress. The MTPS official calculation service does pay that fraction on a resignation: the statement we check our results against is a voluntary resignation, and it carries proportional vacation on its own line. Our calculator follows the ministry and shows it to you, and it flags your case on screen when it falls inside that difference, so you know the text admits the other reading before you claim it.",
    },
    {
      question: "How many days of year-end bonus apply?",
      answer: "For someone still employed, it depends on length of service at 20 October: 15 days of salary from one to under three years, 19 days from three to under ten, and 21 days from ten years onward. Under a year, the proportional share is paid. If the contract ended before 20 October, the rule does not expressly say which scale governs: that person never reached the cutoff date. Our calculator uses length of service at the last day worked, the reading that does not assume time that was not worked, and when the two dates fall on different steps it also shows you the other figure so you can check it with the MTPS.",
    },
    {
      question: "What is the Quincena 25 and when is it paid?",
      answer: "It is a complementary payment equal to 50% of the basic or nominal monthly salary, created by the Ley Especial Quincena Veinticinco, Legislative Decree 499 of 14 January 2026. It reaches only those earning $1,500 a month or less, and it is paid between 15 and 25 January. The general regime starts in 2027; through 2026 the public sector receives it as of right while for private employers it is voluntary. The law declares it non-taxable income and bars every deduction from it — income tax, ISSS and pension alike — makes it unattachable, and keeps it out of the base used to calculate other benefits, so it enters neither your settlement nor your year-end bonus.",
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
