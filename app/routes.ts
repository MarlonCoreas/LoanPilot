export type Lang = "es" | "en";
export type Page = "home" | "loans" | "settlement" | "withholding";

export const LANGS = ["es", "en"] as const;
export const PAGES = ["home", "loans", "settlement", "withholding"] as const;

// The URL is the only source of truth for language. The toggle used to flip
// client state and remember it in localStorage, which left an English reader on
// a Spanish URL whose canonical tag, metadata and prerendered body all still
// said Spanish: unshareable, and invisible to search engines. Switching
// language now navigates, so every translation is a page a crawler can reach.
export const ROUTES: Record<Lang, Record<Page, string>> = {
  es: { home: "/", loans: "/prestamos/", settlement: "/finiquito/", withholding: "/retenciones/" },
  en: { home: "/en/", loans: "/en/loans/", settlement: "/en/settlement/", withholding: "/en/withholding/" },
};

export const SITE_ORIGIN = "https://loanpilot.marloncoreas.com";

// Open Graph wants a territory-qualified locale, hreflang wants the bare code.
export const OG_LOCALE: Record<Lang, string> = { es: "es_SV", en: "en_US" };

// These names appeared verbatim in the header, the footer and the home
// directory — three files, two languages, six chances to drift apart.
export const PAGE_LABELS: Record<Lang, Record<Page, string>> = {
  es: { home: "Inicio", loans: "Préstamos", settlement: "Finiquito", withholding: "Retenciones" },
  en: { home: "Home", loans: "Loans", settlement: "Settlement", withholding: "Withholding" },
};

export const PAGE_META: Record<Lang, Record<Page, { title: string; description: string; ogTitle: string }>> = {
  es: {
    home: {
      title: "Herramientas financieras para El Salvador | LoanPilot",
      description: "Calculadoras gratuitas de préstamos, finiquito, indemnización y retenciones salariales para El Salvador.",
      ogTitle: "LoanPilot | Herramientas financieras para El Salvador",
    },
    loans: {
      title: "Calculadora de préstamos en El Salvador | LoanPilot",
      description: "Calcula cuotas, seguros, costo efectivo y el ahorro de hacer abonos a capital en tu préstamo.",
      ogTitle: "LoanPilot | Calculadora de préstamos",
    },
    settlement: {
      title: "Calculadora de finiquito e indemnización | LoanPilot",
      description: "Estima indemnización, vacaciones, aguinaldo y salarios pendientes conforme a las reglas laborales de El Salvador.",
      ogTitle: "LoanPilot | Finiquito e indemnización",
    },
    withholding: {
      title: "Calculadora de retenciones salariales | LoanPilot",
      description: "Estima AFP, ISSS e ISR con las tablas oficiales de retención vigentes en El Salvador.",
      ogTitle: "LoanPilot | Retenciones salariales",
    },
  },
  en: {
    home: {
      title: "Financial tools for El Salvador | LoanPilot",
      description: "Free calculators for loans, employment settlements, severance and payroll withholding in El Salvador.",
      ogTitle: "LoanPilot | Financial tools for El Salvador",
    },
    loans: {
      title: "Loan calculator for El Salvador | LoanPilot",
      description: "Work out payments, insurance, effective cost and how much extra principal payments save on your loan.",
      ogTitle: "LoanPilot | Loan calculator",
    },
    settlement: {
      title: "Employment settlement and severance calculator | LoanPilot",
      description: "Estimate severance, vacation, year-end bonus and unpaid salary under the employment rules of El Salvador.",
      ogTitle: "LoanPilot | Settlement and severance",
    },
    withholding: {
      title: "Payroll withholding calculator | LoanPilot",
      description: "Estimate pension, ISSS and income tax using the official withholding tables in force in El Salvador.",
      ogTitle: "LoanPilot | Payroll withholding",
    },
  },
};

const BY_PATH = new Map<string, { lang: Lang; page: Page }>();
for (const lang of LANGS) {
  for (const page of PAGES) BY_PATH.set(ROUTES[lang][page], { lang, page });
}

/** Maps a pathname, with or without its trailing slash, onto a known route. */
export function resolveRoute(pathname: string): { lang: Lang; page: Page } {
  const trimmed = pathname.replace(/\/+$/, "");
  const normalized = trimmed === "" ? "/" : `${trimmed}/`;
  return BY_PATH.get(normalized) ?? { lang: "es", page: "home" };
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
