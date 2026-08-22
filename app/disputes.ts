// Extensions written out: the test suite imports this module through Node's
// type stripping, which resolves specifiers literally. See tsconfig.json.
import { RULE_USAGE, type ContestedSection, type RuleId } from "./rules.ts";
import type { Page } from "./routes.ts";

/**
 * The reader's half of every unsettled rule, in the two kinds it comes in.
 *
 * `rules.ts` records WHAT is unsettled — the value, the article, the source and
 * the `status` that marks it — in one language, for whoever maintains the
 * registry. This file is the other side of the same fact, written for the person
 * whose money it moves, in both languages the site is published in.
 *
 * They are two files on purpose. The registry must stay the kind of document a
 * maintainer can read end to end against the decrees; a page of translated
 * prose inside it would bury the figures. And the split is enforced rather than
 * trusted: `disputedVersions()` drives /reglas-en-disputa/, and the test suite
 * fails when a rule marked DISPUTED or UNSOURCED has no entry here — so a rule
 * cannot be quietly unsettled in the code and settled on screen.
 *
 * TWO SHAPES, BECAUSE THERE ARE TWO PROBLEMS. A `Dispute` is a text and a
 * practice, or two articles, saying different things: two readings, one of them
 * applied. An `Assumption` is a silence: no text, nothing to set against
 * anything, and a figure this project chose. Writing the second in the shape of
 * the first would mean inventing an opposing reading to fill the slot, which is
 * the one thing a page about honesty cannot do.
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

/**
 * A figure no document fixes, and which this project therefore chose.
 *
 * It has no `readings`, and that absence is the point: there is no second
 * position to be fair to. What it has instead is `reach` — how far the choice
 * travels through the site — because that is the thing a reader cannot work out
 * for themselves and the thing that decides how much the silence matters. It is
 * a field and not a sentence buried in `why` so that it cannot be left out.
 */
export type Assumption = {
  rule: RuleId;
  /** The question the law does not answer. */
  question: Bilingual;
  /** What the texts do say, and where they stop. */
  silence: Bilingual;
  /** The value applied, and whatever it is anchored to when it is anchored. */
  choice: Bilingual;
  /** How far the choice travels: which figures move if it moves. */
  reach: Bilingual;
  /** Why this value and not another. */
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
      es: "Los días corridos desde el último aniversario, pagados con el 30% de recargo. En una renuncia de dos meses pasado el aniversario son {vacationDays} de vacación: {atMinimum} sobre el salario mínimo de comercio ({minimumSalary} al mes), {atRound} sobre un salario de {roundSalary}.",
      en: "The days run since the last anniversary, paid with the 30% surcharge. On a resignation two months past the anniversary that is {vacationDays} of vacation: {atMinimum} at the commerce minimum wage ({minimumSalary} a month), {atRound} on a salary of {roundSalary}.",
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
      es: "La escala salta de {lowerStep} a {upperStep} días a los tres años, y de {upperStep} a {topStep} a los diez. Pero el salto nunca vale entero, porque corre solo sobre la fracción del ciclo ya trabajada: en una salida el 5 de octubre con el tercer aniversario diez días después son {gapDays}, o {gapAmount} sobre un salario de {roundSalary}. Solo cambia algo para quien termina el contrato en el tramo del año en que cumpliría uno de esos aniversarios.",
      en: "The scale jumps from {lowerStep} to {upperStep} days at three years, and from {upperStep} to {topStep} at ten. But the step is never worth its whole self, because it only runs over the fraction of the cycle already worked: on a departure on 5 October with the third anniversary ten days later it is {gapDays}, or {gapAmount} on a salary of {roundSalary}. It changes nothing except for someone whose contract ends in the stretch of the year where one of those anniversaries would fall.",
    },
    readings: [
      {
        label: { es: "La antigüedad del último día trabajado", en: "Length of service at the last day worked" },
        text: {
          es: "El escalón que la persona había cumplido de verdad al terminar el contrato. Es lo que hace el servicio de cálculo del MTPS: para una salida el 5 de octubre de 2026 con ingreso el 15 de octubre de 2023 —dos años cumplidos ese día, tres si hubiera llegado al corte— el ministerio imprime $367.40, que son 15 días de escala y no 19. Es además la lectura que nunca paga un escalón que nadie alcanzó.",
          en: "The step the worker had actually completed when the contract ended. It is what the MTPS calculation service does: for a departure on 5 October 2026 with a start date of 15 October 2023 — two completed years that day, three had they reached the qualifying date — the ministry prints $367.40, which is fifteen days of scale and not nineteen. It is also the reading that never pays for a step nobody reached.",
        },
        backing: "practice",
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
      es: "Ningún artículo del capítulo VII dice a qué día se lee la escala para un contrato que terminó antes del corte: el 197 mide la antigüedad en la fecha del corte y el 202 concede al que sale la parte «proporcional al tiempo trabajado» sin decir de qué escala es proporción. Lo que sí hay es lo que hace el ministerio, y se comprobó en su calculadora en agosto de 2026: lee la escala en el último día trabajado. Coincide con la lectura que este sitio ya aplicaba, y ahora la sostiene algo más que la prudencia. La regla sigue publicada aquí porque la práctica no es un texto y el texto sigue sin decirlo; cuando las dos fechas caen en escalones distintos la calculadora muestra las dos cifras, sin afirmar cuál rige. El mismo ministerio lee la escala del ciclo cerrado en el día en que ese ciclo cerró, que es la misma regla dicha de otra forma: se lee el último día del período que se paga.",
      en: "No article of chapter VII says which day the scale is read at for a contract that ended before the qualifying date: article 197 measures service at that date, and article 202 grants the leaver the part \"proporcional al tiempo trabajado\" without saying which scale the proportion is of. What there is, is what the ministry does, checked against its calculator in August 2026: it reads the scale on the last day worked. That matches the reading this site already applied, and now something more than caution supports it. The rule stays published here because a practice is not a text and the text still does not say it; where the two dates fall on different steps the calculator shows both figures, claiming neither. The same ministry reads the closed cycle's scale on the day that cycle closed, which is the same rule said another way: it is read on the last day of the period being paid.",
    },
  },
  {
    rule: "quincena25Window",
    question: {
      es: "¿A quién le toca la Quincena 25 al terminar el contrato?",
      en: "Who is owed the Quincena 25 when their contract ends?",
    },
    stakes: {
      es: "Hasta medio salario mensual. Para quien gana el tope de {ceiling}, la diferencia entre las dos lecturas llega a {maxGap} en una cifra que la gente lleva a una negociación.",
      en: "Up to half a monthly salary. For someone at the {ceiling} ceiling, the gap between the two readings reaches {maxGap} in a figure people take into a negotiation.",
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

export const ASSUMPTIONS: Assumption[] = [
  {
    rule: "aguinaldoCycleStart",
    question: {
      es: "¿Sobre qué período se cuenta la parte proporcional del aguinaldo?",
      en: "What period does the proportional share of the year-end bonus run over?",
    },
    silence: {
      es: "Los artículos 196 a 202 fijan la fecha de corte y la ventana de pago, y mandan pagar «la parte proporcional al tiempo trabajado». Ninguno dice sobre qué período corre esa proporción. El capítulo entero se puede leer sin encontrar la fecha en que empieza a devengarse el aguinaldo.",
      en: "Articles 196 to 202 fix the qualifying date and the payment window, and order the part \"proporcional al tiempo trabajado\" to be paid. None of them says what period that proportion runs over. The whole chapter can be read without finding the day the bonus starts to accrue.",
    },
    choice: {
      es: "Del 12 de diciembre al 11 de diciembre, porque es lo que declara el servicio de cálculo del MTPS: cada renglón que devuelve trae impreso el período que cubre, y dice «12/12/2024 - 11/12/2025» para el ciclo cerrado y «12/12/2025 - 30/06/2026» para el que corre. No es una lectura de este proyecto: es la fecha que el ministerio imprime en el documento.",
      en: "From 12 December to 11 December, because that is what the MTPS calculation service declares: every row it returns prints the period it covers — \"12/12/2024 - 11/12/2025\" for the closed cycle and \"12/12/2025 - 30/06/2026\" for the running one. It is not this project's reading: it is the date the ministry prints on the document.",
    },
    reach: {
      // REWRITTEN BEFORE IT WAS DERIVED. This block used to close by pricing
      // what the calendar-year cycle had cost — "unos $31 sobre un salario de
      // $900" — which was arithmetically right and describing a calculation
      // this site no longer performs. A stale figure is a wrong number; a
      // stale description of the engine's behaviour is a reader building a
      // model of the calculator that does not correspond to the calculator,
      // which is worse and harder to notice. The history belongs in `why`,
      // where it already is; `reach` says where the choice travels TODAY.
      es: "Toda parte proporcional de aguinaldo del sitio, y la forma misma de la respuesta. Un finiquito puede deber dos cosas a la vez —el aguinaldo entero del ciclo que cerró el 11 de diciembre y no se cobró, más la fracción del que abrió al día siguiente— y por eso la calculadora muestra dos renglones donde antes mostraba uno: en una salida el 30 de junio de 2026, con once años de servicio y un salario de {roundSalary}, son {closedCycle} del ciclo cerrado y {runningCycle} del que corre. Mover la fecha de apertura mueve el segundo renglón entero, y con él todo aguinaldo proporcional que este sitio calcula.",
      en: "Every proportional bonus on the site, and the shape of the answer itself. A settlement can owe two things at once — the whole bonus of the cycle that closed on 11 December and was never handed over, plus the fraction of the one that opened the next day — which is why the calculator shows two lines where it once showed one: on a departure on 30 June 2026, with eleven years of service and a salary of {roundSalary}, that is {closedCycle} for the closed cycle and {runningCycle} for the running one. Moving the opening date moves the second line entire, and with it every proportional bonus this site calculates.",
    },
    why: {
      es: "Porque hay un documento oficial que lo fija y es mejor seguirlo que elegir la fecha que parezca más razonable. Es la misma decisión del artículo 187 y la del divisor: donde el texto calla y el ministerio actúa, se sigue al ministerio y se dice que es lo que se está haciendo. Hasta agosto de 2026 este sitio aplicaba el año calendario y decía que lo respaldaba el MTPS; eso era una inferencia sobre una publicación que habla del monto del pago anticipado, no de su período, y el respaldo estaba sobrestimado. Se corrigió al correr cinco casos en la calculadora del ministerio y ver el ciclo impreso. Si un decreto o un criterio publicado fijara el período, mandaría el documento y esta ficha desaparecería.",
      en: "Because an official document fixes it, and following that beats picking the date that looks most reasonable. It is the same decision as article 187's and the divisor's: where the text is silent and the ministry acts, the ministry is followed and the page says so. Until August 2026 this site applied the calendar year and claimed MTPS support for it; that was an inference from a publication about the amount of an anticipated payment, not its period, and the backing was overstated. It was corrected by running five cases through the ministry's calculator and reading the cycle off the output. If a decree or a published criterion fixed the period, the document would govern and this entry would disappear.",
    },
  },
  {
    rule: "dailySalaryDivisor",
    question: {
      es: "¿Entre cuántos días se divide el salario mensual para obtener el diario?",
      en: "How many days is a monthly salary divided by to get a daily one?",
    },
    silence: {
      es: "El artículo 183 fija la base —«el salario básico que devengue», para el salario estipulado por unidad de tiempo— y no nombra divisor. El artículo 142 define el salario diario en la dirección contraria: la hora pactada por las horas de la jornada ordinaria. Ninguno de los dos dice entre cuánto se divide un salario mensual, y el decreto de salarios mínimos usa 30.42 para su propio equivalente mensual sin ordenar que ese número se use aquí.",
      en: "Article 183 fixes the base — \"el salario básico que devengue\", for pay stipulated by unit of time — and names no divisor. Article 142 defines the daily wage in the other direction: the agreed hourly rate times the hours of the ordinary shift. Neither says what a monthly salary is divided by, and the minimum-wage decree uses 30.42 for its own monthly equivalent without ordering that number to be used here.",
    },
    choice: {
      es: "Treinta. No sale de un texto: sale de la constancia del MTPS que este proyecto reproduce al centavo. Con 937.54/30, la vacación proporcional de 54 días da los $90.16 que imprime el documento oficial; con 30.42 daría $88.92 y el sitio dejaría de coincidir con el ministerio.",
      en: "Thirty. It does not come from a text: it comes from the MTPS statement this project reproduces to the cent. At 937.54/30, the proportional vacation of 54 days gives the $90.16 the official document prints; at 30.42 it would give $88.92 and the site would stop agreeing with the ministry.",
    },
    reach: {
      // The counterfactual divisor is named as 365/12 rather than as 30.42,
      // because that is what it is: the wage decree's own monthly equivalent,
      // derived in `statutory.ts` from the same `accrualYearDays` the engine
      // prorates with. Writing the decimal here would be a third copy of a
      // number the registry already holds.
      es: "Es el supuesto de mayor alcance del sitio. Toda cifra diaria pasa por él: la indemnización, la prestación por renuncia, la vacación, el aguinaldo y cada hora extra, porque la hora sale del día. Cambiarlo a los 365/12 que usa el decreto de salarios mínimos baja un {drop} cada una de esas líneas —sobre un salario de {roundSalary}, el día pasa de {dayApplied} a {dayAlternative}— y ese {drop} corre por todas a la vez, no por una.",
      en: "It is the widest-reaching assumption on the site. Every daily figure passes through it: severance, the resignation benefit, vacation, the year-end bonus and every overtime hour, because the hour is derived from the day. Moving it to the 365/12 the minimum-wage decree uses lowers each of those lines by {drop} — on a salary of {roundSalary} the day goes from {dayApplied} to {dayAlternative} — and that {drop} runs through all of them at once, not through one.",
    },
    why: {
      es: "Porque hay una cifra oficial contra la cual anclarlo, y anclarla a algo comprobable es mejor que elegir el número que parece más razonable. La decisión es la misma del artículo 187: donde el texto calla y el ministerio actúa, se sigue al ministerio y se dice que es lo que se está haciendo. La diferencia es que allá hay dos lecturas y aquí no hay ninguna: nadie sostiene que la ley diga 30, y este proyecto tampoco. Si un decreto o un criterio publicado fijara el divisor, mandaría el documento y esta ficha desaparecería.",
      en: "Because there is an official figure to anchor it to, and anchoring to something checkable beats picking the number that looks most reasonable. It is the same decision as article 187's: where the text is silent and the ministry acts, the ministry is followed and the page says that is what is happening. The difference is that there two readings exist and here there are none — nobody claims the law says 30, and this project does not claim it either. If a decree or a published criterion fixed the divisor, the document would govern and this entry would disappear.",
    },
  },
];

const BY_RULE = new Map(DISPUTES.map((dispute) => [dispute.rule, dispute]));
const ASSUMED_BY_RULE = new Map(ASSUMPTIONS.map((item) => [item.rule, item]));

export function disputeFor(rule: RuleId) {
  return BY_RULE.get(rule);
}

export function assumptionFor(rule: RuleId) {
  return ASSUMED_BY_RULE.get(rule);
}

/** The reader-facing question of an unsettled rule, whichever kind it is. */
export function questionFor(rule: RuleId): Bilingual | undefined {
  return BY_RULE.get(rule)?.question ?? ASSUMED_BY_RULE.get(rule)?.question;
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

/** One line of the panel a calculator carries: which section, and the question. */
export type Unsettled = { rule: RuleId; question: Bilingual; section: ContestedSection };

/**
 * The unsettled rules a calculator applies, for the panel it carries at the
 * foot of its results.
 *
 * The deep-linked callouts only appear for the cases they touch — a dismissal
 * never meets the article 187 divergence — so on their own they leave the
 * existence of these gaps dependent on the reader having typed the right dates.
 * This is the unconditional half: the page states which of its figures rest on
 * an unsettled reading, or on a figure nothing fixes, before anybody asks.
 *
 * Both kinds are listed. The divisor is not a disagreement, but it moves every
 * daily figure on the page it appears on, and a panel that named the arguable
 * readings while staying quiet about the invented ones would be the more
 * flattering half of the truth.
 */
export function unsettledForPage(page: Page): Unsettled[] {
  const applied = RULE_USAGE[page];
  return [
    ...DISPUTES.filter((item) => applied.includes(item.rule))
      .map((item) => ({ rule: item.rule, question: item.question, section: "disputed" as const })),
    ...ASSUMPTIONS.filter((item) => applied.includes(item.rule))
      .map((item) => ({ rule: item.rule, question: item.question, section: "unsourced" as const })),
  ];
}
