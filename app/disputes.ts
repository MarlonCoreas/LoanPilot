// Extensions written out: the test suite imports this module through Node's
// type stripping, which resolves specifiers literally. See tsconfig.json.
import { RULE_USAGE, type RuleId } from "./rules.ts";
import type { Page } from "./routes.ts";

/**
 * The reader's half of every contested rule.
 *
 * `rules.ts` records WHAT is in dispute — the value, the article, the source and
 * the `status` that marks it — in one language, for whoever maintains the
 * registry. This file is the other side of the same fact, written for the person
 * whose money it moves, in both languages the site is published in.
 *
 * They are two files on purpose. The registry must stay the kind of document a
 * maintainer can read end to end against the decrees; a page of translated
 * prose inside it would bury the figures. And the split is enforced rather than
 * trusted: `disputedVersions()` drives /reglas-en-disputa/, and the test suite
 * fails when a rule marked DISPUTED or UNSOURCED has no entry here — so a rule
 * cannot be quietly contested in the code and settled on screen.
 *
 * WHAT AN ENTRY MAY NOT DO. It may not resolve anything. Every reading gets the
 * same voice, the applied one is marked as applied and not as correct, and
 * `why` explains a decision rather than defending a conclusion. Where a reading
 * rests on nothing — no text, no practice — the entry says nothing rather than
 * lending it an argument.
 */

export type Bilingual = { es: string; en: string };

/**
 * What stands behind a reading, which is the thing a reader most needs and is
 * least often told:
 *
 *   text      an article or decree says it, in words
 *   practice  the institution that administers the rule does it this way
 *   none      neither; somebody had to choose, and this project is somebody
 */
export type Backing = "text" | "practice" | "none";

export type Reading = {
  label: Bilingual;
  text: Bilingual;
  backing: Backing;
  /** Exactly one reading of each dispute carries this. */
  applied: boolean;
};

export type Dispute = {
  rule: RuleId;
  /** The disagreement as a question somebody would actually ask. */
  question: Bilingual;
  /** What turns on it, in money or in days. Not a disclaimer: a magnitude. */
  stakes: Bilingual;
  readings: [Reading, Reading];
  /** Why this project applies the one it applies. */
  why: Bilingual;
};

export const DISPUTES: Dispute[] = [
  {
    rule: "vacationProportionalOnExit",
    question: {
      es: "¿Le toca la vacación proporcional a quien renuncia?",
      en: "Is the part-year of vacation owed to someone who resigns?",
    },
    stakes: {
      es: "Los días corridos desde el último aniversario, pagados con el 30% de recargo. En una renuncia de dos meses pasado el aniversario son unos 90 dólares sobre un salario mínimo, y más de 300 sobre un salario de mil.",
      en: "The days run since the last anniversary, paid with the 30% surcharge. On a resignation two months past the anniversary that is around 90 dollars at the minimum wage, and over 300 on a salary of a thousand.",
    },
    readings: [
      {
        label: { es: "El texto del artículo 187", en: "The text of article 187" },
        text: {
          es: "El artículo concede la parte proporcional «cuando se declare terminado un contrato de trabajo con responsabilidad para el patrono, o cuando el trabajador fuere despedido de hecho sin causa legal», y en la frase siguiente nombra lo que conserva quien termina sin responsabilidad patronal: la vacación del año continuo ya cumplido. La fracción del año en curso no está en esa segunda frase. Leído así, quien renuncia no la lleva.",
          en: "The article grants the proportional part \"cuando se declare terminado un contrato de trabajo con responsabilidad para el patrono, o cuando el trabajador fuere despedido de hecho sin causa legal\", and the next sentence names what someone whose contract ends without employer responsibility does keep: the vacation of the continuous year already completed. The fraction of the year under way is not in that second sentence. Read this way, a worker who resigns does not take it.",
        },
        backing: "text",
        applied: false,
      },
      {
        label: { es: "Lo que hace el servicio del MTPS", en: "What the MTPS service does" },
        text: {
          es: "La constancia oficial contra la que se reconcilia este cálculo es una renuncia voluntaria —su base diaria de $26.88 son dos salarios mínimos diarios, el tope del artículo 8 de la ley de renuncia, y la prestación corre a 15 días por año— y aun así imprime $90.16 de vacación proporcional por los 54 días posteriores al último aniversario. El ministerio paga la fracción en la renuncia.",
          en: "The official statement this calculation reconciles against is a voluntary resignation — its $26.88 daily base is two daily minimum wages, the cap in article 8 of the resignation law, and the benefit runs at 15 days a year — and it still prints $90.16 of proportional vacation for the 54 days past the last anniversary. The ministry pays the fraction on a resignation.",
        },
        backing: "practice",
        applied: true,
      },
    ],
    why: {
      es: "Aquí hay evidencia que seguir, y se sigue. La constancia del MTPS es un documento con cifras, y este cálculo la reproduce al centavo: aplicar el texto literal borraría esa línea de $90.16 y el sitio dejaría de coincidir con el servicio oficial en toda renuncia. Cuando el texto y la práctica del ministerio no dicen lo mismo, esta calculadora aplica la práctica y nombra el texto.",
      en: "There is evidence to follow here, and it is followed. The MTPS statement is a document with figures on it, and this calculation reproduces it to the cent: applying the literal text would erase that $90.16 line and the site would stop agreeing with the official service on every resignation. Where a text and the ministry's practice differ, this calculator applies the practice and names the text.",
    },
  },
  {
    rule: "aguinaldoScaleOnExit",
    question: {
      es: "¿Qué escalón del artículo 198 le toca a quien sale antes del 20 de octubre?",
      en: "Which step of article 198 applies to someone who leaves before 20 October?",
    },
    stakes: {
      es: "Cuatro o dos días de salario, según el escalón que se cruce: la escala salta de 15 a 19 días a los tres años y de 19 a 21 a los diez. Solo cambia algo para quien termina el contrato en el tramo del año en que cumpliría uno de esos aniversarios.",
      en: "Four or two days of salary, depending on the step crossed: the scale jumps from 15 to 19 days at three years and from 19 to 21 at ten. It changes nothing except for someone whose contract ends in the stretch of the year where one of those anniversaries would fall.",
    },
    readings: [
      {
        label: { es: "La antigüedad del último día trabajado", en: "Length of service at the last day worked" },
        text: {
          es: "El escalón que la persona había cumplido de verdad al terminar el contrato. Es la lectura que nunca paga un escalón de antigüedad que nadie alcanzó, y por eso es la que no puede sobrestimar la cifra.",
          en: "The step the worker had actually completed when the contract ended. It is the reading that never pays for a seniority step nobody reached, which is why it cannot over-state the figure.",
        },
        backing: "none",
        applied: true,
      },
      {
        label: { es: "La antigüedad al 20 de octubre", en: "Length of service at 20 October" },
        text: {
          es: "El escalón que la persona habría tenido en la fecha en que el artículo 197 mide la antigüedad. Como el corte siempre es posterior a la salida en estos casos, esta lectura nunca da menos: es siempre la cifra mayor de las dos.",
          en: "The step the worker would have held on the date article 197 measures service at. Because the qualifying date always falls after the departure in these cases, this reading is never lower: it is always the larger of the two figures.",
        },
        backing: "none",
        applied: false,
      },
    ],
    why: {
      es: "Ningún artículo del capítulo VII dice a qué día se lee la escala para un contrato que terminó antes del corte: el 197 mide la antigüedad en la fecha del corte y el 202 concede al que sale la parte «proporcional al tiempo trabajado» sin decir de qué escala es proporción. Sin texto que seguir, se aplica la lectura que no presupone tiempo no trabajado, y cuando las dos difieren la calculadora muestra las dos cifras en pantalla y en el PDF, sin afirmar cuál rige.",
      en: "No article of chapter VII says which day the scale is read at for a contract that ended before the qualifying date: article 197 measures service at that date, and article 202 grants the leaver the part \"proporcional al tiempo trabajado\" without saying which scale the proportion is of. With no text to follow, the reading that does not assume time nobody worked is the one applied, and where the two differ the calculator shows both figures on screen and in the PDF, claiming neither.",
    },
  },
  {
    rule: "aguinaldoCycleStart",
    question: {
      es: "¿Sobre qué período se cuenta la parte proporcional del aguinaldo?",
      en: "What period does the proportional share of the year-end bonus run over?",
    },
    stakes: {
      es: "La proporción entera. Para quien termina a mitad de año, el ciclo que empieza el 1 de enero y el que cierra el 12 de diciembre cuentan cantidades distintas de días, y la cifra se mueve con ellos.",
      en: "The whole proportion. For someone leaving mid-year, a cycle starting on 1 January and one closing on 12 December count different numbers of days, and the figure moves with them.",
    },
    readings: [
      {
        label: { es: "El año calendario", en: "The calendar year" },
        text: {
          es: "El ciclo corre del 1 de enero. Es lo que sostiene el MTPS al explicar el pago anticipado: el aguinaldo adelantado se calcula COMO SI se pagara en diciembre, de modo que adelantar el pago no acorta el período que cubre.",
          en: "The cycle runs from 1 January. It is what the MTPS supports when it explains early payment: an anticipated bonus is worked out AS IF it were being paid in December, so moving the payment forward does not shorten the period it covers.",
        },
        backing: "practice",
        applied: true,
      },
      {
        label: { es: "El ciclo que cierra el 12 de diciembre", en: "The cycle closing on 12 December" },
        text: {
          es: "El ciclo corre del 12 de diciembre al 12 de diciembre, la fecha en que se medía el aguinaldo antes de la reforma de 2025. Es la única lectura con la que cuadra la constancia del MTPS que usan las pruebas de este proyecto, y la práctica contable del país todavía mezcla esa fecha con el 20 de octubre.",
          en: "The cycle runs from 12 December to 12 December, the date the bonus was measured at before the 2025 reform. It is the only reading under which the MTPS statement used by this project's tests reconciles, and accounting practice in the country still mixes that date with the reformed 20 October.",
        },
        backing: "practice",
        applied: false,
      },
    ],
    why: {
      es: "Ningún artículo del capítulo VII define el período de devengo, así que las dos lecturas se apoyan en prácticas y ninguna en un texto. Se aplica el año calendario porque es lo que sostiene el ministerio que administra la regla, y no se cambia por una nota: mover el ciclo movería en silencio todos los aguinaldos proporcionales que este proyecto tiene fijados en pruebas. Lo que sí cambió es que el ciclo es un parámetro y ambas lecturas son expresables en el código —incluida la que abre en el año anterior—, porque una regla cuya alternativa el programa no puede producir no está de verdad en disputa.",
      en: "No article of chapter VII defines the accrual period, so both readings rest on practice and neither on a text. The calendar year is applied because it is what the ministry that administers the rule supports, and it does not move on the strength of a note: switching cycles would silently change every proportional bonus this project pins in its tests. What did change is that the cycle is a parameter and both readings are expressible in the code — including the one that opens in the previous year — because a rule whose alternative the program cannot produce is not really in dispute.",
    },
  },
  {
    rule: "quincena25Window",
    question: {
      es: "¿A quién le toca la Quincena 25 al terminar el contrato?",
      en: "Who is owed the Quincena 25 when their contract ends?",
    },
    stakes: {
      es: "Hasta medio salario mensual. Para quien gana el tope de $1,500, la diferencia entre las dos lecturas llega a $750 en una cifra que la gente lleva a una negociación.",
      en: "Up to half a monthly salary. For someone at the $1,500 ceiling, the gap between the two readings reaches $750 in a figure people take into a negotiation.",
    },
    readings: [
      {
        label: { es: "Restrictiva: la ventana de enero", en: "Restrictive: the January window" },
        text: {
          es: "El artículo 3 concede el beneficio a quien termina su contrato «antes del veinticinco de enero o en esa misma fecha», que es el día en que el artículo 1 hace exigible el pago. Es una protección contra el despido de vísperas: fuera de esa ventana no se debe nada. Tiene la misma forma que el artículo 202, que ancla el aguinaldo a su propia fecha de corte en vez de concederlo todo el año.",
          en: "Article 3 grants the benefit to someone whose contract ends \"antes del veinticinco de enero o en esa misma fecha\", which is the day article 1 makes the payment fall due. It is a protection against being let go days before payday: outside that window nothing is owed. It has the same shape as article 202, which anchors the year-end bonus to its own qualifying date rather than granting it all year round.",
        },
        backing: "text",
        applied: true,
      },
      {
        label: { es: "Amplia: la remisión al aguinaldo", en: "Broad: the reference to the bonus rules" },
        text: {
          es: "La frase que sigue remite a «las disposiciones establecidas para el goce de la prima anual en concepto de aguinaldo […] o la parte proporcional, según corresponda», y eso se lee como el artículo 202: una parte proporcional en cualquier despido del ciclo, no solo en los de enero.",
          en: "The sentence that follows refers the reader to \"las disposiciones establecidas para el goce de la prima anual en concepto de aguinaldo […] o la parte proporcional, según corresponda\", and that reads like article 202: a proportional share on any dismissal in the cycle, not only on January ones.",
        },
        backing: "text",
        applied: false,
      },
    ],
    why: {
      es: "Aquí no hay práctica que seguir: la ley es de enero de 2026 y su primer ciclo fue voluntario para el patrono privado, así que nadie ha formado criterio todavía. Lo que inclina la decisión es que pagar una proporción fuera de la ventana exige un período de devengo y el decreto no fija ninguno —el artículo 2 ata el monto al salario «al momento en que la prestación se materialice», no a un período—, y que el error corre en una sola dirección: sobrestimar esta línea son cientos de dólares en una cifra que alguien lleva a negociar. Es la decisión contraria a la del artículo 187, y la diferencia es que allá hay una constancia oficial y aquí no hay nada. Aparte de eso, el DÍA EN QUE ABRE LA VENTANA no está en ningún texto: aquí se acota al 1 de enero del mismo mes, y cualquier otro límite inferior sería igual de inventado. Del artículo 3 solo viene el 25.",
      en: "There is no practice to follow here: the law is from January 2026 and its first cycle was voluntary for private employers, so nobody has formed a criterion yet. What settles it is that paying a proportion outside the window requires an accrual period and the decree fixes none — article 2 keys the amount to the salary \"al momento en que la prestación se materialice\", not to a period — and that the error runs one way: over-stating this line is hundreds of dollars in a figure somebody carries into a negotiation. It is the opposite decision to article 187's, and the difference is that there an official statement exists and here there is nothing. Separately, THE DAY THE WINDOW OPENS is in no text: it is bounded here at the 1st of that same January, and any other lower bound would be just as invented. Only the 25th comes from article 3.",
    },
  },
];

const BY_RULE = new Map(DISPUTES.map((dispute) => [dispute.rule, dispute]));

export function disputeFor(rule: RuleId) {
  return BY_RULE.get(rule);
}

/**
 * The calculators a contested rule is actually applied by, read out of
 * `RULE_USAGE` rather than repeated here. A reader who arrives from a callout
 * needs to know where else the same decision is moving a number on them, and a
 * hand-kept list of pages would be wrong the first time a rule is reused.
 */
export function pagesApplying(rule: RuleId): Page[] {
  return (Object.entries(RULE_USAGE) as [Page, RuleId[]][])
    .filter(([page, ids]) => page !== "home" && page !== "disputed" && ids.includes(rule))
    .map(([page]) => page);
}

/**
 * The contested rules a calculator applies, for the panel it carries at the
 * foot of its results.
 *
 * The deep-linked callouts only appear for the cases they touch — a dismissal
 * never meets the article 187 divergence — so on their own they leave the
 * existence of these disagreements dependent on the reader having typed the
 * right dates. This is the unconditional half: the page states which of its
 * figures rest on an unsettled reading before anybody asks.
 */
export function disputesForPage(page: Page): Dispute[] {
  return DISPUTES.filter((dispute) => RULE_USAGE[page].includes(dispute.rule));
}
