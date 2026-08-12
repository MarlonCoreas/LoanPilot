import { FAQ } from "./faq";
import {
  absoluteUrl, ogImagePath, PAGE_LABELS, PAGE_META, SITE_ORIGIN, type Lang, type Page,
} from "./routes";
import { RULES_REVIEWED } from "./statutory";

/**
 * Structured data (JSON-LD) for a page, injected at build time by the
 * prerender script.
 *
 * Search engines have no other way to learn that these pages are free
 * calculators rather than articles, that the two language versions are one
 * work, or that the home page answers the questions people actually type. The
 * facts asserted here are generated from the same tables the pages render, so
 * the markup cannot claim something the page does not show.
 */

const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
const REPOSITORY = "https://github.com/MarlonCoreas/LoanPilot";

type Json = Record<string, unknown>;

/** "Calculadora de finiquito | LoanPilot" -> "Calculadora de finiquito". */
function appName(title: string) {
  const [name] = title.split(" | ");
  return name;
}

function organization(): Json {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "LoanPilot",
    url: `${SITE_ORIGIN}/`,
    logo: `${SITE_ORIGIN}/favicon.svg`,
    sameAs: [REPOSITORY],
  };
}

function website(lang: Lang): Json {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_ORIGIN}/`,
    name: "LoanPilot",
    inLanguage: lang,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

function breadcrumbs(lang: Lang, page: Page): Json {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: PAGE_LABELS[lang].home, item: absoluteUrl(lang, "home") },
      { "@type": "ListItem", position: 2, name: PAGE_LABELS[lang][page], item: absoluteUrl(lang, page) },
    ],
  };
}

function calculator(lang: Lang, page: Exclude<Page, "home">): Json {
  const meta = PAGE_META[lang][page];
  const url = absoluteUrl(lang, page);
  return {
    "@type": "WebApplication",
    "@id": `${url}#calculator`,
    name: appName(meta.title),
    description: meta.description,
    url,
    inLanguage: lang,
    // Free, offline-capable and account-less: the three claims the interface
    // makes to the reader, stated here in the vocabulary a crawler reads.
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    image: `${SITE_ORIGIN}${ogImagePath(lang, page)}`,
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORGANIZATION_ID },
    // The employment and tax figures carry a review date; loan arithmetic does
    // not depend on rules that change, so it does not claim one.
    ...(page === "loans" ? {} : { dateModified: RULES_REVIEWED }),
    countriesSupported: "SV",
  };
}

function faqPage(lang: Lang): Json {
  return {
    "@type": "FAQPage",
    "@id": `${absoluteUrl(lang, "home")}#faq`,
    mainEntity: FAQ[lang].map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

export function structuredData(lang: Lang, page: Page) {
  const graph = page === "home"
    ? [organization(), website(lang), faqPage(lang)]
    : [organization(), website(lang), calculator(lang, page), breadcrumbs(lang, page)];
  return { "@context": "https://schema.org", "@graph": graph };
}

/**
 * The `<script type="application/ld+json">` body for a page. A literal `<` in
 * the data would close the script element early, so it is escaped: JSON parsers
 * read `<` as the same character, and the HTML parser never sees a tag.
 */
export function structuredDataScript(lang: Lang, page: Page) {
  const json = JSON.stringify(structuredData(lang, page)).replaceAll("<", "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}
