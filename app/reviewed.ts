import { RULES_REVIEWED, reviewedFor } from "./rules";
import type { Lang, Page } from "./routes";

/**
 * The freshness claim the site makes, written out in the reader's language.
 *
 * The badge on the calculators used to read "Actualizada a 2026" as a
 * hardcoded string, so it kept making the claim no matter how old the figures
 * were. Then it read one date per module, which was closer but still a promise
 * two files had to keep in step by hand.
 *
 * It is now computed from the rules a page actually applies: `reviewedFor`
 * takes the OLDEST review date among them, because a page quoting ten rules is
 * only as fresh as its stalest one. A page that cites no Salvadoran rule at all
 * — the loan calculator — gets `undefined` and makes no claim, which is the
 * right answer rather than a missing one.
 */
export function reviewedDate(lang: Lang, isoDate: string = RULES_REVIEWED) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "es" ? "es-SV" : "en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function reviewedLine(lang: Lang, isoDate: string = RULES_REVIEWED) {
  return lang === "es"
    ? `Normativa de El Salvador · Fuentes verificadas el ${reviewedDate(lang, isoDate)}`
    : `El Salvador rules · Sources verified on ${reviewedDate(lang, isoDate)}`;
}

/**
 * The trust line for a page, or nothing when the page applies no statutory
 * rule. Callers render it only when it is defined: a badge that says sources
 * were verified, on a page with no sources, is worse than no badge.
 */
export function reviewedLineFor(lang: Lang, page: Page) {
  const reviewed = reviewedFor(page);
  return reviewed === undefined ? undefined : reviewedLine(lang, reviewed);
}
