export type Lang = "es" | "en";
export type Page =
  | "home" | "loans" | "creditCard" | "settlement" | "aguinaldo" | "overtime" | "withholding"
  | "annualTax" | "disputed";

export const LANGS = ["es", "en"] as const;
export const PAGES = [
  "home", "loans", "creditCard", "settlement", "aguinaldo", "overtime", "withholding",
  "annualTax", "disputed",
] as const;

/**
 * The calculators, in the order they appear everywhere: the header, the footer,
 * the home directory and the error page each used to carry their own copy of
 * this list, which is four places to forget when a tool is added.
 *
 * `disputed` is a page and not a tool. It computes nothing, it belongs in a
 * different part of the footer, and putting it in the calculator nav would
 * promise a reader a sixth calculator.
 */
export type ToolPage = Exclude<Page, "home" | "disputed">;
export const TOOL_PAGES = PAGES.filter(
  (page): page is ToolPage => page !== "home" && page !== "disputed");

// The URL is the only source of truth for language. The toggle used to flip
// client state and remember it in localStorage, which left an English reader on
// a Spanish URL whose canonical tag, metadata and prerendered body all still
// said Spanish: unshareable, and invisible to search engines. Switching
// language now navigates, so every translation is a page a crawler can reach.
export const ROUTES: Record<Lang, Record<Page, string>> = {
  es: { home: "/", loans: "/prestamos/", creditCard: "/tarjeta-credito/", settlement: "/finiquito/", aguinaldo: "/aguinaldo/", overtime: "/horas-extras/", withholding: "/retenciones/", annualTax: "/renta-anual/", disputed: "/reglas-en-disputa/" },
  en: { home: "/en/", loans: "/en/loans/", creditCard: "/en/credit-card/", settlement: "/en/settlement/", aguinaldo: "/en/year-end-bonus/", overtime: "/en/overtime/", withholding: "/en/withholding/", annualTax: "/en/annual-tax-return/", disputed: "/en/disputed-rules/" },
};

export const SITE_ORIGIN = "https://loanpilot.marloncoreas.com";

// Open Graph wants a territory-qualified locale, hreflang wants the bare code.
export const OG_LOCALE: Record<Lang, string> = { es: "es_SV", en: "en_US" };

// These names appeared verbatim in the header, the footer and the home
// directory — three files, two languages, six chances to drift apart.
export const PAGE_LABELS: Record<Lang, Record<Page, string>> = {
  es: { home: "Inicio", loans: "Préstamos", creditCard: "Tarjeta de crédito", settlement: "Finiquito", aguinaldo: "Aguinaldo", overtime: "Horas extras", withholding: "Retenciones", annualTax: "Renta anual", disputed: "Reglas en disputa" },
  en: { home: "Home", loans: "Loans", creditCard: "Credit card", settlement: "Settlement", aguinaldo: "Year-end bonus", overtime: "Overtime", withholding: "Withholding", annualTax: "Annual return", disputed: "Disputed rules" },
};

export const PAGE_META: Record<Lang, Record<Page, { title: string; description: string; ogTitle: string }>> = {
  es: {
    home: {
      title: "Herramientas financieras para El Salvador | LoanPilot",
      description: "Calculadoras gratuitas para El Salvador: préstamos, tarjeta de crédito, finiquito, aguinaldo, horas extras, retenciones salariales y renta anual.",
      ogTitle: "LoanPilot | Herramientas financieras para El Salvador",
    },
    loans: {
      title: "Calculadora de préstamos en El Salvador | LoanPilot",
      description: "Calcula cuotas, seguros, costo efectivo y el ahorro de hacer abonos a capital en tu préstamo.",
      ogTitle: "LoanPilot | Calculadora de préstamos",
    },
    creditCard: {
      title: "Calculadora de tarjeta de crédito | LoanPilot",
      description: "Calcula en cuánto tiempo pagás tu tarjeta con el pago mínimo, cuánto interés cuesta y cuánto cambia si abonás un poco más cada mes.",
      ogTitle: "LoanPilot | Tarjeta de crédito",
    },
    settlement: {
      title: "Calculadora de finiquito e indemnización | LoanPilot",
      description: "Estima indemnización, vacaciones, aguinaldo y salarios pendientes conforme a las reglas laborales de El Salvador.",
      ogTitle: "LoanPilot | Finiquito e indemnización",
    },
    aguinaldo: {
      title: "Calculadora de aguinaldo en El Salvador | LoanPilot",
      description: "Calcula los días de aguinaldo que te tocan según tu antigüedad al cierre del ciclo, y hasta cuándo tiene el patrono para pagarlo.",
      ogTitle: "LoanPilot | Aguinaldo",
    },
    overtime: {
      title: "Calculadora de horas extras en El Salvador | LoanPilot",
      description: "Calcula la hora extra diurna y nocturna, el recargo nocturno y el pago por trabajar en día de descanso o asueto.",
      ogTitle: "LoanPilot | Horas extras",
    },
    withholding: {
      title: "Calculadora de retenciones salariales | LoanPilot",
      description: "Estima AFP, ISSS e ISR con las tablas oficiales de El Salvador, o revisá tu boleta de pago renglón por renglón.",
      ogTitle: "LoanPilot | Retenciones salariales",
    },
    annualTax: {
      title: "Calculadora de renta anual para asalariados | LoanPilot",
      description: "Estima el impuesto del año contra lo que te retuvieron, y si el saldo te queda a favor o en contra al declarar.",
      ogTitle: "LoanPilot | Renta anual",
    },
    disputed: {
      title: "Reglas laborales en disputa en El Salvador | LoanPilot",
      description: "Las reglas donde la ley, la práctica oficial o el silencio del texto admiten más de una lectura, con la que aplica LoanPilot y por qué.",
      ogTitle: "LoanPilot | Reglas en disputa",
    },
  },
  en: {
    home: {
      title: "Financial tools for El Salvador | LoanPilot",
      description: "Free calculators for El Salvador: loans, credit cards, employment settlements, the year-end bonus, overtime, payroll withholding and the annual return.",
      ogTitle: "LoanPilot | Financial tools for El Salvador",
    },
    loans: {
      title: "Loan calculator for El Salvador | LoanPilot",
      description: "Work out payments, insurance, effective cost and how much extra principal payments save on your loan.",
      ogTitle: "LoanPilot | Loan calculator",
    },
    creditCard: {
      title: "Credit card payoff calculator | LoanPilot",
      description: "Work out how long your card takes to clear on the minimum payment, what the interest costs, and how much a fixed extra each month changes both.",
      ogTitle: "LoanPilot | Credit card",
    },
    settlement: {
      title: "Employment settlement and severance calculator | LoanPilot",
      description: "Estimate severance, vacation, year-end bonus and unpaid salary under the employment rules of El Salvador.",
      ogTitle: "LoanPilot | Settlement and severance",
    },
    aguinaldo: {
      title: "Year-end bonus calculator for El Salvador | LoanPilot",
      description: "Work out the days of year-end bonus your length of service earns at the cycle's close, and the deadline your employer has to pay it.",
      ogTitle: "LoanPilot | Year-end bonus",
    },
    overtime: {
      title: "Overtime pay calculator for El Salvador | LoanPilot",
      description: "Work out daytime and night overtime, the night surcharge and pay for working a weekly rest day or public holiday.",
      ogTitle: "LoanPilot | Overtime pay",
    },
    withholding: {
      title: "Payroll withholding calculator | LoanPilot",
      description: "Estimate pension, ISSS and income tax with El Salvador's official withholding tables, or check your payslip line by line.",
      ogTitle: "LoanPilot | Payroll withholding",
    },
    annualTax: {
      title: "Annual income tax calculator for employees | LoanPilot",
      description: "Estimate the year's tax against what was withheld from your pay, and whether the balance lands in your favour or against you.",
      ogTitle: "LoanPilot | Annual return",
    },
    disputed: {
      title: "Contested employment rules in El Salvador | LoanPilot",
      description: "The rules where the law, official practice or the silence of the text allow more than one reading, with the one LoanPilot applies and why.",
      ogTitle: "LoanPilot | Disputed rules",
    },
  },
};

/**
 * Copy for the social card of each page, and the alt text that travels with it.
 *
 * Every page used to share one image — the loan card — so a link to the
 * settlement calculator previewed in WhatsApp with "Entiende tu préstamo"
 * above a description about severance. The card is part of a page's identity,
 * like its title, so it belongs in this table beside PAGE_META.
 *
 * `accent` is the colour of the second headline line, and echoes the icon of
 * the matching card on the home page: gold for the employment tool, mint for
 * the rest.
 */
export const OG_CARD: Record<Lang, Record<Page, {
  eyebrow: string; line1: string; line2: string; sub: string; alt: string; accent: string;
}>> = {
  es: {
    home: {
      eyebrow: "HERRAMIENTAS FINANCIERAS",
      line1: "Números importantes,", line2: "explicados con claridad.",
      sub: "Préstamos, finiquito, horas extras y retenciones salariales de El Salvador, calculados en tu navegador.",
      alt: "LoanPilot: números importantes, explicados con claridad.",
      accent: "#a9f4cf",
    },
    loans: {
      eyebrow: "CALCULADORA DE PRÉSTAMOS",
      line1: "Entiende tu préstamo.", line2: "Decide con claridad.",
      sub: "Calcula la cuota, el costo efectivo real y cuánto ahorras haciendo abonos a capital.",
      alt: "LoanPilot: calculadora de préstamos con cuota, costo efectivo y abonos a capital.",
      accent: "#a9f4cf",
    },
    creditCard: {
      eyebrow: "TARJETA DE CRÉDITO",
      line1: "Lo que cuesta", line2: "quedarse en el mínimo.",
      sub: "Cuántos meses y cuánto interés con el mínimo, y cuánto cambian los dos si abonás un poco más cada mes.",
      alt: "LoanPilot: calculadora de pago mínimo y abonos de tarjeta de crédito.",
      accent: "#a9f4cf",
    },
    settlement: {
      eyebrow: "FINIQUITO E INDEMNIZACIÓN",
      line1: "Lo que te toca", line2: "al terminar tu empleo.",
      sub: "Indemnización, vacaciones, aguinaldo y salario pendiente con las reglas del Código de Trabajo.",
      alt: "LoanPilot: calculadora de finiquito e indemnización de El Salvador.",
      accent: "#ffd88a",
    },
    aguinaldo: {
      eyebrow: "AGUINALDO",
      line1: "Los días que te tocan,", line2: "y hasta cuándo tienen para pagarlos.",
      sub: "Escala del artículo 198, el ciclo que corre del {cycleOpens} y la ventana legal de pago del Código de Trabajo.",
      alt: "LoanPilot: calculadora de aguinaldo de El Salvador.",
      accent: "#ffd88a",
    },
    overtime: {
      eyebrow: "HORAS EXTRAS",
      line1: "Cada hora extra,", line2: "pagada como manda la ley.",
      sub: "Hora extra diurna y nocturna, recargo nocturno, día de descanso y asueto con los recargos del Código de Trabajo.",
      alt: "LoanPilot: calculadora de horas extras y recargos de El Salvador.",
      accent: "#a9d9e8",
    },
    withholding: {
      eyebrow: "RETENCIONES SALARIALES",
      line1: "Cada descuento", line2: "de tu salario, claro.",
      sub: "AFP, ISSS y renta con las tablas oficiales de retención vigentes en El Salvador.",
      alt: "LoanPilot: calculadora de retenciones de AFP, ISSS e ISR de El Salvador.",
      accent: "#a9f4cf",
    },
    annualTax: {
      eyebrow: "RENTA ANUAL",
      line1: "El impuesto del año", line2: "contra lo que ya te retuvieron.",
      sub: "El saldo puede salir a favor o en contra. Las dos cosas son normales, y aquí está el desglose de por qué.",
      alt: "LoanPilot: calculadora de renta anual del asalariado en El Salvador.",
      accent: "#a9f4cf",
    },
    disputed: {
      eyebrow: "REGLAS EN DISPUTA",
      line1: "Donde la ley", line2: "admite dos lecturas.",
      sub: "Las reglas que no están resueltas, la que aplica cada cálculo del sitio y la que no. Escritas, no escondidas.",
      alt: "LoanPilot: reglas laborales y fiscales de El Salvador que admiten más de una lectura.",
      accent: "#ffb4a2",
    },
  },
  en: {
    home: {
      eyebrow: "FINANCIAL TOOLS",
      line1: "Important numbers,", line2: "explained clearly.",
      sub: "Loans, settlements, overtime pay and payroll withholding for El Salvador, worked out in your browser.",
      alt: "LoanPilot: important numbers, explained clearly.",
      accent: "#a9f4cf",
    },
    loans: {
      eyebrow: "LOAN CALCULATOR",
      line1: "Understand your loan.", line2: "Decide with clarity.",
      sub: "Work out the payment, the real effective cost and how much extra principal payments save.",
      alt: "LoanPilot: loan calculator with payments, effective cost and extra principal payments.",
      accent: "#a9f4cf",
    },
    creditCard: {
      eyebrow: "CREDIT CARD",
      line1: "What staying on", line2: "the minimum costs.",
      sub: "How many months and how much interest on the minimum, and how far a fixed extra each month moves both.",
      alt: "LoanPilot: credit card minimum payment and extra payment calculator.",
      accent: "#a9f4cf",
    },
    settlement: {
      eyebrow: "SETTLEMENT AND SEVERANCE",
      line1: "What you are owed", line2: "when a job ends.",
      sub: "Severance, vacation, year-end bonus and unpaid salary under the Labour Code of El Salvador.",
      alt: "LoanPilot: employment settlement and severance calculator for El Salvador.",
      accent: "#ffd88a",
    },
    aguinaldo: {
      eyebrow: "YEAR-END BONUS",
      line1: "The days you have earned,", line2: "and the deadline to pay them.",
      sub: "The article 198 scale, the cycle running from {cycleOpens} and the statutory payment window of the Labour Code.",
      alt: "LoanPilot: year-end bonus calculator for El Salvador.",
      accent: "#ffd88a",
    },
    overtime: {
      eyebrow: "OVERTIME PAY",
      line1: "Every extra hour,", line2: "paid the way the law says.",
      sub: "Daytime and night overtime, the night surcharge, rest days and public holidays under the Labour Code.",
      alt: "LoanPilot: overtime and surcharge calculator for El Salvador.",
      accent: "#a9d9e8",
    },
    withholding: {
      eyebrow: "PAYROLL WITHHOLDING",
      line1: "Every deduction", line2: "from your pay, clear.",
      sub: "Pension, ISSS and income tax using the official withholding tables in force in El Salvador.",
      alt: "LoanPilot: pension, ISSS and income tax withholding calculator for El Salvador.",
      accent: "#a9f4cf",
    },
    annualTax: {
      eyebrow: "ANNUAL RETURN",
      line1: "The year's tax", line2: "against what was withheld.",
      sub: "The balance can land in your favour or against you. Both are normal, and the breakdown says why.",
      alt: "LoanPilot: annual income tax calculator for employees in El Salvador.",
      accent: "#a9f4cf",
    },
    disputed: {
      eyebrow: "DISPUTED RULES",
      line1: "Where the law", line2: "allows two readings.",
      sub: "The rules that are not settled, the one every calculation here applies and the one it does not. Written down, not hidden.",
      alt: "LoanPilot: employment and tax rules of El Salvador that allow more than one reading.",
      accent: "#ffb4a2",
    },
  },
};

/** Path of the social card for a page, relative to the site root. */
export function ogImagePath(lang: Lang, page: Page) {
  return `/og/${lang}-${page}.png`;
}

const BY_PATH = new Map<string, { lang: Lang; page: Page }>();
for (const lang of LANGS) {
  for (const page of PAGES) BY_PATH.set(ROUTES[lang][page], { lang, page });
}

/**
 * Maps a pathname, with or without its trailing slash, onto a known route.
 *
 * An unknown path used to resolve to the Spanish home page, so a mistyped or
 * retired URL rendered the home under the wrong address — a soft 404, which
 * search engines index as a duplicate of the real home. It now reports the
 * miss, and the caller renders the not-found page.
 */
export function resolveRoute(pathname: string): { lang: Lang; page: Page | "notFound" } {
  const trimmed = pathname.replace(/\/+$/, "");
  const normalized = trimmed === "" ? "/" : `${trimmed}/`;
  const match = BY_PATH.get(normalized);
  if (match) return match;
  // Keep the reader in the language the URL asked for: /en/typo/ is a miss in
  // English, not an invitation to switch them to Spanish.
  return { lang: normalized.startsWith("/en/") ? "en" : "es", page: "notFound" };
}

export function absoluteUrl(lang: Lang, page: Page) {
  return `${SITE_ORIGIN}${ROUTES[lang][page]}`;
}

/**
 * hreflang set for a page: both translations plus x-default. Every alternate
 * list has to include the page itself, or search engines treat the cluster as
 * one-directional and drop it.
 */
export function alternates(page: Page) {
  return [
    ...LANGS.map((lang) => ({ hreflang: lang, href: absoluteUrl(lang, page) })),
    { hreflang: "x-default", href: absoluteUrl("es", page) },
  ];
}
